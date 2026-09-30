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
