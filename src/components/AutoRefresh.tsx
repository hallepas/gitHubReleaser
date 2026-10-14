"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  const [enabled, setEnabled] = useState(true);
  const [live, setLive] = useState(false);
  const last = useRef(0);

  // A new render (manual or automatic refresh) restarts the countdown.
  useEffect(() => {
    last.current = Date.now();
  }, [renderedAt]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const isLive = !!document.querySelector("[data-live]");
      setLive(isLive);
      if (Date.now() - last.current >= (isLive ? liveSeconds : seconds) * 1000) {
        last.current = Date.now();
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [enabled, router, seconds, liveSeconds]);

  return (
    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
      <span>Updated {renderedAt}</span>
      <label className="flex items-center gap-1" title={`Every ${liveSeconds}s while a release is running, otherwise every ${seconds}s`}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Auto-refresh ({live ? liveSeconds : seconds}s{live ? ", running" : ""})
      </label>
      <button onClick={() => router.refresh()} className="rounded border border-gray-300 px-2 py-0.5 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">
        Refresh
      </button>
    </div>
  );
}
