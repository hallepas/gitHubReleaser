import { CurrentVersions, MatrixTable, PendingBanner, RunningReleases } from "@/components/MatrixTable";
import { UntaggedChanges } from "@/components/ReleaseTimeline";
import { ErrorBox } from "@/components/RepoHeader";
import { SetupGuide } from "@/components/SetupGuide";
import { getAuthStatus } from "@/lib/auth";
import { getBranchChanges, type BranchChanges } from "@/lib/changes";
import { getDeploymentMatrix, getRunningReleases } from "@/lib/data";
import { applyColumnOverride, type Matrix, type RunningRelease } from "@/lib/model";

export const dynamic = "force-dynamic";

export default async function DeploymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string; repo: string }>;
  searchParams: Promise<{ envs?: string }>;
}) {
  const { owner, repo } = await params;
  const auth = await getAuthStatus();
  if (!auth.ok) return <SetupGuide status={auth} />;
  const { envs } = await searchParams;

  let matrix: Matrix | undefined;
  let running: RunningRelease[] = [];
  let changes: BranchChanges | undefined;
  let error: unknown;
  try {
    [matrix, changes] = await Promise.all([
      getDeploymentMatrix(owner, repo),
      // Missing tags or history must not break the overview.
      getBranchChanges(owner, repo).catch(() => undefined),
    ]);
    matrix.columns = applyColumnOverride(matrix.columns, envs);
    // Missing Actions access must not break the overview.
    running = await getRunningReleases(owner, repo, matrix).catch(() => []);
  } catch (e) {
    error = e;
  }

  return (
    <>
      {error || !matrix ? (
        <ErrorBox error={error} />
      ) : (
        <>
          <PendingBanner matrix={matrix} />
          <RunningReleases runs={running} />
          <UntaggedChanges changes={changes} />
          <CurrentVersions matrix={matrix} />
          <MatrixTable matrix={matrix} firstColumn="Releases" owner={owner} repo={repo} />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Rows are grouped by tag/branch. A ring marks the version currently live in an environment. Reorder
            columns with <code className="rounded bg-gray-100 px-1 dark:bg-white/10">?envs=A-UI,UAT-UI,PAV-UI</code>.
          </p>
        </>
      )}
    </>
  );
}
