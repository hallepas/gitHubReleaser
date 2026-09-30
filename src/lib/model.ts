export type StageStatus =
  | "success"
  | "superseded"
  | "failed"
  | "running"
  | "waiting"
  | "queued"
  | "cancelled"
  | "skipped"
  | "none";

export interface Approval {
  owner: string;
  repo: string;
  runId: number;
  runUrl: string;
  environmentId: number;
  environment: string;
  canApprove: boolean;
  reviewers: string[];
}

export interface StageCell {
  status: StageStatus;
  label: string;
  url?: string;
  tooltip?: string;
  current?: boolean;
  approval?: Approval;
}

export interface MatrixRow {
  key: string;
  title: string;
  url?: string;
  subtitle?: string;
  refLabel?: string;
  refUrl?: string;
  actor?: { login: string; avatarUrl: string };
  createdAt: string;
  cells: Record<string, StageCell>;
}

export interface PendingApproval {
  stage: string;
  rowTitle: string;
  url?: string;
  approval?: Approval;
}

export interface Matrix {
  columns: string[];
  rows: MatrixRow[];
  pending: PendingApproval[];
}

export function deploymentStatus(state: string | undefined): StageStatus {
  switch ((state ?? "").toUpperCase()) {
    case "SUCCESS":
    case "ACTIVE":
      return "success";
    case "INACTIVE":
      return "superseded";
    case "FAILURE":
    case "ERROR":
      return "failed";
    case "IN_PROGRESS":
      return "running";
    case "WAITING":
      return "waiting";
    case "PENDING":
    case "QUEUED":
      return "queued";
    case "ABANDONED":
    case "DESTROYED":
      return "cancelled";
    default:
      return "none";
  }
}

export function jobStatus(status: string, conclusion: string | null): StageStatus {
  if (status === "completed") {
    switch (conclusion) {
      case "success":
      case "neutral":
        return "success";
      case "failure":
      case "timed_out":
      case "startup_failure":
        return "failed";
      case "cancelled":
        return "cancelled";
      case "skipped":
        return "skipped";
      case "action_required":
        return "waiting";
      default:
        return "none";
    }
  }
  if (status === "in_progress") return "running";
  if (status === "waiting") return "waiting";
  return "queued";
}

export const STATUS_TEXT: Record<StageStatus, string> = {
  success: "Succeeded",
  superseded: "Succeeded (superseded by newer deployment)",
  failed: "Failed",
  running: "In progress",
  waiting: "Pending approval",
  queued: "Queued",
  cancelled: "Cancelled",
  skipped: "Skipped",
  none: "Not run",
};

/**
 * Orders stages by their average position inside each row, so a pipeline
 * A -> UAT -> PROD shows up left-to-right without extra configuration.
 */
export function orderColumns(
  rows: { cells: Record<string, { at?: string }> }[],
  all: string[],
): string[] {
  const score = new Map<string, { sum: number; n: number }>();
  for (const row of rows) {
    const ordered = Object.entries(row.cells)
      .filter(([, c]) => c.at)
      .sort(([, a], [, b]) => a.at!.localeCompare(b.at!));
    ordered.forEach(([name], i) => {
      const s = score.get(name) ?? { sum: 0, n: 0 };
      s.sum += i;
      s.n += 1;
      score.set(name, s);
    });
  }
  const avg = (name: string) => {
    const s = score.get(name);
    return s ? s.sum / s.n : Number.POSITIVE_INFINITY;
  };
  return [...new Set(all)].sort((a, b) => avg(a) - avg(b) || a.localeCompare(b));
}

export function applyColumnOverride(columns: string[], override?: string): string[] {
  if (!override) return columns;
  const wanted = override
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return wanted.length ? wanted : columns;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: process.env.DASHBOARD_TIMEZONE ?? "Europe/Zurich",
  });
}
