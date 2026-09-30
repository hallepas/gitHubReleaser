import { API_URL, clearTokenCache, GitHubError, resolveToken, type TokenSource } from "./github";

export type AuthStatus =
  | {
      ok: true;
      login: string;
      name: string | null;
      avatarUrl: string;
      source: TokenSource;
      /** Classic-token scopes; null for fine-grained tokens / GitHub App tokens. */
      scopes: string[] | null;
      warnings: string[];
    }
  | {
      ok: false;
      problem: "gh-missing" | "gh-not-logged-in" | "no-token" | "invalid-token" | "tls" | "network" | "unknown";
      source?: TokenSource;
      message: string;
    };

const TLS_CODES = new Set([
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "CERT_HAS_EXPIRED",
]);

function errorCode(e: unknown): string | undefined {
  const cause = (e as { cause?: { code?: string } })?.cause;
  return cause?.code ?? (e as { code?: string })?.code;
}

const OK_TTL_MS = 60_000;
let okCache: { token: string; at: number; status: AuthStatus } | undefined;

/** Checks which GitHub identity the dashboard will act as, and whether that works. */
export async function getAuthStatus(): Promise<AuthStatus> {
  let token: string;
  let source: TokenSource;
  try {
    ({ token, source } = resolveToken());
  } catch (e) {
    const problem = e instanceof GitHubError && e.problem ? e.problem : "no-token";
    return { ok: false, problem, message: e instanceof Error ? e.message : String(e) };
  }
  if (okCache && okCache.token === token && Date.now() - okCache.at < OK_TTL_MS) return okCache.status;

  let res: Response;
  try {
    res = await fetch(`${API_URL}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });
  } catch (e) {
    const code = errorCode(e);
    if (code && TLS_CODES.has(code)) {
      return {
        ok: false,
        problem: "tls",
        source,
        message: `The HTTPS connection to GitHub is intercepted by a proxy whose certificate Node.js does not trust (${code}).`,
      };
    }
    return {
      ok: false,
      problem: "network",
      source,
      message: `Cannot reach ${API_URL}${code ? ` (${code})` : ""}.`,
    };
  }

  if (res.status === 401) {
    clearTokenCache();
    return {
      ok: false,
      problem: "invalid-token",
      source,
      message:
        source === "env"
          ? "The GITHUB_TOKEN in .env.local is invalid or expired."
          : "The GitHub CLI login is invalid or expired.",
    };
  }
  if (!res.ok) {
    return { ok: false, problem: "unknown", source, message: `GitHub answered ${res.status} ${res.statusText}.` };
  }

  const user = (await res.json()) as { login: string; name: string | null; avatar_url: string };
  const header = res.headers.get("x-oauth-scopes");
  const scopes = header === null ? null : header.split(",").map((s) => s.trim()).filter(Boolean);
  const warnings: string[] = [];
  if (scopes) {
    if (!scopes.includes("repo")) {
      warnings.push("Your token is missing the “repo” scope – private repositories, approvals and re-runs will not work.");
    }
    if (!scopes.some((s) => s === "read:org" || s === "admin:org" || s === "write:org")) {
      warnings.push("Your token is missing the “read:org” scope – repositories of your organizations may be missing from search.");
    }
  }
  const status: AuthStatus = { ok: true, login: user.login, name: user.name, avatarUrl: user.avatar_url, source, scopes, warnings };
  okCache = { token, at: Date.now(), status };
  return status;
}
