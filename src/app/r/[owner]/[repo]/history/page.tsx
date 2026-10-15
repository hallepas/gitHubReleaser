import { CurrentVersions, PendingBanner, RunningReleases } from "@/components/MatrixTable";
import { ReleaseTimeline } from "@/components/ReleaseTimeline";
import { ErrorBox } from "@/components/RepoHeader";
import { SetupGuide } from "@/components/SetupGuide";
import { getAuthStatus } from "@/lib/auth";
import { getBranchChanges, type BranchChanges } from "@/lib/changes";
import { getDeploymentMatrix, getRunningReleases } from "@/lib/data";
import { applyColumnOverride, type Matrix, type RunningRelease } from "@/lib/model";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string; repo: string }>;
  searchParams: Promise<{ envs?: string; branch?: string }>;
}) {
  const { owner, repo } = await params;
  const auth = await getAuthStatus();
  if (!auth.ok) return <SetupGuide status={auth} />;
  const { envs, branch } = await searchParams;

  let matrix: Matrix | undefined;
  let changes: BranchChanges | undefined;
  let running: RunningRelease[] = [];
  let error: unknown;
  try {
    [matrix, changes] = await Promise.all([getDeploymentMatrix(owner, repo), getBranchChanges(owner, repo, branch)]);
    matrix.columns = applyColumnOverride(matrix.columns, envs);
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
          <CurrentVersions matrix={matrix} />
          <ReleaseTimeline changes={changes} matrix={matrix} running={running} />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Every tag on {changes?.branch ?? "the default branch"} with the pull requests merged since the previous tag. A ring marks
            the version currently live in an environment. Show another branch with <code className="rounded bg-gray-100 px-1 dark:bg-white/10">?branch=release/1.x</code>.
          </p>
        </>
      )}
    </>
  );
}
