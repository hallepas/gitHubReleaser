import { MatrixTable, PendingBanner } from "@/components/MatrixTable";
import { ErrorBox } from "@/components/RepoHeader";
import { SetupGuide } from "@/components/SetupGuide";
import { getAuthStatus } from "@/lib/auth";
import { WorkflowPicker } from "@/components/WorkflowPicker";
import { PipelineIcon } from "@/components/icons";
import { EmptyState } from "@/components/ui";
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
  const auth = await getAuthStatus();
  if (!auth.ok) return <SetupGuide status={auth} />;
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
    <>
      {workflows.length > 0 && <WorkflowPicker workflows={workflows} selected={selected} />}
      {error ? (
        <ErrorBox error={error} />
      ) : !matrix ? (
        <div className="card">
          <EmptyState icon={<PipelineIcon className="h-5 w-5" />} title="No workflows">
            There are no GitHub Actions workflows in this repository.
          </EmptyState>
        </div>
      ) : (
        <>
          <PendingBanner matrix={matrix} />
          <MatrixTable matrix={matrix} firstColumn="Runs" owner={owner} repo={repo} />
        </>
      )}
    </>
  );
}
