"use client";

import { usePathname, useRouter } from "next/navigation";

export function WorkflowPicker({
  workflows,
  selected,
}: {
  workflows: { id: number; name: string; path: string }[];
  selected?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <select
      className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
      value={selected ?? ""}
      onChange={(e) => router.push(`${pathname}?workflow=${e.target.value}`)}
    >
      {workflows.map((w) => (
        <option key={w.id} value={w.id} title={w.path}>
          {w.name}
        </option>
      ))}
    </select>
  );
}
