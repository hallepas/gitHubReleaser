"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useFavorites, useRecent } from "@/lib/favorites";
import { FavoriteStar } from "./FavoriteStar";
import { ChevronRightIcon, ClockIcon, HistoryIcon, PipelineIcon, PullRequestIcon, RocketIcon, StarIcon } from "./icons";
import { RepoAvatar } from "./RepoAvatar";

const noop = () => () => {};
const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

const QUICK_LINKS = [
  { section: "deployments", label: "Releases", icon: RocketIcon },
  { section: "history", label: "History", icon: HistoryIcon },
  { section: "workflows", label: "Pipelines", icon: PipelineIcon },
  { section: "pulls", label: "Pull requests", icon: PullRequestIcon },
];

function FavoriteTile({ repo }: { repo: string }) {
  const [owner, name] = repo.split("/");
  return (
    <div className="card group relative flex flex-col gap-4 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/10">
      <div className="flex items-start gap-3">
        <RepoAvatar repo={repo} />
        <Link href={`/r/${repo}/deployments`} className="min-w-0 flex-1 after:absolute after:inset-0 after:rounded-2xl">
          <div className="truncate font-semibold tracking-tight group-hover:text-brand-600 dark:group-hover:text-brand-300">{name}</div>
          <div className="truncate text-xs text-gray-500 dark:text-gray-400">{owner}</div>
        </Link>
        <span className="relative z-10">
          <FavoriteStar repo={repo} />
        </span>
      </div>
      <div className="relative z-10 flex gap-1">
        {QUICK_LINKS.map(({ section, label, icon: Icon }) => (
          <Link
            key={section}
            href={`/r/${repo}/${section}`}
            title={label}
            aria-label={`${label} of ${repo}`}
            className="flex flex-1 items-center justify-center rounded-lg border border-(--line) py-1.5 text-gray-500 transition-colors hover:border-brand-500/40 hover:bg-brand-500/10 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-300"
          >
            <Icon className="h-3.5 w-3.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function FavoriteTiles() {
  const hydrated = useHydrated();
  const { favorites } = useFavorites();
  if (!hydrated) return <div className="skeleton h-28" />;
  if (!favorites.length) {
    return (
      <div className="card flex items-center gap-4 border-dashed p-6 text-sm text-gray-500 dark:text-gray-400">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-500">
          <StarIcon className="h-5 w-5" />
        </span>
        No favorites yet – click the star next to a repository to pin it here and in the sidebar.
      </div>
    );
  }
  return (
    <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {[...favorites]
        .sort((a, b) => a.localeCompare(b))
        .map((r) => (
          <FavoriteTile key={r} repo={r} />
        ))}
    </div>
  );
}

function CompactList({ title, icon, repos }: { title: string; icon: React.ReactNode; repos: string[] }) {
  if (!repos.length) return null;
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {icon}
        {title}
      </h3>
      <ul className="flex flex-col gap-0.5">
        {repos.map((r) => (
          <li key={r}>
            <Link
              href={`/r/${r}/deployments`}
              className="group flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <RepoAvatar repo={r} size="sm" />
              <span className="min-w-0 flex-1 truncate">
                <span className="text-gray-500 dark:text-gray-400">{r.split("/")[0]}/</span>
                <span className="font-medium">{r.split("/")[1]}</span>
              </span>
              <FavoriteStar repo={r} className="h-3.5 w-3.5" />
              <ChevronRightIcon className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500 dark:text-gray-600" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RecentRepos({ suggested }: { suggested: string[] }) {
  const hydrated = useHydrated();
  const { isFavorite } = useFavorites();
  const recent = useRecent().filter((r) => !isFavorite(r));
  const suggestions = suggested.filter((r) => !isFavorite(r) && !recent.includes(r));
  if (!hydrated) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <span key={i} className="skeleton h-9" />
        ))}
      </div>
    );
  }
  if (!recent.length && !suggestions.length) {
    return <p className="px-1 text-sm text-gray-500 dark:text-gray-400">Repositories you open show up here.</p>;
  }
  return (
    <div className="flex flex-col gap-5">
      <CompactList title="Recently viewed" icon={<ClockIcon className="h-3 w-3" />} repos={recent} />
      <CompactList title="Suggested" icon={<StarIcon className="h-3 w-3" />} repos={suggestions} />
    </div>
  );
}

/** Live counters from local storage, rendered client-side. */
export function LocalCount({ kind }: { kind: "favorites" | "recent" }) {
  const hydrated = useHydrated();
  const { favorites } = useFavorites();
  const recent = useRecent();
  if (!hydrated) return <span className="skeleton inline-block h-8 w-10" />;
  return <>{kind === "favorites" ? favorites.length : recent.length}</>;
}
