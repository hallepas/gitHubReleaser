import Link from "next/link";
import { notFound } from "next/navigation";
import { PullRequestFiles } from "@/components/PullRequestFiles";
import { PullRequestList } from "@/components/PullRequestList";
import { ErrorBox } from "@/components/RepoHeader";
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
    <>
      <Link
        href={`/r/${owner}/${repo}/pulls`}
        className="inline-flex items-center gap-1 self-start text-xs font-medium text-gray-500 transition-colors hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-300"
      >
        ← All pull requests
      </Link>
      {error ? (
        <ErrorBox error={error} />
      ) : data ? (
        <>
          <div className="card">
            <PullRequestList pulls={[data.pr]} />
            {data.body.trim() && (
              <div className="whitespace-pre-wrap border-t border-(--line) px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{data.body}</div>
            )}
          </div>
          <PullRequestFiles files={files} />
        </>
      ) : (
        <p className="card px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">Pull request #{number} not found.</p>
      )}
    </>
  );
}
