"use client";

import { useEffect, useRef, useState } from "react";
import type { StageCell } from "@/lib/model";
import { ApprovalControls } from "./ApprovalControls";
import { StageChip } from "./StageChip";

/** A waiting stage chip with a popover to approve/reject without leaving the dashboard. */
export function ApprovalChip({ cell, name, release }: { cell: StageCell; name: string; release: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <StageChip
        name={name}
        cell={{ ...cell, url: undefined, tooltip: `${cell.tooltip ?? ""}\nClick to approve or reject` }}
        onClick={() => setOpen((o) => !o)}
      />
      {open && cell.approval && (
        <div className="absolute right-0 z-20 mt-1 w-72 rounded border border-gray-200 bg-white p-3 text-sm shadow-lg">
          <div className="mb-2 font-medium">
            {release} → {cell.approval.environment}
          </div>
          <div className="mb-3 text-xs text-gray-500">
            Required reviewers: {cell.approval.reviewers.join(", ") || "–"}
          </div>
          <ApprovalControls approval={cell.approval} release={release} onDone={() => setTimeout(() => setOpen(false), 1500)} />
          <a
            href={cell.url ?? cell.approval.runUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block border-t border-gray-100 pt-2 text-xs text-blue-700 hover:underline"
          >
            Open in GitHub ↗
          </a>
        </div>
      )}
    </div>
  );
}
