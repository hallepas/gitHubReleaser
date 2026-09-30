import { MatrixTable, PendingBanner } from "@/components/MatrixTable";
import { ErrorBox, RepoHeader } from "@/components/RepoHeader";
import { WorkflowPicker } from "@/components/WorkflowPicker";
import { getLatestWorkflowId, getWorkflowMatrix, getWorkflows, type Workflow } from "@/lib/data";
import type { Matrix } from "@/lib/model";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string; repo: string }>;
  searchParams: Promise<{ workflow?: string }>;
}) {
  const { owner, repo } = await params;
  const { workflow } = await searchParams;

  let workflows: Workflow[] = [];
  let selected: number | undefined;
  let matrix: Matrix | undefined;
  let error: unknown;
  try {
    workflows = await getWorkflows(owner, repo);
    const preferred = workflows.find((w) => /release|deploy|\bcd\b/i.test(`${w.name} ${w.path}`));
    selected =
      Number(workflow) || preferred?.id || (await getLatestWorkflowId(owner, repo)) || workflows[0]?.id;
    if (selected) matrix = await getWorkflowMatrix(owner, repo, selected);
  } catch (e) {
    error = e;
  }

  return (
    <main>
      <RepoHeader owner={owner} repo={repo} active="workflows">
        {workflows.length > 0 && <WorkflowPicker workflows={workflows} selected={selected} />}
      </RepoHeader>
      {error ? (
        <ErrorBox error={error} />
      ) : !matrix ? (
        <p className="px-6 py-10 text-sm text-gray-500">No GitHub Actions workflows in this repository.</p>
      ) : (
        <>
          <PendingBanner matrix={matrix} />
          <MatrixTable matrix={matrix} firstColumn="Runs" owner={owner} repo={repo} />
        </>
      )}
    </main>
  );
}
