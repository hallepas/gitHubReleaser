"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { HistoryIcon, PipelineIcon, PullRequestIcon, RocketIcon } from "./icons";

const TABS = [
  { id: "deployments", label: "Releases", icon: RocketIcon },
  { id: "history", label: "History", icon: HistoryIcon },
  { id: "workflows", label: "Pipelines", icon: PipelineIcon },
  { id: "pulls", label: "Pull requests", icon: PullRequestIcon },
];

export function RepoTabs({ base, pullCount, right }: { base: string; pullCount?: React.ReactNode; right?: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname.slice(base.length + 1).split("/")[0];
  const nav = useRef<HTMLElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);

  // Slide the underline to the active tab; re-measure when the tab labels change size (fonts, PR count).
  useLayoutEffect(() => {
    const place = () => {
      const tab = nav.current?.querySelector<HTMLElement>('[aria-current="page"]');
      const bar = indicator.current;
      if (!bar) return;
      bar.style.opacity = tab ? "1" : "0";
      if (tab) {
        bar.style.width = `${tab.offsetWidth}px`;
        bar.style.transform = `translateX(${tab.offsetLeft}px)`;
      }
    };
    place();
    const ro = new ResizeObserver(place);
    if (nav.current) ro.observe(nav.current);
    return () => ro.disconnect();
  }, [active]);

  return (
    <div className="mt-6 flex flex-wrap items-end gap-3 border-b border-(--line)">
      <nav ref={nav} className="relative -mb-px flex gap-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => {
          const on = active === id;
          return (
            <Link
              key={id}
              href={`${base}/${id}`}
              aria-current={on ? "page" : undefined}
              className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg px-3 pb-3 pt-2 text-sm font-medium transition-colors ${
                on ? "text-gray-900 dark:text-white" : "text-gray-500 hover:bg-gray-100/60 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100"
              }`}
            >
              <Icon className={`h-4 w-4 ${on ? "text-brand-500 dark:text-brand-400" : ""}`} />
              {label}
              {id === "pulls" && pullCount}
            </Link>
          );
        })}
        <span
          ref={indicator}
          aria-hidden
          className="absolute bottom-0 left-0 h-0.5 rounded-full bg-linear-to-r from-brand-500 to-cyan-400 opacity-0 transition-all duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
        />
      </nav>
      {right && <div className="ml-auto pb-2.5">{right}</div>}
    </div>
  );
}
