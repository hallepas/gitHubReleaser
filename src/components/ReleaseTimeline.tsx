/* eslint-disable @next/next/no-img-element */
import type { BranchChanges, BranchSegment, ChangePullRequest } from "@/lib/changes";
import { type Matrix, type MatrixRow, type RunningRelease, type StageCell, formatDate } from "@/lib/model";
import { StageChip } from "./StageChip";

function PullRequestLinks({ pulls, fallback }: { pulls: ChangePullRequest[]; fallback?: string }) {
  if (!pulls.length) {
    return fallback ? <div className="truncate text-xs text-gray-600 dark:text-gray-400">{fallback}</div> : null;
  }
  return (
    <ul className="flex flex-col gap-0.5 text-xs">
      {pulls.map((pr) => (
        <li key={pr.number} className="truncate" title={pr.title}>
          <a href={pr.url} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline dark:text-blue-400">
            #{pr.number}
          </a>{" "}
          <span className="text-gray-800 dark:text-gray-200">{pr.title}</span>
          {pr.author && <span className="text-gray-500 dark:text-gray-400"> · {pr.author}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Shows whether the default branch has changes that no tag contains yet. */
export function UntaggedChanges({ changes }: { changes?: BranchChanges }) {
  // Repositories that don't release with tags have nothing to compare against.
  if (!changes?.latestTag) return null;
  const { branch, latestTag, untagged, repoUrl } = changes;
  if (!untagged.commits) {
    return (
      <div className="px-6 pt-2 text-xs text-gray-600 dark:text-gray-400">
        <span className="font-mono">⑂ {branch}</span> is at tag <b className="font-mono">{latestTag}</b>. Nothing new to release.
      </div>
    );
  }
  return (
    <div className="mx-6 mt-3 rounded border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm dark:border-amber-800 dark:bg-amber-950/40">
      <div>
        <span className="font-mono">⑂ {branch}</span> has <b>{untagged.commits}</b> {untagged.commits === 1 ? "commit" : "commits"} not in
        any tag yet{latestTag ? (
          <>
            {" "}
            (newer than{" "}
            <a href={`${repoUrl}/compare/${encodeURIComponent(latestTag)}...${encodeURIComponent(branch)}`} target="_blank" rel="noreferrer" className="font-mono font-semibold hover:underline">
              {latestTag}
            </a>
            )
          </>
        ) : null}
        . Use <b>New tag</b> to release {untagged.pullRequests.length === 1 ? "it" : "them"}.
      </div>
      <div className="mt-1">
        <PullRequestLinks pulls={untagged.pullRequests} fallback={`${untagged.headline} (${untagged.sha.slice(0, 7)})`} />
      </div>
    </div>
  );
}

interface Entry {
  key: string;
  date: string;
  segment?: BranchSegment;
  /** Deployed refs that are not part of the branch history (e.g. previews from feature branches). */
  row?: MatrixRow;
  previousTag?: string;
  cells: Record<string, StageCell>;
  actor?: MatrixRow["actor"];
}

/** Picks per environment the cell of any tag on the same commit, preferring the live one. */
function mergeCells(rows: MatrixRow[]): Record<string, StageCell> {
  const cells: Record<string, StageCell> = {};
  for (const row of rows) {
    for (const [env, cell] of Object.entries(row.cells)) {
      if (!cells[env] || (cell.current && !cells[env].current)) cells[env] = { ...cell, label: env };
    }
  }
  return cells;
}

function buildEntries(changes: BranchChanges | undefined, matrix: Matrix): Entry[] {
  const byRef = new Map(matrix.rows.map((r) => [r.ref, r]));
  const used = new Set<string>();
  const entries: Entry[] = [];

  if (changes) {
    changes.tags.forEach((segment, i) => {
      const rows = [segment.tag!, ...segment.otherTags].flatMap((t) => (byRef.has(t) ? [byRef.get(t)!] : []));
      rows.forEach((r) => used.add(r.key));
      entries.push({
        key: `tag-${segment.tag}`,
        date: segment.date,
        segment,
        previousTag: changes.tags[i + 1]?.tag,
        cells: mergeCells(rows),
        actor: rows[0]?.actor,
      });
    });
  }
  for (const row of matrix.rows) {
    if (used.has(row.key)) continue;
    entries.push({ key: `row-${row.key}`, date: row.createdAt, row, cells: row.cells, actor: row.actor });
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

export function ReleaseTimeline({
  changes,
  matrix,
  running = [],
}: {
  changes?: BranchChanges;
  matrix: Matrix;
  running?: RunningRelease[];
}) {
  const entries = buildEntries(changes, matrix);
  const repoUrl = changes?.repoUrl;
  const untagged = changes?.untagged;

  const dot = (className: string) => (
    <span className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-gray-950 ${className}`} />
  );

  return (
    <div className="px-6 py-4">
      <ol className="relative ml-2 border-l border-gray-200 dark:border-gray-800">
        {changes && untagged && untagged.commits > 0 && (
          <li className="relative pb-6 pl-6">
            {dot("bg-amber-500")}
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-semibold">Not tagged yet</span>
              <span className="font-mono text-xs text-gray-600 dark:text-gray-400">⑂ {changes.branch}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {untagged.commits} {untagged.commits === 1 ? "commit" : "commits"} since {changes.latestTag ?? "the beginning"} · last{" "}
                {formatDate(untagged.date)}
              </span>
            </div>
            <div className="mt-1.5">
              <PullRequestLinks pulls={untagged.pullRequests} fallback={untagged.headline} />
            </div>
          </li>
        )}
        {entries.map((e) => {
          const seg = e.segment;
          const title = seg?.tag ?? e.row?.title ?? "";
          const preview = seg ? seg.preview : /-/.test(title);
          const stages = matrix.columns.filter((c) => e.cells[c]);
          const run = running.find((r) => r.ref === title);
          return (
            <li key={e.key} className="relative pb-6 pl-6">
              {dot(seg ? (preview ? "bg-violet-500" : "bg-blue-600") : "bg-gray-400")}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {e.actor && <img src={e.actor.avatarUrl} alt={e.actor.login} title={e.actor.login} className="h-5 w-5 rounded-full" />}
                <a
                  href={repoUrl && seg ? `${repoUrl}/tree/${encodeURIComponent(title)}` : e.row?.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-semibold text-blue-700 hover:underline dark:text-blue-400"
                >
                  {title}
                </a>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                    preview
                      ? "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                  }`}
                >
                  {preview ? "Preview" : "Release"}
                </span>
                {seg && seg.otherTags.length > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">also tagged {seg.otherTags.join(", ")}</span>
                )}
                {seg ? (
                  <span className="font-mono text-xs text-gray-600 dark:text-gray-400">⑂ {changes!.branch} @ {seg.sha.slice(0, 7)}</span>
                ) : (
                  <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                    ⑂ {e.row?.refLabel}
                    {changes && !changes.truncated && <span className="font-sans"> · not on {changes.branch}</span>}
                  </span>
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(e.date)}</span>
                {seg && e.previousTag && repoUrl && (
                  <a
                    href={`${repoUrl}/compare/${encodeURIComponent(e.previousTag)}...${encodeURIComponent(seg.tag!)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-700 hover:underline dark:text-blue-400"
                  >
                    Changes since {e.previousTag} ({seg.commits} {seg.commits === 1 ? "commit" : "commits"})
                  </a>
                )}
              </div>
              <div className="mt-1.5">
                {seg ? <PullRequestLinks pulls={seg.pullRequests} fallback={seg.headline} /> : (
                  <div className="truncate text-xs text-gray-600 dark:text-gray-400">{e.row?.subtitle}</div>
                )}
              </div>
              {stages.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {stages.map((c) => (
                    <StageChip key={c} name={c} cell={e.cells[c]} />
                  ))}
                </div>
              ) : run ? (
                <a href={run.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-700 hover:underline dark:text-blue-400">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                  Release run in progress ({run.jobsDone}/{run.jobsTotal} jobs)
                </a>
              ) : (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">No deployments found</div>
              )}
            </li>
          );
        })}
      </ol>
      {changes?.truncated && (
        <p className="text-xs text-gray-500 dark:text-gray-400">Only the last 100 commits of {changes.branch} are shown.</p>
      )}
    </div>
  );
}
