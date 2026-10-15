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
      className="btn btn-primary px-4 py-2 text-sm"
    >
      {pending ? "Checking…" : "Check again"}
    </button>
  );
}
