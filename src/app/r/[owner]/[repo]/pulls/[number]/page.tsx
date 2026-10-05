import Link from "next/link";
import { notFound } from "next/navigation";
import { PullRequestFiles } from "@/components/PullRequestFiles";
import { PullRequestList } from "@/components/PullRequestList";
import { ErrorBox, RepoHeader } from "@/components/RepoHeader";
import { SetupGuide } from "@/components/SetupGuide";
import { getAuthStatus } from "@/lib/auth";
import type { PullFile } from "@/lib/model";
import { getPullRequest, getPullRequestFiles } from "@/lib/pulls";

export const dynamic = "force-dynamic";

export default async function PullRequestPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string; number: string }>;
}) {
  const { owner, repo, number: raw } = await params;
  const number = Number(raw);
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo) || !Number.isSafeInteger(number) || number <= 0) notFound();
  const auth = await getAuthStatus();
  if (!auth.ok) return <SetupGuide status={auth} />;

  let data: Awaited<ReturnType<typeof getPullRequest>> = null;
  let files: PullFile[] = [];
  let error: unknown;
  try {
    [data, files] = await Promise.all([getPullRequest(owner, repo, number), getPullRequestFiles(owner, repo, number)]);
  } catch (e) {
    error = e;
  }

  return (
    <main>
      <RepoHeader owner={owner} repo={repo} active="pulls" auth={auth} />
      <div className="px-6 pb-3 pt-4">
        <Link href={`/r/${owner}/${repo}/pulls`} className="text-xs text-gray-500 hover:underline dark:text-gray-400">
          ← All pull requests
        </Link>
      </div>
      {error ? (
        <ErrorBox error={error} />
      ) : data ? (
        <>
          <PullRequestList pulls={[data.pr]} />
          {data.body.trim() && (
            <div className="whitespace-pre-wrap border-b border-gray-200 px-6 py-4 text-sm text-gray-800 dark:border-gray-800 dark:text-gray-200">
              {data.body}
            </div>
          )}
          <PullRequestFiles files={files} />
        </>
      ) : (
        <p className="px-6 py-10 text-sm text-gray-500 dark:text-gray-400">Pull request #{number} not found.</p>
      )}
    </main>
  );
}
