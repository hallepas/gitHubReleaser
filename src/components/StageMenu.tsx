"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { dispatchWorkflow, rerunFailedJobs, rerunJob, type ReviewResult } from "@/app/actions";
import type { StageCell, StageOptions } from "@/lib/model";
import { ApprovalControls } from "./ApprovalControls";
import { StageChip } from "./StageChip";

interface Props {
  owner: string;
  repo: string;
  name: string;
  cell?: StageCell;
  release: string;
  runId?: number;
  gitRef?: string;
}

/** A stage chip that opens a menu to approve, redeploy or open the stage in GitHub. */
export function StageMenu({ owner, repo, name, cell, release, runId, gitRef }: Props) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const base: StageCell = cell ?? { status: "none", label: name, tooltip: `${name}: Not run` };
  const effectiveRunId = cell?.runId ?? runId;
  const githubUrl = cell?.url ?? cell?.approval?.runUrl;

  return (
    <div ref={box} className="relative">
      <StageChip name={name} cell={{ ...base, url: undefined }} onClick={() => setOpen((o) => !o)} />
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-80 rounded border border-gray-200 bg-white p-3 text-sm shadow-lg">
          <div className="font-medium">
            {release} → {name}
          </div>
          {base.tooltip && <div className="mb-3 whitespace-pre-line text-xs text-gray-500">{base.tooltip}</div>}
          {cell?.approval ? (
            <>
              <div className="mb-2 text-xs text-gray-500">Required reviewers: {cell.approval.reviewers.join(", ") || "–"}</div>
              <ApprovalControls approval={cell.approval} release={release} onDone={() => setTimeout(() => setOpen(false), 1500)} />
            </>
          ) : effectiveRunId ? (
            <RedeployOptions
              owner={owner}
              repo={repo}
              runId={effectiveRunId}
              jobId={cell?.jobId}
              refName={gitRef}
              release={release}
              stage={name}
            />
          ) : (
            <p className="text-xs text-gray-500">No GitHub Actions run is linked to this stage.</p>
          )}
          {githubUrl && (
            <a href={githubUrl} target="_blank" rel="noreferrer" className="mt-3 block border-t border-gray-100 pt-2 text-xs text-blue-700 hover:underline">
              Open in GitHub ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function RedeployOptions({
  owner,
  repo,
  runId,
  jobId,
  refName,
  release,
  stage,
}: {
  owner: string;
  repo: string;
  runId: number;
  jobId?: number;
  refName?: string;
  release: string;
  stage: string;
}) {
  const router = useRouter();
  const [options, setOptions] = useState<StageOptions>();
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState<"job" | "failed" | "dispatch">();
  const [done, setDone] = useState<string>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const q = new URLSearchParams({ owner, repo, runId: String(runId) });
    if (jobId) q.set("jobId", String(jobId));
    if (refName) q.set("ref", refName);
    let cancelled = false;
    fetch(`/api/stage-options?${q}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? res.statusText);
        if (!cancelled) setOptions(body);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [owner, repo, runId, jobId, refName]);

  if (error) return <p className="text-xs text-red-700">{error}</p>;
  if (!options) return <p className="text-xs text-gray-500">Checking what can be done…</p>;
  if (done) return <p className="text-xs font-medium text-green-700">{done}</p>;

  const execute = (fn: () => Promise<ReviewResult>, message: string) =>
    startTransition(async () => {
      setError(undefined);
      const res = await fn();
      if (!res.ok) return setError(res.error);
      setDone(message);
      router.refresh();
    });

  const choices = [
    options.rerunJob && {
      id: "job" as const,
      label: `Redeploy ${release} to ${stage}`,
      detail: `Re-runs job “${options.rerunJob.jobName}” and every job after it. Approval gates still apply.`,
      action: () => rerunJob({ owner, repo, jobId: options.rerunJob!.jobId }),
    },
    options.rerunFailed && {
      id: "failed" as const,
      label: `Continue pipeline of ${release}`,
      detail: `Re-runs the failed/rejected jobs of run #${options.run?.id} and everything after them (including ${stage}). Approval gates still apply.`,
      action: () => rerunFailedJobs({ owner, repo, runId }),
    },
    options.dispatch && {
      id: "dispatch" as const,
      label: `Run “${options.dispatch.workflowName}” again for ${options.dispatch.ref}`,
      detail: "Starts the complete pipeline for this version (build, then every stage in order). Approval gates still apply.",
      action: () =>
        dispatchWorkflow({ owner, repo, workflowId: options.dispatch!.workflowId, ref: options.dispatch!.ref }),
    },
  ].filter(Boolean) as { id: "job" | "failed" | "dispatch"; label: string; detail: string; action: () => Promise<ReviewResult> }[];

  const selected = choices.find((c) => c.id === confirm);

  return (
    <div className="flex flex-col gap-2 text-xs">
      {options.reason && <p className="text-gray-500">{options.reason}</p>}
      {choices.length === 0 && !options.reason && <p className="text-gray-500">No actions available for this stage.</p>}
      {selected ? (
        <>
          <p>{selected.detail}</p>
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={() => execute(selected.action, "✓ Started – the stage will update shortly.")}
              className="rounded bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? "Starting…" : "Confirm"}
            </button>
            <button disabled={pending} onClick={() => setConfirm(undefined)} className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-100">
              Cancel
            </button>
          </div>
        </>
      ) : (
        choices.map((c) => (
          <button
            key={c.id}
            onClick={() => setConfirm(c.id)}
            title={c.detail}
            className="rounded border border-blue-600 px-2 py-1 text-left font-medium text-blue-700 hover:bg-blue-50"
          >
            {c.label}
          </button>
        ))
      )}
      {error && <p className="text-red-700">{error}</p>}
    </div>
  );
}
