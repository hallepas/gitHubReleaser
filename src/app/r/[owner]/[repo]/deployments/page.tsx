import { CurrentVersions, MatrixTable, PendingBanner } from "@/components/MatrixTable";
import { ErrorBox, RepoHeader } from "@/components/RepoHeader";
import { SetupGuide } from "@/components/SetupGuide";
import { getAuthStatus } from "@/lib/auth";
import { getDeploymentMatrix } from "@/lib/data";
import { applyColumnOverride, type Matrix } from "@/lib/model";

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
  let error: unknown;
  try {
    matrix = await getDeploymentMatrix(owner, repo);
    matrix.columns = applyColumnOverride(matrix.columns, envs);
  } catch (e) {
    error = e;
  }

  return (
    <main>
      <RepoHeader owner={owner} repo={repo} active="deployments" auth={auth} />
      {error || !matrix ? (
        <ErrorBox error={error} />
      ) : (
        <>
          <PendingBanner matrix={matrix} />
          <CurrentVersions matrix={matrix} />
          <MatrixTable matrix={matrix} firstColumn="Releases" owner={owner} repo={repo} />
          <p className="px-6 py-4 text-xs text-gray-500">
            Rows are grouped by tag/branch. A ring marks the version currently live in an environment. Reorder
            columns with <code>?envs=A-UI,UAT-UI,PAV-UI</code>.
          </p>
        </>
      )}
    </main>
  );
}
