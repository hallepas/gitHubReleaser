import { restAll } from "./github";

export interface RepoSummary {
  fullName: string;
  description: string | null;
  private: boolean;
  archived: boolean;
  pushedAt: string | null;
}

interface ApiRepo {
  full_name: string;
  description: string | null;
  private: boolean;
  archived: boolean;
  pushed_at: string | null;
}

const TTL_MS = 10 * 60 * 1000;
let cache: { at: number; data: Promise<RepoSummary[]> } | undefined;

async function load(): Promise<RepoSummary[]> {
  const repos = await restAll<ApiRepo>(
    "/user/repos?affiliation=owner,collaborator,organization_member&sort=pushed",
  );
  return repos
    .map((r) => ({
      fullName: r.full_name,
      description: r.description,
      private: r.private,
      archived: r.archived,
      pushedAt: r.pushed_at,
    }))
    .sort((a, b) => (b.pushedAt ?? "").localeCompare(a.pushedAt ?? ""));
}

/** All repositories the token can see, cached in memory (shared across requests). */
export function getAllRepos(force = false): Promise<RepoSummary[]> {
  if (force || !cache || Date.now() - cache.at > TTL_MS) {
    const data = load();
    cache = { at: Date.now(), data };
    data.catch(() => {
      if (cache?.data === data) cache = undefined;
    });
  }
  return cache.data;
}
