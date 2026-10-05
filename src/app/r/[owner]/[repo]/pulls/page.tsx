import { PullRequestList } from "@/components/PullRequestList";
import { ErrorBox, RepoHeader } from "@/components/RepoHeader";
import { SetupGuide } from "@/components/SetupGuide";
import { getAuthStatus } from "@/lib/auth";
import type { PullRequest } from "@/lib/model";
import { getOpenPullRequests } from "@/lib/pulls";

export const dynamic = "force-dynamic";

export default async function PullsPage({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = await params;
  const auth = await getAuthStatus();
  if (!auth.ok) return <SetupGuide status={auth} />;

  let pulls: PullRequest[] = [];
  let error: unknown;
  try {
    pulls = await getOpenPullRequests(owner, repo);
  } catch (e) {
    error = e;
  }

  return (
    <main>
      <RepoHeader owner={owner} repo={repo} active="pulls" auth={auth} />
      {error ? (
        <ErrorBox error={error} />
      ) : pulls.length ? (
        <PullRequestList pulls={pulls} />
      ) : (
        <p className="px-6 py-10 text-sm text-gray-500 dark:text-gray-400">No open pull requests.</p>
      )}
    </main>
  );
}
