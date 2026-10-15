import { type StageCell, type StageStatus } from "@/lib/model";

export const STYLES: Record<StageStatus, string> = {
  success: "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  superseded: "border-(--line) bg-(--surface-solid) text-gray-600 dark:text-gray-300",
  failed: "border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200",
  running: "running-stripes border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-600/30",
  waiting: "border-amber-400/60 bg-amber-400/15 text-amber-900 dark:text-amber-200",
  queued: "border-blue-400/40 bg-blue-500/10 text-blue-800 dark:text-blue-200",
  cancelled: "border-(--line) bg-gray-100 text-gray-500 line-through dark:bg-white/5 dark:text-gray-400",
  skipped: "border-dashed border-(--line) bg-transparent text-gray-400 dark:text-gray-500",
  none: "border-dashed border-gray-300 bg-transparent text-gray-500 dark:border-gray-700 dark:text-gray-400",
};

export function Icon({ status }: { status: StageStatus }) {
  switch (status) {
    case "success":
    case "superseded":
      return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 fill-emerald-600 dark:fill-emerald-400" aria-hidden>
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm3.28 5.22a.75.75 0 0 0-1.06 0L7 8.44 5.78 7.22a.75.75 0 0 0-1.06 1.06l1.75 1.75a.75.75 0 0 0 1.06 0l3.75-3.75a.75.75 0 0 0 0-1.06Z" />
        </svg>
      );
    case "failed":
      return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 fill-rose-600 dark:fill-rose-400" aria-hidden>
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm2.53 4.47a.75.75 0 0 0-1.06 0L8 5.94 6.53 4.47a.75.75 0 0 0-1.06 1.06L6.94 7 5.47 8.47a.75.75 0 1 0 1.06 1.06L8 8.06l1.47 1.47a.75.75 0 1 0 1.06-1.06L9.06 7l1.47-1.47a.75.75 0 0 0 0-1.06Z" />
        </svg>
      );
    case "running":
      return <span data-live className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />;
    case "waiting":
      return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 fill-amber-500 dark:fill-amber-400" aria-hidden>
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm.75 3.5a.75.75 0 0 0-1.5 0V8c0 .2.08.39.22.53l2.5 2.5a.75.75 0 1 0 1.06-1.06L8.75 7.69Z" />
        </svg>
      );
    default:
      return <span className="h-3 w-3 shrink-0 rounded-full border border-current" aria-hidden />;
  }
}

export function StageChip({
  cell,
  name,
  onClick,
}: {
  cell?: StageCell;
  name: string;
  onClick?: () => void;
}) {
  const c: StageCell = cell ?? { status: "none", label: name, tooltip: `${name}: Not run` };
  const className = `relative flex h-7 w-36 items-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition-all ${STYLES[c.status]} ${
    c.current ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-(--surface-solid) dark:ring-emerald-400" : ""
  }`;
  const content = (
    <>
      <Icon status={c.status} />
      <span className="truncate">{c.label}</span>
      {c.current && (
        <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5" title="Live in this environment">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-(--surface-solid) bg-emerald-500" />
        </span>
      )}
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={c.tooltip}
        className={`${className} cursor-pointer hover:-translate-y-px hover:shadow-md hover:brightness-[0.97] dark:hover:brightness-125`}
      >
        {content}
        <svg viewBox="0 0 24 24" className="ml-auto h-3 w-3 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    );
  }
  return c.url ? (
    <a href={c.url} target="_blank" rel="noreferrer" title={c.tooltip} className={`${className} hover:-translate-y-px hover:shadow-md hover:brightness-[0.97] dark:hover:brightness-125`}>
      {content}
    </a>
  ) : (
    <span title={c.tooltip} className={className}>
      {content}
    </span>
  );
}
