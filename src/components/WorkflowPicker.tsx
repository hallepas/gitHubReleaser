"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDownIcon, PipelineIcon } from "./icons";

export function WorkflowPicker({
  workflows,
  selected,
}: {
  workflows: { id: number; name: string; path: string }[];
  selected?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const current = workflows.find((w) => w.id === selected);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="relative flex items-center">
        <span className="sr-only">Workflow</span>
        <PipelineIcon className="pointer-events-none absolute left-3 h-4 w-4 text-brand-500" />
        <select
          className="input h-9 min-w-64 cursor-pointer appearance-none pl-9 pr-9 text-sm font-medium"
          value={selected ?? ""}
          onChange={(e) => startTransition(() => router.push(`${pathname}?workflow=${e.target.value}`))}
        >
          {workflows.map((w) => (
            <option key={w.id} value={w.id} title={w.path}>
              {w.name}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 h-4 w-4 text-gray-400" />
      </label>
      {current && <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{current.path}</span>}
      {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" aria-label="Loading" />}
    </div>
  );
}
