import { execFileSync } from "node:child_process";

const API_URL = (process.env.GITHUB_API_URL ?? "https://api.github.com").replace(/\/$/, "");
const GRAPHQL_URL = process.env.GITHUB_GRAPHQL_URL ?? `${API_URL}/graphql`;

let cachedToken: string | undefined;

export class GitHubError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

// Falls back to the GitHub CLI token so the POC works without extra setup.
function getToken(): string {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (cachedToken) return cachedToken;
  try {
    cachedToken = execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  } catch {
    throw new GitHubError(
      "No GitHub token found. Set GITHUB_TOKEN in .env.local or log in with `gh auth login`.",
    );
  }
  if (!cachedToken) throw new GitHubError("GitHub CLI returned an empty token.");
  return cachedToken;
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

export async function restPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw await toError(res);
  return (await res.json()) as T;
}
