/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { formatDate, type PullRequest, type StageStatus } from "@/lib/model";
import { PullRequestActions } from "./PullRequestActions";
import { BranchIcon, ExternalIcon } from "./icons";
import { RepoAvatar } from "./RepoAvatar";
import { Icon, STYLES } from "./StageChip";

const TONES = {
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  red: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  gray: "border-(--line) bg-gray-100/60 text-gray-600 dark:bg-white/5 dark:text-gray-400",
  violet: "border-brand-500/30 bg-brand-500/10 text-brand-700 dark:text-brand-300",
};

function Badge({ tone, children, title }: { tone: keyof typeof TONES; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium ${TONES[tone]}`}>
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
    <span className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium ${STYLES[status]}`}>
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
  if (pr.isDraft || pr.state !== "OPEN") return null;
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
    <ul className="stagger divide-y divide-(--line)">
      {pulls.map((pr) => (
        <li
          key={`${pr.owner}/${pr.repo}#${pr.number}`}
          className="flex flex-col gap-3 px-5 py-4 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-gray-50/80 lg:flex-row lg:items-start dark:hover:bg-white/3"
        >
          <div className="flex min-w-0 flex-1 gap-3">
            {pr.author ? (
              <img src={pr.author.avatarUrl} alt={pr.author.login} title={pr.author.login} className="h-9 w-9 shrink-0 rounded-full ring-2 ring-(--line)" />
            ) : (
              <span className="h-9 w-9 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/r/${pr.owner}/${pr.repo}/pulls/${pr.number}`}
                  className="font-medium text-gray-900 transition-colors hover:text-brand-600 dark:text-gray-100 dark:hover:text-brand-300"
                >
                  <span className="font-normal text-gray-400 dark:text-gray-500">#{pr.number}</span> {pr.title}
                </Link>
                <a href={pr.url} target="_blank" rel="noreferrer" title="Open on GitHub" className="text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-gray-200">
                  <ExternalIcon className="h-3.5 w-3.5" />
                </a>
                {pr.state === "MERGED" && <Badge tone="violet">Merged</Badge>}
                {pr.state === "CLOSED" && <Badge tone="red">Closed</Badge>}
                {pr.isDraft && <Badge tone="gray">Draft</Badge>}
                {pr.labels.map((l) => {
                  const color = /^[0-9a-f]{6}$/i.test(l.color) ? `#${l.color}` : undefined;
                  return (
                    <span
                      key={l.name}
                      className="rounded-full border px-2 text-[11px] font-medium"
                      style={color ? { borderColor: color, backgroundColor: `${color}33` } : undefined}
                    >
                      {l.name}
                    </span>
                  );
                })}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                {showRepo && (
                  <Link href={`/r/${pr.owner}/${pr.repo}/pulls`} className="inline-flex items-center gap-1.5 font-medium text-gray-700 hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-300">
                    <RepoAvatar repo={`${pr.owner}/${pr.repo}`} size="sm" />
                    {pr.repo}
                  </Link>
                )}
                {pr.author && <span>{pr.author.login}</span>}
                <span className="inline-flex min-w-0 max-w-full items-center gap-1 font-mono" title={`${pr.baseRef} ← ${pr.headRef}`}>
                  <BranchIcon className="h-3 w-3" />
                  <span className="truncate">
                    {pr.baseRef} ← {pr.fromFork ? "fork:" : ""}
                    {pr.headRef}
                  </span>
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
          {pr.state === "OPEN" && <PullRequestActions pr={pr} />}
        </li>
      ))}
    </ul>
  );
}
