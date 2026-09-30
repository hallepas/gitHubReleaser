import { type StageCell, type StageStatus } from "@/lib/model";

const STYLES: Record<StageStatus, string> = {
  success: "border-green-700 bg-green-100 text-green-900",
  superseded: "border-gray-300 bg-white text-gray-700",
  failed: "border-red-700 bg-red-100 text-red-900",
  running: "border-blue-600 bg-blue-600 text-white",
  waiting: "border-blue-600 bg-blue-600 text-white",
  queued: "border-blue-300 bg-blue-50 text-blue-900",
  cancelled: "border-gray-400 bg-gray-100 text-gray-600 line-through",
  skipped: "border-gray-200 bg-white text-gray-400",
  none: "border-gray-300 bg-white text-gray-500",
};

function Icon({ status }: { status: StageStatus }) {
  switch (status) {
    case "success":
    case "superseded":
      return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 fill-green-700" aria-hidden>
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm3.28 5.22a.75.75 0 0 0-1.06 0L7 8.44 5.78 7.22a.75.75 0 0 0-1.06 1.06l1.75 1.75a.75.75 0 0 0 1.06 0l3.75-3.75a.75.75 0 0 0 0-1.06Z" />
        </svg>
      );
    case "failed":
      return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 fill-red-700" aria-hidden>
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm2.53 4.47a.75.75 0 0 0-1.06 0L8 5.94 6.53 4.47a.75.75 0 0 0-1.06 1.06L6.94 7 5.47 8.47a.75.75 0 1 0 1.06 1.06L8 8.06l1.47 1.47a.75.75 0 1 0 1.06-1.06L9.06 7l1.47-1.47a.75.75 0 0 0 0-1.06Z" />
        </svg>
      );
    case "running":
      return <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />;
    case "waiting":
      return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 fill-white" aria-hidden>
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
  const className = `flex h-7 w-32 items-center gap-1.5 rounded border px-2 text-xs ${STYLES[c.status]} ${
    c.current ? "ring-2 ring-green-600 ring-offset-1" : ""
  }`;
  const content = (
    <>
      <Icon status={c.status} />
      <span className="truncate">{c.label}</span>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} title={c.tooltip} className={`${className} cursor-pointer hover:brightness-95`}>
        {content}
        <span className="ml-auto text-[10px]">▾</span>
      </button>
    );
  }
  return c.url ? (
    <a href={c.url} target="_blank" rel="noreferrer" title={c.tooltip} className={`${className} hover:brightness-95`}>
      {content}
    </a>
  ) : (
    <span title={c.tooltip} className={className}>
      {content}
    </span>
  );
}
