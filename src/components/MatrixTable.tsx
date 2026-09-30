/* eslint-disable @next/next/no-img-element */
import { type Matrix, type RunningRelease, formatDate } from "@/lib/model";
import { StageMenu } from "./StageMenu";
import { ApprovalControls } from "./ApprovalControls";

export function PendingBanner({ matrix }: { matrix: Matrix }) {
  if (!matrix.pending.length) return null;
  return (
    <div className="flex flex-col gap-1 border-y border-gray-200 bg-gray-50 px-6 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900">
      {matrix.pending.map((p) => (
        <div key={`${p.rowTitle}-${p.stage}`} className="flex items-center gap-2">
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-blue-600 text-[10px] font-bold text-blue-600 dark:border-blue-400 dark:text-blue-400">
            i
          </span>
          <span>
            Pending approval on <b>{p.stage}</b> stage for{" "}
            {p.url ? (
              <a className="text-blue-700 hover:underline dark:text-blue-400" href={p.url} target="_blank" rel="noreferrer">
                {p.rowTitle}
              </a>
            ) : (
              p.rowTitle
            )}
            .
          </span>
          {p.approval && <ApprovalControls approval={p.approval} release={p.rowTitle} compact />}
        </div>
      ))}
    </div>
  );
}

export function RunningReleases({ runs }: { runs: RunningRelease[] }) {
  if (!runs.length) return null;
  return (
    <div className="border-y border-blue-200 bg-blue-50/60 px-6 py-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-blue-900 dark:text-blue-200">In progress</div>
      <div className="flex flex-col gap-2">
        {runs.map((r) => (
          <div key={r.runId} className="flex items-center gap-3">
            <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-400 dark:border-t-transparent" aria-hidden />
            {r.actor && <img src={r.actor.avatarUrl} alt={r.actor.login} title={r.actor.login} className="h-6 w-6 rounded-full" />}
            <div className="min-w-0 flex-1">
              <a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline dark:text-blue-400">
                {r.title}
              </a>
              <span className="ml-2 font-mono text-xs text-gray-600 dark:text-gray-400">⑂ {r.ref}</span>
              <div className="truncate text-xs text-gray-600 dark:text-gray-400">
                {r.status}
                {r.currentJob && <> · {r.currentJob}</>} · {r.jobsDone}/{r.jobsTotal} jobs done · started {r.startedAt}
              </div>
            </div>
            <span className="hidden text-xs text-gray-500 sm:block dark:text-gray-400">Appears below once it deploys to its first stage</span>
          </div>
        ))}
      </div>
    </div>
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
    return <p className="px-6 py-10 text-sm text-gray-500 dark:text-gray-400">Nothing found for this repository yet.</p>;
  }
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <th className="px-6 py-3 font-normal">{firstColumn}</th>
          <th className="w-48 px-4 py-3 font-normal">Created</th>
          <th className="px-4 py-3 font-normal">Stages</th>
        </tr>
      </thead>
      <tbody>
        {matrix.rows.map((row) => (
          <tr key={row.key} className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-gray-900">
            <td className="px-6 py-3">
              <div className="flex items-center gap-3">
                {row.actor ? (
                  <img src={row.actor.avatarUrl} alt={row.actor.login} title={row.actor.login} className="h-8 w-8 rounded-full" />
                ) : (
                  <span className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                )}
                <div className="min-w-0">
                  {row.url ? (
                    <a href={row.url} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline dark:text-blue-400">
                      {row.title}
                    </a>
                  ) : (
                    <span className="font-medium">{row.title}</span>
                  )}
                  <div className="flex flex-wrap gap-x-4 text-xs text-gray-600 dark:text-gray-400">
                    {row.subtitle && <span className="max-w-md truncate">{row.subtitle}</span>}
                    {row.refLabel &&
                      (row.refUrl ? (
                        <a href={row.refUrl} target="_blank" rel="noreferrer" className="font-mono hover:underline">
                          ⑂ {row.refLabel}
                        </a>
                      ) : (
                        <span className="font-mono">⑂ {row.refLabel}</span>
                      ))}
                  </div>
                </div>
              </div>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-gray-700 dark:text-gray-300">{formatDate(row.createdAt)}</td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {matrix.columns.map((col) => (
                  <StageMenu
                    key={col}
                    owner={owner}
                    repo={repo}
                    name={col}
                    cell={row.cells[col]}
                    release={row.title}
                    runId={row.runId}
                    gitRef={row.ref}
                  />
                ))}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CurrentVersions({ matrix }: { matrix: Matrix }) {
  const current = matrix.columns.map((col) => ({
    col,
    row: matrix.rows.find((r) => r.cells[col]?.current),
  }));
  if (!current.some((c) => c.row)) return null;
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-3 px-6 py-4">
      {current.map(({ col, row }) => (
        <div key={col} className="rounded border border-gray-200 p-3 dark:border-gray-800">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{col}</div>
          <div className="mt-1 truncate font-mono text-sm" title={row?.refLabel}>
            {row ? row.title : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}
