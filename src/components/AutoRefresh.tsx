"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { RefreshIcon } from "./icons";

const RING = 2 * Math.PI * 14;

function ago(seconds: number) {
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

/**
 * Refreshes the server-rendered page periodically. While something on the page is running
 * (any element marked with `data-live`), it refreshes faster so the current step stays up to date.
 */
export function AutoRefresh({
  seconds = 60,
  liveSeconds = 10,
  renderedAt,
}: {
  seconds?: number;
  liveSeconds?: number;
  renderedAt: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(true);
  const [live, setLive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [pending, startTransition] = useTransition();
  const last = useRef(0);

  // A new render (manual or automatic refresh) or another tab restarts the countdown.
  useEffect(() => {
    last.current = Date.now();
  }, [renderedAt, pathname]);

  useEffect(() => {
    const id = setInterval(() => {
      const isLive = !!document.querySelector("[data-live]");
      setLive(isLive);
      const secs = Math.floor((Date.now() - last.current) / 1000);
      setElapsed(secs);
      if (enabled && secs >= (isLive ? liveSeconds : seconds)) {
        last.current = Date.now();
        setElapsed(0);
        startTransition(() => router.refresh());
      }
    }, 1000);
    return () => clearInterval(id);
  }, [enabled, router, seconds, liveSeconds]);

  const period = live ? liveSeconds : seconds;
  const progress = enabled ? Math.min(elapsed / period, 1) : 0;

  return (
    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
      <span className="hidden items-center gap-1.5 sm:inline-flex" title={`Server data from ${renderedAt}`}>
        <span className="relative flex h-2 w-2">
          {enabled && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${live ? "bg-blue-400" : "bg-emerald-400"}`} />}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${!enabled ? "bg-gray-400" : live ? "bg-blue-500" : "bg-emerald-500"}`} />
        </span>
        Updated {ago(elapsed)}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled((e) => !e)}
        title={`Every ${liveSeconds}s while a release is running, otherwise every ${seconds}s`}
        className="inline-flex items-center gap-1.5 rounded-full py-0.5 transition-colors hover:text-gray-900 dark:hover:text-gray-100"
      >
        <span className={`relative h-4 w-7 rounded-full transition-colors ${enabled ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-700"}`}>
          <span className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-3" : ""}`} />
        </span>
        Auto {period}s{live ? " · live" : ""}
      </button>
      <button
        type="button"
        onClick={() => {
          last.current = Date.now();
          setElapsed(0);
          startTransition(() => router.refresh());
        }}
        title="Refresh now"
        aria-label="Refresh now"
        className="relative flex h-8 w-8 items-center justify-center rounded-full border border-(--line) bg-(--surface-solid) text-gray-600 shadow-sm transition-colors hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-300"
      >
        <svg viewBox="0 0 32 32" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            strokeWidth="2"
            className="stroke-brand-500 transition-[stroke-dashoffset] duration-1000 ease-linear"
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - progress)}
            strokeLinecap="round"
          />
        </svg>
        <RefreshIcon className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
