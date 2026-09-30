import { graphql, rest, GitHubError } from "./github";
import { formatDate } from "./model";
import { suggestTags, type TagSuggestion } from "./versions";

export interface BranchInfo {
  name: string;
  sha: string;
  headline: string;
  date: string;
  /** Tags that already point at the branch head. */
  tags: string[];
}

export interface TagOptions {
  canWrite: boolean;
  defaultBranch?: string;
  branches: BranchInfo[];
  /** Most recent tags (by commit date); used for the "already exists" hint. */
  tags: string[];
  totalTags: number;
  latestRelease?: string;
  latestPreview?: string;
  suggestions: TagSuggestion[];
}

interface RefNode {
  name: string;
  target: {
    oid: string;
    committedDate?: string;
    messageHeadline?: string;
    target?: { oid: string };
  } | null;
}

interface TagQuery {
  repository: {
    viewerPermission: string | null;
    defaultBranchRef: { name: string } | null;
    branches: { nodes: RefNode[] };
    tags: { totalCount: number; nodes: RefNode[] };
  } | null;
}

const TAG_QUERY = /* GraphQL */ `
  query ($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      viewerPermission
      defaultBranchRef { name }
      branches: refs(refPrefix: "refs/heads/", first: 100, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) {
        nodes { name target { oid ... on Commit { committedDate messageHeadline } } }
      }
      tags: refs(refPrefix: "refs/tags/", first: 100, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) {
        totalCount
        nodes { name target { oid ... on Tag { target { oid } } } }
      }
    }
  }
`;

export async function getTagOptions(owner: string, repo: string): Promise<TagOptions> {
  const data = await graphql<TagQuery>(TAG_QUERY, { owner, name: repo });
  if (!data.repository) throw new Error(`Repository ${owner}/${repo} not found`);
  const { viewerPermission, defaultBranchRef, branches, tags } = data.repository;

  const tagsByCommit = new Map<string, string[]>();
  for (const t of tags.nodes) {
    // Annotated tags point at a tag object that points at the commit.
    const sha = t.target?.target?.oid ?? t.target?.oid;
    if (sha) tagsByCommit.set(sha, [...(tagsByCommit.get(sha) ?? []), t.name]);
  }

  const list: BranchInfo[] = branches.nodes
    .filter((b) => b.target)
    .map((b) => ({
      name: b.name,
      sha: b.target!.oid,
      headline: b.target!.messageHeadline ?? "",
      date: b.target!.committedDate ? formatDate(b.target!.committedDate) : "",
      tags: tagsByCommit.get(b.target!.oid) ?? [],
    }));
  const defaultBranch = defaultBranchRef?.name;
  list.sort((a, b) => Number(b.name === defaultBranch) - Number(a.name === defaultBranch));

  const tagNames = tags.nodes.map((t) => t.name);
  return {
    canWrite: ["ADMIN", "MAINTAIN", "WRITE"].includes(viewerPermission ?? ""),
    defaultBranch,
    branches: list,
    tags: tagNames,
    totalTags: tags.totalCount,
    ...suggestTags(tagNames),
  };
}

export async function tagExists(owner: string, repo: string, tag: string): Promise<boolean> {
  try {
    await rest(`/repos/${owner}/${repo}/git/ref/tags/${tag.split("/").map(encodeURIComponent).join("/")}`);
    return true;
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) return false;
    throw e;
  }
}
