import { RepoLists } from "@/components/RepoLists";
import { RepoPicker } from "@/components/RepoPicker";
import { getAllRepos } from "@/lib/repos";

export const dynamic = "force-dynamic";

export default function Home() {
  // Warm the repository cache so the search box is ready immediately.
  getAllRepos().catch(() => {});
  const suggested = (process.env.DASHBOARD_REPOS ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter((r) => /^[\w.-]+\/[\w.-]+$/.test(r));

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Release Dashboard</h1>
      <p className="mt-1 text-sm text-gray-600">
        Azure DevOps–style release overview for GitHub environments, deployments and workflow runs.
      </p>
      <div className="mt-8">
        <RepoPicker autoFocus />
      </div>
      <RepoLists suggested={suggested} />
    </main>
  );
}
