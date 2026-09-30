"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function CheckAgainButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {pending ? "Checking…" : "Check again"}
    </button>
  );
}
