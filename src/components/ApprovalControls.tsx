"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reviewDeployment } from "@/app/actions";
import type { Approval } from "@/lib/model";

export function ApprovalControls({
  approval,
  release,
  compact = false,
  onDone,
}: {
  approval: Approval;
  release: string;
  compact?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<"approved" | "rejected">();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();

  if (!approval.canApprove) {
    return (
      <span className="text-xs text-gray-500 dark:text-gray-400" title={`Reviewers: ${approval.reviewers.join(", ") || "–"}`}>
        Waiting for {approval.reviewers.join(", ") || "a reviewer"}
      </span>
    );
  }
  if (done) return <span className="text-xs font-medium text-green-700 dark:text-green-400">{done}</span>;

  const submit = (state: "approved" | "rejected") =>
    startTransition(async () => {
      setError(undefined);
      const res = await reviewDeployment({
        owner: approval.owner,
        repo: approval.repo,
        runId: approval.runId,
        environmentId: approval.environmentId,
        state,
        comment,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(state === "approved" ? "✓ Approved – deploying…" : "✕ Rejected");
      setConfirm(undefined);
      onDone?.();
      router.refresh();
    });

  if (confirm) {
    const approve = confirm === "approved";
    return (
      <div className="flex flex-col gap-2 text-xs">
        <span>
          {approve ? "Deploy" : "Reject"} <b>{release}</b> to <b>{approval.environment}</b>?
        </span>
        <input
          autoFocus
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit(confirm)}
          placeholder="Comment (optional)"
          className="rounded border border-gray-300 bg-transparent px-2 py-1 dark:border-gray-700"
        />
        <div className="flex gap-2">
          <button
            disabled={pending}
            onClick={() => submit(confirm)}
            className={`rounded px-3 py-1 font-medium text-white disabled:opacity-50 ${approve ? "bg-green-700 hover:bg-green-800" : "bg-red-700 hover:bg-red-800"}`}
          >
            {pending ? "Sending…" : approve ? "Confirm approve" : "Confirm reject"}
          </button>
          <button disabled={pending} onClick={() => setConfirm(undefined)} className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">
            Cancel
          </button>
        </div>
        {error && <span className="text-red-700 dark:text-red-400">{error}</span>}
      </div>
    );
  }

  return (
    <span className={`inline-flex gap-2 ${compact ? "" : "text-xs"}`}>
      <button onClick={() => setConfirm("approved")} className="rounded bg-green-700 px-2.5 py-0.5 text-xs font-medium text-white hover:bg-green-800">
        Approve
      </button>
      <button onClick={() => setConfirm("rejected")} className="rounded border border-red-700 px-2.5 py-0.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-950">
        Reject
      </button>
      {error && <span className="text-xs text-red-700 dark:text-red-400">{error}</span>}
    </span>
  );
}
