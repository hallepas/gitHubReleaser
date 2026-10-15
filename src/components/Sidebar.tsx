"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { useFavorites, useRecent } from "@/lib/favorites";
import { ClockIcon, GitHubIcon, HomeIcon, RocketIcon, StarIcon } from "./icons";
import { RepoAvatar } from "./RepoAvatar";
import { ShortcutHint } from "./RepoPicker";

const noop = () => () => {};
const SECTIONS = new Set(["deployments", "history", "workflows", "pulls"]);

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 via-indigo-500 to-cyan-400 text-white shadow-lg shadow-brand-500/30 transition-transform group-hover:scale-105">
        <RocketIcon className="h-[18px] w-[18px]" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-tight">Release Dashboard</span>
          <span className="block text-[11px] text-gray-500 dark:text-gray-400">for GitHub Actions</span>
        </span>
      )}
    </Link>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-1.5 mt-6 flex items-center gap-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
      {icon}
      {children}
    </div>
  );
}

function RepoLink({ repo, active, section }: { repo: string; active: boolean; section: string }) {
  const [owner, name] = repo.split("/");
  return (
    <Link
      href={`/r/${repo}/${section}`}
      title={repo}
      className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
        active
          ? "bg-brand-500/10 font-medium text-gray-900 dark:bg-brand-400/15 dark:text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100"
      }`}
    >
      {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-linear-to-b from-brand-500 to-cyan-400" />}
      <RepoAvatar repo={repo} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{name}</span>
        <span className="block truncate text-[10px] text-gray-400 dark:text-gray-500">{owner}</span>
      </span>
    </Link>
  );
}

/** Left navigation: quick switching between favorite and recently viewed repositories. */
export function Sidebar() {
  const pathname = usePathname();
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const { favorites, isFavorite } = useFavorites();
  const recent = useRecent()
    .filter((r) => !isFavorite(r))
    .slice(0, 6);

  const match = /^\/r\/([^/]+)\/([^/]+)(?:\/([^/]+))?/.exec(pathname);
  const current = match ? `${match[1]}/${match[2]}`.toLowerCase() : undefined;
  // Switching repositories keeps the current tab (e.g. stay on Pipelines).
  const section = match?.[3] && SECTIONS.has(match[3]) ? match[3] : "deployments";

  return (
    <aside className="glass fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-(--line) lg:flex">
      <div className="flex h-16 items-center px-5">
        <Brand />
      </div>
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4">
        <Link
          href="/"
          className={`mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
            pathname === "/"
              ? "bg-brand-500/10 font-medium text-gray-900 dark:bg-brand-400/15 dark:text-white"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100"
          }`}
        >
          <HomeIcon className="h-4 w-4" />
          Overview
        </Link>

        {hydrated && (
          <>
            <SectionTitle icon={<StarIcon filled className="h-3 w-3 text-amber-400" />}>Favorites</SectionTitle>
            {favorites.length ? (
              <div className="flex flex-col gap-0.5">
                {[...favorites]
                  .sort((a, b) => a.localeCompare(b))
                  .map((r) => (
                    <RepoLink key={r} repo={r} section={section} active={r.toLowerCase() === current} />
                  ))}
              </div>
            ) : (
              <p className="px-3 text-xs text-gray-400 dark:text-gray-500">Star a repository to pin it here.</p>
            )}
            {recent.length > 0 && (
              <>
                <SectionTitle icon={<ClockIcon className="h-3 w-3" />}>Recent</SectionTitle>
                <div className="flex flex-col gap-0.5">
                  {recent.map((r) => (
                    <RepoLink key={r} repo={r} section={section} active={r.toLowerCase() === current} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </nav>
      <div className="border-t border-(--line) p-4">
        <div className="flex items-center justify-between rounded-xl bg-gray-100/70 px-3 py-2 text-xs text-gray-500 dark:bg-white/5 dark:text-gray-400">
          <span>Jump to repository</span>
          <ShortcutHint />
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center gap-2 px-1 text-xs text-gray-400 transition-colors hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
        >
          <GitHubIcon className="h-3.5 w-3.5" />
          Open GitHub
        </a>
      </div>
    </aside>
  );
}
