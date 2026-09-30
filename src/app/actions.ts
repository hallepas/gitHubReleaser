"use server";

import { restPost } from "@/lib/github";

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
