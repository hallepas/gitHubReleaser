import { graphql, restAll } from "./github";
import { checksStatus, type MergeMethod, type PullFile, type PullRequest } from "./model";

const MAX_ROWS = Number(process.env.DASHBOARD_MAX_ROWS ?? 20);

const PR_FIELDS = `
fragment PR on PullRequest {
  number
  title
  url
  state
  isDraft
  createdAt
  updatedAt
  author { login avatarUrl }
  baseRefName
  headRefName
  headRefOid
  isCrossRepository
  labels(first: 10) { nodes { name color } }
  reviewDecision
  viewerLatestReview { state }
  mergeable
  mergeStateStatus
  viewerDidAuthor
  viewerCanClose
  viewerCanDeleteHeadRef
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
  repository {
    name
    owner { login }
    viewerPermission
    mergeCommitAllowed
    squashMergeAllowed
    rebaseMergeAllowed
    viewerDefaultMergeMethod
    deleteBranchOnMerge
  }
}`;

interface RawPR {
  number: number;
  title: string;
  url: string;
  state: PullRequest["state"];
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  author: { login: string; avatarUrl: string } | null;
  baseRefName: string;
  headRefName: string;
  headRefOid: string;
  isCrossRepository: boolean;
  labels: { nodes: { name: string; color: string }[] };
  reviewDecision: PullRequest["reviewDecision"];
  viewerLatestReview: { state: string } | null;
  mergeable: PullRequest["mergeable"];
  mergeStateStatus: string;
  viewerDidAuthor: boolean;
  viewerCanClose: boolean;
  viewerCanDeleteHeadRef: boolean;
  commits: { nodes: { commit: { statusCheckRollup: { state: string } | null } }[] };
  repository: {
    name: string;
    owner: { login: string };
    viewerPermission: string | null;
    mergeCommitAllowed: boolean;
    squashMergeAllowed: boolean;
    rebaseMergeAllowed: boolean;
    viewerDefaultMergeMethod: "MERGE" | "SQUASH" | "REBASE";
    deleteBranchOnMerge: boolean;
  };
}

function toPullRequest(p: RawPR): PullRequest {
  const r = p.repository;
  const mergeMethods: MergeMethod[] = [];
  if (r.mergeCommitAllowed) mergeMethods.push("merge");
  if (r.squashMergeAllowed) mergeMethods.push("squash");
  if (r.rebaseMergeAllowed) mergeMethods.push("rebase");
  const preferred = r.viewerDefaultMergeMethod.toLowerCase() as MergeMethod;
  return {
    owner: r.owner.login,
    repo: r.name,
    number: p.number,
    title: p.title,
    url: p.url,
    state: p.state,
    isDraft: p.isDraft,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    author: p.author ?? undefined,
    baseRef: p.baseRefName,
    headRef: p.headRefName,
    headSha: p.headRefOid,
    fromFork: p.isCrossRepository,
    labels: p.labels.nodes,
    checks: checksStatus(p.commits.nodes[0]?.commit.statusCheckRollup?.state),
    reviewDecision: p.reviewDecision,
    viewerReview: p.viewerLatestReview?.state,
    mergeable: p.mergeable,
    mergeState: p.mergeStateStatus,
    viewerIsAuthor: p.viewerDidAuthor,
    canMerge: ["WRITE", "MAINTAIN", "ADMIN"].includes(r.viewerPermission ?? ""),
    canClose: p.viewerCanClose,
    canDeleteBranch: p.viewerCanDeleteHeadRef && !p.isCrossRepository,
    mergeMethods,
    defaultMergeMethod: mergeMethods.includes(preferred) ? preferred : (mergeMethods[0] ?? "merge"),
    deleteBranchOnMerge: r.deleteBranchOnMerge,
  };
}

export async function getPullRequest(
  owner: string,
  repo: string,
  number: number,
): Promise<{ pr: PullRequest; body: string } | null> {
  const data = await graphql<{ repository: { pullRequest: (RawPR & { bodyText: string }) | null } | null }>(
    `query ($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        pullRequest(number: $number) { ...PR bodyText }
      }
    }
    ${PR_FIELDS}`,
    { owner, name: repo, number },
  );
  const raw = data.repository?.pullRequest;
  return raw ? { pr: toPullRequest(raw), body: raw.bodyText } : null;
}

export function getPullRequestFiles(owner: string, repo: string, number: number): Promise<PullFile[]> {
  return restAll<PullFile>(`/repos/${owner}/${repo}/pulls/${number}/files`);
}

export async function getOpenPullRequestCount(owner: string, repo: string): Promise<number> {
  const data = await graphql<{ repository: { pullRequests: { totalCount: number } } | null }>(
    `query ($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) { pullRequests(states: OPEN) { totalCount } }
    }`,
    { owner, name: repo },
  );
  return data.repository?.pullRequests.totalCount ?? 0;
}

export async function getOpenPullRequests(owner: string, repo: string): Promise<PullRequest[]> {
  const data = await graphql<{ repository: { pullRequests: { nodes: RawPR[] } } | null }>(
    `query ($owner: String!, $name: String!, $first: Int!) {
      repository(owner: $owner, name: $name) {
        pullRequests(states: OPEN, first: $first, orderBy: { field: UPDATED_AT, direction: DESC }) {
          nodes { ...PR }
        }
      }
    }
    ${PR_FIELDS}`,
    { owner, name: repo, first: MAX_ROWS },
  );
  if (!data.repository) throw new Error(`Repository ${owner}/${repo} not found or not accessible.`);
  return data.repository.pullRequests.nodes.map(toPullRequest);
}

/** Open PRs across all repositories where the viewer (or one of their teams) is a requested reviewer. */
export async function getReviewRequests(): Promise<PullRequest[]> {
  const data = await graphql<{ search: { nodes: (RawPR | Record<string, never>)[] } }>(
    `query ($q: String!, $first: Int!) {
      search(query: $q, type: ISSUE, first: $first) {
        nodes { ...PR }
      }
    }
    ${PR_FIELDS}`,
    { q: "is:open is:pr review-requested:@me archived:false sort:updated-desc", first: MAX_ROWS },
  );
  return data.search.nodes.filter((n): n is RawPR => "number" in n).map(toPullRequest);
}
