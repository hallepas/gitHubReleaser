import { execFileSync } from "node:child_process";

export const API_URL = (process.env.GITHUB_API_URL ?? "https://api.github.com").replace(/\/$/, "");
const GRAPHQL_URL = process.env.GITHUB_GRAPHQL_URL ?? `${API_URL}/graphql`;

export type AuthProblem = "gh-missing" | "gh-not-logged-in" | "no-token";

export class GitHubError extends Error {
  constructor(
    message: string,
    public status?: number,
    public problem?: AuthProblem,
  ) {
    super(message);
  }
}

export type TokenSource = "env" | "gh";

// The CLI token is re-read periodically so a later `gh auth login` is picked up without a restart.
const GH_TOKEN_TTL_MS = 60_000;
let cachedToken: { value: string; at: number } | undefined;

export function clearTokenCache() {
  cachedToken = undefined;
}

export function resolveToken(): { token: string; source: TokenSource } {
  if (process.env.GITHUB_TOKEN) return { token: process.env.GITHUB_TOKEN, source: "env" };
  if (cachedToken && Date.now() - cachedToken.at < GH_TOKEN_TTL_MS) {
    return { token: cachedToken.value, source: "gh" };
  }
  let value: string;
  try {
    value = execFileSync("gh", ["auth", "token"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (e) {
    const missing = (e as NodeJS.ErrnoException).code === "ENOENT";
    throw new GitHubError(
      missing
        ? "No GitHub token configured and the GitHub CLI (gh) is not installed."
        : "The GitHub CLI is installed but not logged in.",
      undefined,
      missing ? "gh-missing" : "gh-not-logged-in",
    );
  }
  if (!value) throw new GitHubError("The GitHub CLI returned an empty token.", undefined, "gh-not-logged-in");
  cachedToken = { value, at: Date.now() };
  return { token: value, source: "gh" };
}

function getToken(): string {
  return resolveToken().token;
}

function headers() {
  return {
    Authorization: `Bearer ${getToken()}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function toError(res: Response): Promise<GitHubError> {
  let detail = res.statusText;
  try {
    const body = await res.json();
    detail = body.message ?? detail;
  } catch {
    // keep statusText
  }
  if (res.status === 401) clearTokenCache();
  return new GitHubError(`GitHub API ${res.status}: ${detail}`, res.status);
}

export async function rest<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw await toError(res);
  return (await res.json()) as T;
}

/** Fetches every page of a list endpoint; pages after the first are loaded in parallel. */
export async function restAll<T>(path: string): Promise<T[]> {
  const sep = path.includes("?") ? "&" : "?";
  const first = await fetch(`${API_URL}${path}${sep}per_page=100&page=1`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!first.ok) throw await toError(first);
  const items = (await first.json()) as T[];
  const last = Number(/[?&]page=(\d+)>; rel="last"/.exec(first.headers.get("link") ?? "")?.[1] ?? 1);
  const rest_ = await Promise.all(
    Array.from({ length: last - 1 }, (_, i) => rest<T[]>(`${path}${sep}per_page=100&page=${i + 2}`)),
  );
  return items.concat(...rest_);
}

export async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) throw await toError(res);
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors?.length) throw new GitHubError(body.errors.map((e) => e.message).join("; "));
  if (!body.data) throw new GitHubError("Empty GraphQL response");
  return body.data;
}

export async function restPost<T = unknown>(path: string, body?: unknown): Promise<T | undefined> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw await toError(res);
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : undefined;
}
