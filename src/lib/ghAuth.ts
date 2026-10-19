import { execFile, spawn, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { API_URL, clearTokenCache } from "./github";

const exec = promisify(execFile);

export const GH_HOST = API_URL === "https://api.github.com" ? "github.com" : new URL(API_URL).host;

const LOGIN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

export interface GhAccount {
  login: string;
  active: boolean;
  /** False if gh could not use the stored token (expired or revoked). */
  valid: boolean;
}

export type LoginState =
  | { state: "idle" }
  | { state: "starting" }
  | { state: "waiting"; code: string; url: string }
  | { state: "done"; login?: string }
  | { state: "error"; message: string };

type Session = { child: ChildProcess; state: LoginState; output: string };

// Kept on globalThis so all server bundles (and dev hot reloads) see the same running login.
const store = globalThis as typeof globalThis & { __ghLoginSession?: Session };

function ghEnv() {
  const env: NodeJS.ProcessEnv = { ...process.env, GH_NO_UPDATE_NOTIFIER: "1", GH_PROMPT_DISABLED: "1", NO_COLOR: "1" };
  delete env.GH_TOKEN;
  delete env.GITHUB_TOKEN;
  return env;
}

function ghError(e: unknown): Error {
  if ((e as NodeJS.ErrnoException).code === "ENOENT") return new Error("The GitHub CLI (gh) is not installed.");
  const stderr = (e as { stderr?: string }).stderr?.trim();
  return new Error(stderr || (e instanceof Error ? e.message : String(e)));
}

export async function listGhAccounts(): Promise<GhAccount[]> {
  let stdout: string;
  try {
    ({ stdout } = await exec("gh", ["auth", "status", "--json", "hosts", "--hostname", GH_HOST], { env: ghEnv() }));
  } catch (e) {
    throw ghError(e);
  }
  const data = JSON.parse(stdout) as { hosts?: Record<string, { login: string; active: boolean; state: string }[]> };
  return (data.hosts?.[GH_HOST] ?? []).map((a) => ({ login: a.login, active: a.active, valid: a.state === "success" }));
}

export async function switchGhAccount(login: string): Promise<void> {
  if (!LOGIN.test(login)) throw new Error("Invalid account name.");
  try {
    await exec("gh", ["auth", "switch", "--hostname", GH_HOST, "--user", login], { env: ghEnv() });
  } catch (e) {
    throw ghError(e);
  }
  clearTokenCache();
}

export function getGhLoginState(): LoginState {
  return store.__ghLoginSession?.state ?? { state: "idle" };
}

/** Starts `gh auth login --web` (OAuth device flow) and exposes the one-time code to the UI. */
export function startGhLogin(): LoginState {
  const running = store.__ghLoginSession;
  if (running && (running.state.state === "starting" || running.state.state === "waiting")) return running.state;

  const child = spawn(
    "gh",
    ["auth", "login", "--web", "--hostname", GH_HOST, "--git-protocol", "https", "--skip-ssh-key"],
    { stdio: ["ignore", "pipe", "pipe"], env: ghEnv() },
  );
  const session: Session = { child, state: { state: "starting" }, output: "" };
  store.__ghLoginSession = session;
  const inProgress = () => session.state.state === "starting" || session.state.state === "waiting";

  const onData = (chunk: Buffer) => {
    session.output += chunk.toString();
    if (session.state.state !== "starting") return;
    const code = session.output.match(/one-time code: ([A-Z0-9]{4}-[A-Z0-9]{4})/)?.[1];
    const url = session.output.match(/https:\/\/[^\s/]+\/login\/device/)?.[0];
    if (code && url) session.state = { state: "waiting", code, url };
  };
  child.stdout?.on("data", onData);
  child.stderr?.on("data", onData);

  child.on("error", (e) => {
    if (inProgress()) session.state = { state: "error", message: ghError(e).message };
  });
  child.on("close", (exitCode) => {
    if (!inProgress()) return;
    if (exitCode === 0) {
      clearTokenCache();
      session.state = { state: "done", login: session.output.match(/Logged in as (\S+)/)?.[1] };
    } else {
      const lastLine = session.output.trim().split("\n").pop()?.trim();
      session.state = { state: "error", message: lastLine || `gh exited with code ${exitCode}.` };
    }
  });

  return session.state;
}

export function cancelGhLogin(): void {
  const session = store.__ghLoginSession;
  if (!session) return;
  session.state = { state: "idle" };
  session.child.kill();
}
