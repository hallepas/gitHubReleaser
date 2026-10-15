import { PullRequestList } from "@/components/PullRequestList";
import { ErrorBox } from "@/components/RepoHeader";
import { PullRequestIcon } from "@/components/icons";
import { EmptyState } from "@/components/ui";
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
    <div className="card">
      {error ? (
        <div className="p-4">
          <ErrorBox error={error} />
        </div>
      ) : pulls.length ? (
        <PullRequestList pulls={pulls} />
      ) : (
        <EmptyState icon={<PullRequestIcon className="h-5 w-5" />} title="No open pull requests">
          Everything is merged. Nice!
        </EmptyState>
      )}
    </div>
  );
}
