import { RepoLists } from "@/components/RepoLists";
import { RepoPicker } from "@/components/RepoPicker";
import { AuthWarnings, SetupGuide } from "@/components/SetupGuide";
import { SignedInAs } from "@/components/SignedInAs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getAuthStatus } from "@/lib/auth";
import { getAllRepos } from "@/lib/repos";

export const dynamic = "force-dynamic";

export default async function Home() {
  const auth = await getAuthStatus();
  if (!auth.ok) {
    return (
      <main>
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 pt-12">
          <h1 className="text-2xl font-semibold">Release Dashboard</h1>
          <ThemeToggle />
        </div>
        <SetupGuide status={auth} />
      </main>
    );
  }
  // Warm the repository cache so the search box is ready immediately.
  getAllRepos().catch(() => {});
  const suggested = (process.env.DASHBOARD_REPOS ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter((r) => /^[\w.-]+\/[\w.-]+$/.test(r));

  return (
    <main>
      <AuthWarnings warnings={auth.warnings} />
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Release Dashboard</h1>
        <div className="flex items-center gap-3">
          <SignedInAs status={auth} />
          <ThemeToggle />
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Azure DevOps–style release overview for GitHub environments, deployments and workflow runs.
      </p>
      <div className="mt-8">
        <RepoPicker autoFocus />
      </div>
      <RepoLists suggested={suggested} />
      </div>
    </main>
  );
}
