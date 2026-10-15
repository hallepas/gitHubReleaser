/* eslint-disable @next/next/no-img-element */
import { type Matrix, type MatrixRow, type PendingApproval, type RunningRelease, type StageStatus, formatDate, timeAgo } from "@/lib/model";
import { ApprovalControls } from "./ApprovalControls";
import { BranchIcon, ChevronRightIcon, ShieldIcon } from "./icons";
import { StageMenu } from "./StageMenu";
import { CountPill, IconBadge } from "./ui";

const VISIBLE_APPROVALS = 3;

function PendingRow({ p }: { p: PendingApproval }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2 text-sm">
      <span>
        Deploy{" "}
        {p.url ? (
          <a className="font-semibold text-brand-600 hover:underline dark:text-brand-300" href={p.url} target="_blank" rel="noreferrer">
            {p.rowTitle}
          </a>
        ) : (
          <b>{p.rowTitle}</b>
        )}{" "}
        to <span className="rounded-md bg-amber-400/15 px-1.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-200">{p.stage}</span>
      </span>
      <span className="ml-auto">{p.approval && <ApprovalControls approval={p.approval} release={p.rowTitle} compact />}</span>
    </div>
  );
}

export function PendingBanner({ matrix }: { matrix: Matrix }) {
  if (!matrix.pending.length) return null;
  return (
    <div className="card relative overflow-hidden border-amber-400/40 p-4 pl-5">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-amber-400 to-orange-500" />
      <div className="flex items-center gap-3">
        <IconBadge tone="amber" className="h-9 w-9 animate-glow rounded-full!">
          <ShieldIcon className="h-4 w-4" />
        </IconBadge>
        <div className="font-semibold">Approval required</div>
        <CountPill tone="amber">{matrix.pending.length}</CountPill>
      </div>
      <div className="mt-3 flex flex-col divide-y divide-(--line)">
        {matrix.pending.slice(0, VISIBLE_APPROVALS).map((p) => (
          <PendingRow key={`${p.rowTitle}-${p.stage}`} p={p} />
        ))}
      </div>
      {matrix.pending.length > VISIBLE_APPROVALS && (
        <details className="group mt-1">
          <summary className="cursor-pointer list-none py-1 text-xs font-medium text-amber-700 hover:underline dark:text-amber-300">
            <span className="group-open:hidden">Show {matrix.pending.length - VISIBLE_APPROVALS} more</span>
            <span className="hidden group-open:inline">Show less</span>
          </summary>
          <div className="flex flex-col divide-y divide-(--line) border-t border-(--line)">
            {matrix.pending.slice(VISIBLE_APPROVALS).map((p) => (
              <PendingRow key={`${p.rowTitle}-${p.stage}`} p={p} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export function RunningReleases({ runs }: { runs: RunningRelease[] }) {
  if (!runs.length) return null;
  return (
    <div data-live className="card relative overflow-hidden border-blue-500/30 p-4 pl-5">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-blue-500 to-cyan-400" />
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
        </span>
        In progress
      </div>
      <div className="flex flex-col gap-4">
        {runs.map((r) => {
          const pct = r.jobsTotal ? Math.round((r.jobsDone / r.jobsTotal) * 100) : 0;
          return (
            <div key={r.runId} className="flex items-center gap-3">
              {r.actor ? (
                <img src={r.actor.avatarUrl} alt={r.actor.login} title={r.actor.login} className="h-8 w-8 shrink-0 rounded-full ring-2 ring-blue-500/40" />
              ) : (
                <span className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2">
                  <a href={r.url} target="_blank" rel="noreferrer" className="font-semibold hover:text-blue-600 dark:hover:text-blue-300">
                    {r.title}
                  </a>
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-gray-500 dark:text-gray-400">
                    <BranchIcon className="h-3 w-3" />
                    {r.ref}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blue-500/15">
                    <div
                      className="running-stripes h-full rounded-full bg-linear-to-r from-blue-500 to-cyan-400 transition-[width] duration-700"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                    {r.jobsDone}/{r.jobsTotal} jobs
                  </span>
                </div>
                <div className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                  {r.status}
                  {r.currentJob && <> · {r.currentJob}</>} · started {r.startedAt}
                </div>
              </div>
              <span className="hidden max-w-48 text-right text-xs text-gray-500 md:block dark:text-gray-400">
                {r.deployed ? "Deploying – see its row below" : "Appears below once it deploys to its first stage"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Actor({ row, size = "h-9 w-9" }: { row: MatrixRow; size?: string }) {
  return row.actor ? (
    <img src={row.actor.avatarUrl} alt={row.actor.login} title={row.actor.login} className={`${size} shrink-0 rounded-full ring-2 ring-(--line)`} />
  ) : (
    <span className={`${size} shrink-0 rounded-full bg-gray-200 dark:bg-gray-700`} />
  );
}

export function MatrixTable({
  matrix,
  firstColumn,
  owner,
  repo,
}: {
  matrix: Matrix;
  firstColumn: string;
  owner: string;
  repo: string;
}) {
  if (!matrix.rows.length) {
    return <p className="card px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">Nothing found for this repository yet.</p>;
  }
  return (
    // Horizontal scrolling only on small screens: on large screens overflow must stay visible for the stage menus.
    <div className="card overflow-x-auto lg:overflow-visible">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <th className="rounded-tl-2xl border-b border-(--line) bg-gray-50/80 px-5 py-3 dark:bg-white/2">{firstColumn}</th>
            <th className="w-40 border-b border-(--line) bg-gray-50/80 px-4 py-3 dark:bg-white/2">Created</th>
            <th className="rounded-tr-2xl border-b border-(--line) bg-gray-50/80 px-4 py-3 dark:bg-white/2">
Stages
            </th>
          </tr>
        </thead>
        <tbody className="stagger">
          {matrix.rows.map((row) => (
            <tr key={row.key} className="group transition-colors hover:bg-brand-500/4 [&:last-child>td]:border-b-0">
              <td className="border-b border-(--line) px-5 py-3">
                <div className="flex items-center gap-3">
                  <Actor row={row} />
                  <div className="min-w-0">
                    {row.url ? (
                      <a href={row.url} target="_blank" rel="noreferrer" className="font-semibold text-gray-900 transition-colors hover:text-brand-600 dark:text-gray-100 dark:hover:text-brand-300">
                        {row.title}
                      </a>
                    ) : (
                      <span className="font-semibold">{row.title}</span>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-gray-500 dark:text-gray-400">
                      {row.subtitle && <span className="max-w-md truncate">{row.subtitle}</span>}
                      {row.refLabel &&
                        (row.refUrl ? (
                          <a href={row.refUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono hover:text-brand-600 dark:hover:text-brand-300">
                            <BranchIcon className="h-3 w-3" />
                            {row.refLabel}
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-mono">
                            <BranchIcon className="h-3 w-3" />
                            {row.refLabel}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap border-b border-(--line) px-4 py-3">
                <div className="font-medium text-gray-700 dark:text-gray-300">{timeAgo(row.createdAt)}</div>
                <div className="text-[11px] text-gray-400 tabular-nums dark:text-gray-500">{formatDate(row.createdAt)}</div>
              </td>
              <td className="border-b border-(--line) px-4 py-3">
                <div className={`flex flex-wrap items-center gap-1 ${matrix.columns.length <= 4 ? "xl:flex-nowrap" : ""}`}>
                  {matrix.columns.map((col, i) => (
                    <div key={col} className="flex items-center gap-1">
                      {i > 0 && <ChevronRightIcon className="h-3 w-3 text-gray-300 dark:text-gray-600" />}
                      <StageMenu owner={owner} repo={repo} name={col} cell={row.cells[col]} release={row.title} runId={row.runId} gitRef={row.ref} />
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ACCENT: Partial<Record<StageStatus, string>> = {
  success: "from-emerald-400 to-teal-500",
  superseded: "from-emerald-400 to-teal-500",
  failed: "from-rose-500 to-red-500",
  running: "from-blue-500 to-cyan-400",
  waiting: "from-amber-400 to-orange-500",
  queued: "from-blue-400 to-indigo-400",
};

/** One card per environment, left to right in promotion order, showing what is live and how far it lags behind. */
export function CurrentVersions({ matrix }: { matrix: Matrix }) {
  const current = matrix.columns.map((col) => {
    const index = matrix.rows.findIndex((r) => r.cells[col]?.current);
    return { col, index, row: index >= 0 ? matrix.rows[index] : undefined };
  });
  if (!current.some((c) => c.row)) return null;
  return (
    <div className="stagger flex flex-col gap-2 md:flex-row md:items-stretch">
      {current.map(({ col, row, index }, i) => {
        const cell = row?.cells[col];
        const prev = current[i - 1];
        let drift: { text: string; tone: "ok" | "warn" | "latest"; title: string } | undefined;
        if (row) {
          if (i === 0) {
            drift = index === 0
              ? { text: "Latest", tone: "latest", title: "The newest row is live here" }
              : { text: `${index} newer`, tone: "warn", title: `${index} newer ${index === 1 ? "row is" : "rows are"} not live here yet` };
          } else if (prev?.row) {
            const behind = index - prev.index;
            drift = behind > 0
              ? { text: `${behind} behind ${prev.col}`, tone: "warn", title: `${prev.col} runs ${behind} newer ${behind === 1 ? "version" : "versions"}` }
              : { text: `In sync with ${prev.col}`, tone: "ok", title: `Same version as ${prev.col} or newer` };
          }
        }
        return (
          <div key={col} className="flex flex-1 items-center gap-2 md:min-w-0">
            {i > 0 && <ChevronRightIcon className="hidden h-4 w-4 shrink-0 text-gray-300 md:block dark:text-gray-600" />}
            <div className="card relative flex-1 overflow-hidden p-4 md:min-w-0">
              <span aria-hidden className={`absolute inset-x-0 top-0 h-0.5 bg-linear-to-r ${ACCENT[cell?.status ?? "none"] ?? "from-gray-300 to-gray-400"}`} />
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{col}</span>
                {drift && (
                  <span
                    title={drift.title}
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      drift.tone === "warn"
                        ? "bg-amber-400/15 text-amber-700 dark:text-amber-300"
                        : drift.tone === "latest"
                          ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    {drift.text}
                  </span>
                )}
              </div>
              <div className="mt-2 truncate font-mono text-xl font-semibold tracking-tight" title={row?.refLabel}>
                {row ? (
                  row.url ? (
                    <a href={row.url} target="_blank" rel="noreferrer" className="hover:text-brand-600 dark:hover:text-brand-300">
                      {row.title}
                    </a>
                  ) : (
                    row.title
                  )
                ) : (
                  <span className="text-gray-300 dark:text-gray-600">—</span>
                )}
              </div>
              {row && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Actor row={row} size="h-5 w-5" />
                  <span className="truncate" title={formatDate(row.createdAt)}>
                    {timeAgo(row.createdAt)}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
