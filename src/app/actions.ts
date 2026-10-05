"use server";

import { rest, restPost, restSend } from "@/lib/github";
import type { MergeMethod } from "@/lib/model";
import { tagExists } from "@/lib/tags";
import { tagNameError } from "@/lib/versions";

export type ReviewResult = { ok: true } | { ok: false; error: string };

const NAME = /^[\w.-]+$/;

/**
 * Approves or rejects a pending environment gate of a workflow run.
 * GitHub itself enforces that the token owner is a required reviewer.
 */
export async function reviewDeployment(input: {
  owner: string;
  repo: string;
  runId: number;
  environmentId: number;
  state: "approved" | "rejected";
  comment?: string;
}): Promise<ReviewResult> {
  const { owner, repo, runId, environmentId, state } = input;
  if (
    !NAME.test(owner) ||
    !NAME.test(repo) ||
    !Number.isSafeInteger(runId) ||
    !Number.isSafeInteger(environmentId) ||
    (state !== "approved" && state !== "rejected")
  ) {
    return { ok: false, error: "Invalid request" };
  }
  const comment =
    (input.comment ?? "").trim().slice(0, 1000) ||
    `${state === "approved" ? "Approved" : "Rejected"} via Release Dashboard`;
  try {
    await restPost(`/repos/${owner}/${repo}/actions/runs/${runId}/pending_deployments`, {
      environment_ids: [environmentId],
      state,
      comment,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function validRepo(owner: string, repo: string) {
  return NAME.test(owner) && NAME.test(repo);
}

async function run(fn: () => Promise<unknown>): Promise<ReviewResult> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Re-runs a single job (e.g. "deploy to Q") and all jobs that depend on it. */
export async function rerunJob(input: { owner: string; repo: string; jobId: number }): Promise<ReviewResult> {
  const { owner, repo, jobId } = input;
  if (!validRepo(owner, repo) || !Number.isSafeInteger(jobId)) return { ok: false, error: "Invalid request" };
  return run(() => restPost(`/repos/${owner}/${repo}/actions/jobs/${jobId}/rerun`));
}

/** Re-runs the failed/cancelled jobs of a run and everything downstream of them. */
export async function rerunFailedJobs(input: { owner: string; repo: string; runId: number }): Promise<ReviewResult> {
  const { owner, repo, runId } = input;
  if (!validRepo(owner, repo) || !Number.isSafeInteger(runId)) return { ok: false, error: "Invalid request" };
  return run(() => restPost(`/repos/${owner}/${repo}/actions/runs/${runId}/rerun-failed-jobs`));
}

/** Starts the workflow again on a tag/branch (full pipeline, all gates apply). */
export async function dispatchWorkflow(input: {
  owner: string;
  repo: string;
  workflowId: number;
  ref: string;
}): Promise<ReviewResult> {
  const { owner, repo, workflowId, ref } = input;
  if (!validRepo(owner, repo) || !Number.isSafeInteger(workflowId) || !/^[\w./-]+$/.test(ref)) {
    return { ok: false, error: "Invalid request" };
  }
  return run(() => restPost(`/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, { ref }));
}

/**
 * Creates a tag on the exact commit the user saw in the preview (not the branch head at
 * submit time). Pushing a tag with a user token starts workflows triggered by `push: tags`.
 */
export async function createTag(input: {
  owner: string;
  repo: string;
  tag: string;
  sha: string;
}): Promise<ReviewResult> {
  const { owner, repo, tag, sha } = input;
  if (!validRepo(owner, repo) || !/^[0-9a-f]{40}$/.test(sha)) return { ok: false, error: "Invalid request" };
  const nameError = tagNameError(tag);
  if (nameError) return { ok: false, error: nameError };
  return run(async () => {
    if (await tagExists(owner, repo, tag)) throw new Error(`Tag ${tag} already exists.`);
    await restPost(`/repos/${owner}/${repo}/git/refs`, { ref: `refs/tags/${tag}`, sha });
  });
}

function validPull(owner: string, repo: string, number: number) {
  return validRepo(owner, repo) && Number.isSafeInteger(number) && number > 0;
}

/** Approves a pull request or requests changes. GitHub rejects reviews on your own PR. */
export async function reviewPullRequest(input: {
  owner: string;
  repo: string;
  number: number;
  event: "APPROVE" | "REQUEST_CHANGES";
  body?: string;
}): Promise<ReviewResult> {
  const { owner, repo, number, event } = input;
  if (!validPull(owner, repo, number) || (event !== "APPROVE" && event !== "REQUEST_CHANGES")) {
    return { ok: false, error: "Invalid request" };
  }
  const body = (input.body ?? "").trim().slice(0, 1000);
  if (event === "REQUEST_CHANGES" && !body) return { ok: false, error: "Please describe the requested changes." };
  return run(() =>
    restPost(`/repos/${owner}/${repo}/pulls/${number}/reviews`, body ? { event, body } : { event }),
  );
}

/** Merges exactly the head commit the user saw; GitHub rejects the merge if new commits were pushed since. */
export async function mergePullRequest(input: {
  owner: string;
  repo: string;
  number: number;
  method: MergeMethod;
  sha: string;
  deleteBranch: boolean;
}): Promise<ReviewResult> {
  const { owner, repo, number, method, sha, deleteBranch } = input;
  if (
    !validPull(owner, repo, number) ||
    !["merge", "squash", "rebase"].includes(method) ||
    !/^[0-9a-f]{40}$/.test(sha)
  ) {
    return { ok: false, error: "Invalid request" };
  }
  const merged = await run(() =>
    restSend("PUT", `/repos/${owner}/${repo}/pulls/${number}/merge`, { merge_method: method, sha }),
  );
  if (!merged.ok || !deleteBranch) return merged;
  return branchResult("Merged", await run(() => deleteHeadBranch(owner, repo, number)));
}

/** Merges the base branch into the PR branch; checks run again on the new head commit. */
export async function updatePullRequestBranch(input: {
  owner: string;
  repo: string;
  number: number;
  sha: string;
}): Promise<ReviewResult> {
  const { owner, repo, number, sha } = input;
  if (!validPull(owner, repo, number) || !/^[0-9a-f]{40}$/.test(sha)) return { ok: false, error: "Invalid request" };
  return run(() =>
    restSend("PUT", `/repos/${owner}/${repo}/pulls/${number}/update-branch`, { expected_head_sha: sha }),
  );
}

export async function closePullRequest(input: {
  owner: string;
  repo: string;
  number: number;
  deleteBranch: boolean;
}): Promise<ReviewResult> {
  const { owner, repo, number, deleteBranch } = input;
  if (!validPull(owner, repo, number)) return { ok: false, error: "Invalid request" };
  const closed = await run(() => restSend("PATCH", `/repos/${owner}/${repo}/pulls/${number}`, { state: "closed" }));
  if (!closed.ok || !deleteBranch) return closed;
  return branchResult("Closed", await run(() => deleteHeadBranch(owner, repo, number)));
}

function branchResult(action: string, deleted: ReviewResult): ReviewResult {
  return deleted.ok ? deleted : { ok: false, error: `${action}, but the branch was not deleted: ${deleted.error}` };
}

/** The branch name is read from GitHub, never taken from the client. */
async function deleteHeadBranch(owner: string, repo: string, number: number) {
  const pr = await rest<{
    head: { ref: string; repo: { full_name: string } | null };
    base: { repo: { full_name: string; default_branch: string } };
  }>(`/repos/${owner}/${repo}/pulls/${number}`);
  if (pr.head.repo?.full_name !== pr.base.repo.full_name) throw new Error("The branch belongs to a fork.");
  if (pr.head.ref === pr.base.repo.default_branch) throw new Error("Refusing to delete the default branch.");
  const ref = pr.head.ref.split("/").map(encodeURIComponent).join("/");
  await restSend("DELETE", `/repos/${owner}/${repo}/git/refs/heads/${ref}`);
}
