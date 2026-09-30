import { rest } from "./github";
import type { StageOptions } from "./model";

// GitHub only allows re-running workflow runs (or jobs) within 30 days.
const RERUN_MAX_DAYS = 30;

interface RunApi {
  id: number;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
  display_title: string;
  workflow_id: number;
  name: string;
  path: string;
}

async function supportsDispatch(owner: string, repo: string, path: string, ref: string) {
  try {
    const file = await rest<{ content: string }>(
      `/repos/${owner}/${repo}/contents/${path.split("@")[0]}?ref=${encodeURIComponent(ref)}`,
    );
    return /^\s*workflow_dispatch\s*:?/m.test(Buffer.from(file.content, "base64").toString("utf8"));
  } catch {
    return false;
  }
}

export async function getStageOptions(
  owner: string,
  repo: string,
  { runId, jobId, ref }: { runId: number; jobId?: number; ref?: string },
): Promise<StageOptions> {
  const [repoInfo, run, job] = await Promise.all([
    rest<{ permissions?: { push?: boolean } }>(`/repos/${owner}/${repo}`),
    rest<RunApi>(`/repos/${owner}/${repo}/actions/runs/${runId}`),
    jobId ? rest<{ id: number; name: string }>(`/repos/${owner}/${repo}/actions/jobs/${jobId}`) : undefined,
  ]);

  const ageDays = (Date.now() - new Date(run.created_at).getTime()) / 86_400_000;
  const options: StageOptions = {
    canWrite: !!repoInfo.permissions?.push,
    run: {
      id: run.id,
      status: run.status,
      conclusion: run.conclusion,
      ageDays: Math.floor(ageDays),
      url: run.html_url,
      title: run.display_title,
    },
  };
  if (!options.canWrite) {
    options.reason = "You need write access to the repository to re-run pipelines.";
    return options;
  }

  const completed = run.status === "completed";
  const rerunnable = completed && ageDays <= RERUN_MAX_DAYS;
  if (rerunnable && job) options.rerunJob = { jobId: job.id, jobName: job.name };
  if (rerunnable && !job && ["failure", "cancelled", "timed_out"].includes(run.conclusion ?? "")) {
    options.rerunFailed = true;
  }
  if (ref && (await supportsDispatch(owner, repo, run.path, ref))) {
    const workflow = await rest<{ name: string }>(`/repos/${owner}/${repo}/actions/workflows/${run.workflow_id}`);
    options.dispatch = { workflowId: run.workflow_id, workflowName: workflow.name, ref };
  }

  if (!completed) {
    options.reason =
      run.status === "waiting"
        ? "This release's run is still waiting for an approval on another stage, so single stages can't be re-run yet."
        : `This release's run is still ${run.status.replace("_", " ")}.`;
  }
  else if (!rerunnable) options.reason = `The run is ${Math.floor(ageDays)} days old; GitHub only re-runs runs up to ${RERUN_MAX_DAYS} days.`;
  return options;
}
