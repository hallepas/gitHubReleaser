import { graphql } from "./github";
import { compareVersions, parseVersion } from "./versions";

const HISTORY_DEPTH = 100;

export interface ChangePullRequest {
  number: number;
  title: string;
  url: string;
  author?: string;
  mergedAt?: string;
}

/** A tag on the branch plus everything merged since the previous tag. */
export interface BranchSegment {
  /** Undefined for the commits after the newest tag ("not tagged yet"). */
  tag?: string;
  /** Other tags on the same commit. */
  otherTags: string[];
  preview: boolean;
  sha: string;
  date: string;
  headline: string;
  commits: number;
  pullRequests: ChangePullRequest[];
}

export interface BranchChanges {
  branch: string;
  repoUrl: string;
  headSha: string;
  headline: string;
  headDate: string;
  latestTag?: string;
  /** Commits on the branch after its newest tag. */
  untagged: BranchSegment;
  /** Newest first. */
  tags: BranchSegment[];
  /** The history was cut off before the oldest segment ended. */
  truncated: boolean;
}

interface RawCommit {
  oid: string;
  messageHeadline: string;
  committedDate: string;
  associatedPullRequests: {
    nodes: { number: number; title: string; url: string; mergedAt: string | null; baseRefName: string; author: { login: string } | null }[];
  };
}

interface RawRef {
  name: string;
  target: { history?: { nodes: RawCommit[] } } | null;
}

interface ChangesQuery {
  repository: {
    url: string;
    defaultBranchRef?: RawRef | null;
    ref?: RawRef | null;
    tags: { nodes: { name: string; target: { oid: string; target?: { oid: string } } | null }[] };
  } | null;
}

const CHANGES_QUERY = /* GraphQL */ `
  fragment History on Ref {
    name
    target {
      ... on Commit {
        history(first: $depth) {
          nodes {
            oid
            messageHeadline
            committedDate
            associatedPullRequests(first: 5) {
              nodes { number title url mergedAt baseRefName author { login } }
            }
          }
        }
      }
    }
  }
  query ($owner: String!, $name: String!, $ref: String!, $useDefault: Boolean!, $depth: Int!) {
    repository(owner: $owner, name: $name) {
      url
      defaultBranchRef @include(if: $useDefault) { ...History }
      ref(qualifiedName: $ref) @skip(if: $useDefault) { ...History }
      tags: refs(refPrefix: "refs/tags/", first: 100, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) {
        nodes { name target { oid ... on Tag { target { oid } } } }
      }
    }
  }
`;

/** Highest version first; non-version tags last. */
function sortTags(tags: string[]): string[] {
  return [...tags].sort((a, b) => {
    const va = parseVersion(a);
    const vb = parseVersion(b);
    if (va && vb) return compareVersions(vb, va);
    return Number(!!vb) - Number(!!va) || a.localeCompare(b);
  });
}

function pullRequestsOf(commit: RawCommit, branch: string, repoUrl: string): ChangePullRequest[] {
  const merged = commit.associatedPullRequests.nodes.filter((p) => p.mergedAt && p.baseRefName === branch);
  if (merged.length) {
    return merged.map((p) => ({ number: p.number, title: p.title, url: p.url, author: p.author?.login, mergedAt: p.mergedAt! }));
  }
  // Fallback when the PR is not linked: "Title (#12)" (squash) or "Merge pull request #12 from …".
  const m = /\(#(\d+)\)\s*$/.exec(commit.messageHeadline) ?? /^Merge pull request #(\d+)/.exec(commit.messageHeadline);
  return m ? [{ number: Number(m[1]), title: commit.messageHeadline, url: `${repoUrl}/pull/${m[1]}` }] : [];
}

/**
 * Splits the recent history of a branch at its tags, so every tag lists the pull requests
 * merged since the previous tag, and the commits after the newest tag show what is not released yet.
 */
export async function getBranchChanges(owner: string, repo: string, branch?: string): Promise<BranchChanges | undefined> {
  const data = await graphql<ChangesQuery>(CHANGES_QUERY, {
    owner,
    name: repo,
    ref: `refs/heads/${branch ?? ""}`,
    useDefault: !branch,
    depth: HISTORY_DEPTH,
  });
  if (!data.repository) throw new Error(`Repository ${owner}/${repo} not found`);
  const ref = branch ? data.repository.ref : data.repository.defaultBranchRef;
  const commits = ref?.target?.history?.nodes;
  if (!ref || !commits?.length) return undefined;
  const branchName = ref.name;
  const repoUrl = data.repository.url;

  const tagsByCommit = new Map<string, string[]>();
  for (const t of data.repository.tags.nodes) {
    // Annotated tags point at a tag object that points at the commit.
    const sha = t.target?.target?.oid ?? t.target?.oid;
    if (sha) tagsByCommit.set(sha, [...(tagsByCommit.get(sha) ?? []), t.name]);
  }

  const newSegment = (c: RawCommit, tags: string[]): BranchSegment => {
    const [tag, ...otherTags] = sortTags(tags);
    return {
      tag,
      otherTags,
      preview: !!(tag && parseVersion(tag)?.pre),
      sha: c.oid,
      date: c.committedDate,
      headline: c.messageHeadline,
      commits: 0,
      pullRequests: [],
    };
  };

  const head = commits[0];
  const untagged = newSegment(head, []);
  const segments: BranchSegment[] = [];
  let current = untagged;
  for (const c of commits) {
    const tags = tagsByCommit.get(c.oid);
    if (tags?.length) {
      current = newSegment(c, tags);
      segments.push(current);
    }
    current.commits += 1;
    for (const pr of pullRequestsOf(c, branchName, repoUrl)) {
      if (!current.pullRequests.some((p) => p.number === pr.number)) current.pullRequests.push(pr);
    }
  }

  return {
    branch: branchName,
    repoUrl,
    headSha: head.oid,
    headline: head.messageHeadline,
    headDate: head.committedDate,
    latestTag: segments[0]?.tag,
    untagged,
    tags: segments,
    truncated: commits.length === HISTORY_DEPTH,
  };
}
