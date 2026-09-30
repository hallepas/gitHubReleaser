import { graphql, rest } from "./github";
import {
  type Matrix,
  type MatrixRow,
  type PendingApproval,
  type StageCell,
  STATUS_TEXT,
  deploymentStatus,
  formatDate,
  jobStatus,
  orderColumns,
} from "./model";

const MAX_ROWS = Number(process.env.DASHBOARD_MAX_ROWS ?? 20);

type CellWithTime = StageCell & { at?: string };

interface GqlDeployment {
  environment: string | null;
  state: string;
  createdAt: string;
  description: string | null;
  commitOid: string;
  ref: { name: string; prefix: string } | null;
  commit: { messageHeadline: string; url: string } | null;
  creator: { login: string; avatarUrl: string } | null;
  latestStatus: {
    state: string;
    createdAt: string;
    logUrl: string | null;
    environmentUrl: string | null;
    description: string | null;
  } | null;
}

interface DeploymentQuery {
  repository: {
    url: string;
    environments: { nodes: { name: string }[] };
    deployments: { nodes: GqlDeployment[] };
  } | null;
}

const DEPLOYMENTS_QUERY = /* GraphQL */ `
  query ($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      url
      environments(first: 100) { nodes { name } }
      deployments(first: 100, orderBy: { field: CREATED_AT, direction: DESC }) {
        nodes {
          environment
          state
          createdAt
          description
          commitOid
          ref { name prefix }
          commit { messageHeadline url }
          creator { login avatarUrl }
          latestStatus { state createdAt logUrl environmentUrl description }
        }
      }
    }
  }
`;

export async function getDeploymentMatrix(owner: string, repo: string): Promise<Matrix> {
  const data = await graphql<DeploymentQuery>(DEPLOYMENTS_QUERY, { owner, name: repo });
  if (!data.repository) throw new Error(`Repository ${owner}/${repo} not found`);
  const { url: repoUrl, environments, deployments } = data.repository;

  const hidden = new Set(
    (process.env.DASHBOARD_HIDE_ENVS ?? "copilot").split(",").map((s) => s.trim().toLowerCase()),
  );
  const groups = new Map<string, GqlDeployment[]>();
  for (const d of deployments.nodes) {
    if (!d.environment || hidden.has(d.environment.toLowerCase())) continue;
    const key = d.ref ? `${d.ref.prefix}${d.ref.name}` : d.commitOid;
    const list = groups.get(key) ?? [];
    list.push(d);
    groups.set(key, list);
  }

  // Newest successful deployment per environment = version currently live there.
  const currentByEnv = new Map<string, GqlDeployment>();
  const newestByEnv = new Map<string, GqlDeployment>();
  for (const d of deployments.nodes) {
    if (!d.environment) continue;
    if (!newestByEnv.has(d.environment)) newestByEnv.set(d.environment, d);
    if (currentByEnv.has(d.environment)) continue;
    if (deploymentStatus(d.latestStatus?.state ?? d.state) === "success") {
      currentByEnv.set(d.environment, d);
    }
  }

  const rows: (MatrixRow & { cells: Record<string, CellWithTime>; latest: string })[] = [];
  for (const [key, list] of groups) {
    const first = list.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
    const latest = list.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
    const cells: Record<string, CellWithTime> = {};
    // list is newest-first, so the first hit per environment wins.
    for (const d of list) {
      const env = d.environment!;
      if (cells[env]) continue;
      let status = deploymentStatus(d.latestStatus?.state ?? d.state);
      let note = d.latestStatus?.description ?? d.description ?? "";
      // An approval that was never given and has since been overtaken by a newer deployment is dead.
      if ((status === "waiting" || status === "queued") && newestByEnv.get(env) !== d) {
        status = "cancelled";
        note = "Never approved – superseded by a newer deployment";
      }
      const when = d.latestStatus?.createdAt ?? d.createdAt;
      cells[env] = {
        status,
        label: env,
        at: d.createdAt,
        current: currentByEnv.get(env) === d,
        url:
          d.latestStatus?.logUrl ??
          d.latestStatus?.environmentUrl ??
          `${repoUrl}/deployments/${encodeURIComponent(env)}`,
        tooltip: [
          `${env}: ${STATUS_TEXT[status]}`,
          formatDate(when),
          note,
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }
    const shortSha = first.commitOid.slice(0, 7);
    rows.push({
      key,
      title: first.ref?.name ?? shortSha,
      url: first.commit?.url,
      subtitle: first.commit?.messageHeadline,
      refLabel: first.ref ? `${first.ref.prefix}${first.ref.name}` : shortSha,
      refUrl: first.ref ? `${repoUrl}/tree/${first.ref.name}` : first.commit?.url,
      actor: first.creator ?? undefined,
      createdAt: first.createdAt,
      latest: latest.createdAt,
      cells,
    });
  }

  rows.sort((a, b) => b.latest.localeCompare(a.latest));
  const visible = rows.slice(0, MAX_ROWS);
  const columns = orderColumns(visible, [
    ...environments.nodes.map((e) => e.name).filter((n) => !hidden.has(n.toLowerCase())),
    ...visible.flatMap((r) => Object.keys(r.cells)),
  ]);

  const pending: PendingApproval[] = visible.flatMap((r) =>
    Object.entries(r.cells)
      .filter(([, c]) => c.status === "waiting")
      .map(([stage, c]) => ({ stage, rowTitle: r.title, url: c.url })),
  );

  return { columns, rows: visible, pending };
}

export interface Workflow {
  id: number;
  name: string;
  path: string;
  state: string;
}

interface Run {
  id: number;
  name: string;
  display_title: string;
  run_number: number;
  run_attempt: number;
  event: string;
  status: string;
  conclusion: string | null;
  head_branch: string | null;
  head_sha: string;
  html_url: string;
  created_at: string;
  workflow_id: number;
  actor: { login: string; avatar_url: string } | null;
}

interface Job {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  html_url: string;
}

interface PendingDeployment {
  environment: { name: string };
  current_user_can_approve: boolean;
}

export async function getWorkflows(owner: string, repo: string): Promise<Workflow[]> {
  const data = await rest<{ workflows: Workflow[] }>(
    `/repos/${owner}/${repo}/actions/workflows?per_page=100`,
  );
  return data.workflows.filter((w) => w.state === "active");
}

export async function getLatestWorkflowId(owner: string, repo: string): Promise<number | undefined> {
  const data = await rest<{ workflow_runs: Run[] }>(`/repos/${owner}/${repo}/actions/runs?per_page=1`);
  return data.workflow_runs[0]?.workflow_id;
}

export async function getWorkflowMatrix(
  owner: string,
  repo: string,
  workflowId: number,
): Promise<Matrix> {
  const { workflow_runs: runs } = await rest<{ workflow_runs: Run[] }>(
    `/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?per_page=${MAX_ROWS}`,
  );

  const rows = await Promise.all(
    runs.map(async (run) => {
      const [{ jobs }, pending] = await Promise.all([
        rest<{ jobs: Job[] }>(`/repos/${owner}/${repo}/actions/runs/${run.id}/jobs?per_page=100`),
        run.status === "waiting"
          ? rest<PendingDeployment[]>(`/repos/${owner}/${repo}/actions/runs/${run.id}/pending_deployments`)
          : Promise.resolve([] as PendingDeployment[]),
      ]);

      const cells: Record<string, CellWithTime> = {};
      for (const job of jobs) {
        const status = jobStatus(job.status, job.conclusion);
        cells[job.name] = {
          status,
          label: job.name,
          url: job.html_url,
          at: job.started_at ?? job.created_at,
          tooltip: [
            `${job.name}: ${STATUS_TEXT[status]}`,
            job.started_at ? `Started ${formatDate(job.started_at)}` : "",
            job.completed_at ? `Finished ${formatDate(job.completed_at)}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        };
      }

      const row: MatrixRow & { cells: Record<string, CellWithTime> } = {
        key: String(run.id),
        title: `${run.display_title} #${run.run_number}`,
        url: run.html_url,
        subtitle: `${run.name} · ${run.event}${run.run_attempt > 1 ? ` · attempt ${run.run_attempt}` : ""}`,
        refLabel: run.head_branch ?? run.head_sha.slice(0, 7),
        refUrl: `${run.html_url.split("/actions/")[0]}/tree/${run.head_branch ?? run.head_sha}`,
        actor: run.actor ? { login: run.actor.login, avatarUrl: run.actor.avatar_url } : undefined,
        createdAt: run.created_at,
        cells,
      };
      const approvals: PendingApproval[] = pending.map((p) => ({
        stage: p.environment.name,
        rowTitle: row.title,
        url: run.html_url,
      }));
      return { row, approvals };
    }),
  );

  const matrixRows = rows.map((r) => r.row);
  const columns = orderColumns(
    matrixRows,
    matrixRows.flatMap((r) => Object.keys(r.cells)),
  );
  return { columns, rows: matrixRows, pending: rows.flatMap((r) => r.approvals) };
}
