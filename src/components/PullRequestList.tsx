/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { formatDate, type PullRequest, type StageStatus } from "@/lib/model";
import { PullRequestActions } from "./PullRequestActions";
import { Icon, STYLES } from "./StageChip";

const TONES = {
  green: "border-green-700 text-green-800 dark:border-green-600 dark:text-green-300",
  red: "border-red-700 text-red-800 dark:border-red-600 dark:text-red-300",
  amber: "border-amber-600 text-amber-800 dark:border-amber-500 dark:text-amber-300",
  gray: "border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400",
};

function Badge({ tone, children, title }: { tone: keyof typeof TONES; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex h-6 items-center rounded border px-2 text-xs ${TONES[tone]}`}>
      {children}
    </span>
  );
}

const CHECKS_TEXT: Record<StageStatus, string> = {
  success: "Checks passed",
  failed: "Checks failed",
  running: "Checks running",
  queued: "Checks expected",
  waiting: "Checks waiting",
  superseded: "Checks passed",
  cancelled: "Checks cancelled",
  skipped: "Checks skipped",
  none: "No checks",
};

function Checks({ status }: { status: StageStatus }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 rounded border px-2 text-xs ${STYLES[status]}`}>
      <Icon status={status} />
      {CHECKS_TEXT[status]}
    </span>
  );
}

function Review({ pr }: { pr: PullRequest }) {
  const byYou = pr.viewerReview === pr.reviewDecision ? " (by you)" : "";
  switch (pr.reviewDecision) {
    case "APPROVED":
      return <Badge tone="green">✓ Approved{byYou}</Badge>;
    case "CHANGES_REQUESTED":
      return <Badge tone="red">Changes requested{byYou}</Badge>;
    case "REVIEW_REQUIRED":
      return <Badge tone="amber">Review required</Badge>;
    default:
      return null;
  }
}

function Mergeability({ pr }: { pr: PullRequest }) {
  if (pr.isDraft) return null;
  if (pr.mergeable === "CONFLICTING") return <Badge tone="red">Conflicts</Badge>;
  switch (pr.mergeState) {
    case "CLEAN":
    case "HAS_HOOKS":
      return <Badge tone="green">Ready to merge</Badge>;
    case "BEHIND":
      return <Badge tone="amber" title={`The branch is behind ${pr.baseRef}`}>Behind {pr.baseRef}</Badge>;
    case "BLOCKED":
      return <Badge tone="amber" title="Branch protection rules are not satisfied yet">Blocked</Badge>;
    case "UNSTABLE":
      return <Badge tone="amber" title="Mergeable, but some checks are not passing">Unstable</Badge>;
    case "UNKNOWN":
      return <Badge tone="gray">Checking mergeability…</Badge>;
    default:
      return null;
  }
}

export function PullRequestList({ pulls, showRepo = false }: { pulls: PullRequest[]; showRepo?: boolean }) {
  return (
    <ul className="divide-y divide-gray-100 border-y border-gray-200 dark:divide-gray-800/60 dark:border-gray-800">
      {pulls.map((pr) => (
        <li
          key={`${pr.owner}/${pr.repo}#${pr.number}`}
          className={`flex flex-col gap-3 py-3 hover:bg-gray-50 lg:flex-row lg:items-start dark:hover:bg-gray-900 ${showRepo ? "px-4" : "px-6"}`}
        >
          <div className="flex min-w-0 flex-1 gap-3">
            {pr.author ? (
              <img src={pr.author.avatarUrl} alt={pr.author.login} title={pr.author.login} className="h-8 w-8 shrink-0 rounded-full" />
            ) : (
              <span className="h-8 w-8 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <a href={pr.url} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline dark:text-blue-400">
                  #{pr.number} {pr.title}
                </a>
                {pr.isDraft && <Badge tone="gray">Draft</Badge>}
                {pr.labels.map((l) => {
                  const color = /^[0-9a-f]{6}$/i.test(l.color) ? `#${l.color}` : undefined;
                  return (
                    <span
                      key={l.name}
                      className="rounded-full border px-2 text-xs"
                      style={color ? { borderColor: color, backgroundColor: `${color}33` } : undefined}
                    >
                      {l.name}
                    </span>
                  );
                })}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-gray-600 dark:text-gray-400">
                {showRepo && (
                  <Link href={`/r/${pr.owner}/${pr.repo}/pulls`} className="hover:underline">
                    {pr.owner}/{pr.repo}
                  </Link>
                )}
                {pr.author && <span>{pr.author.login}</span>}
                <span className="font-mono">
                  {pr.baseRef} ← {pr.fromFork ? "fork:" : ""}
                  {pr.headRef}
                </span>
                <span>updated {formatDate(pr.updatedAt)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Checks status={pr.checks} />
                <Review pr={pr} />
                <Mergeability pr={pr} />
              </div>
            </div>
          </div>
          <PullRequestActions pr={pr} />
        </li>
      ))}
    </ul>
  );
}
