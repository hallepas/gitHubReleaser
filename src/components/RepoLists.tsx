"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useFavorites, useRecent } from "@/lib/favorites";
import { FavoriteStar } from "./FavoriteStar";

function RepoList({ title, repos, empty }: { title: string; repos: string[]; empty?: string }) {
  if (!repos.length && !empty) return null;
  return (
    <section className="mt-10">
      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h2>
      {repos.length ? (
        <ul className="mt-3 divide-y divide-gray-100 rounded border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {repos.map((r) => (
            <li key={r} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900">
              <FavoriteStar repo={r} />
              <Link href={`/r/${r}/deployments`} className="flex-1 text-sm text-blue-700 hover:underline dark:text-blue-400">
                {r}
              </Link>
              <Link href={`/r/${r}/workflows`} className="text-xs text-gray-500 hover:underline dark:text-gray-400">
                Pipelines
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{empty}</p>
      )}
    </section>
  );
}

const noop = () => () => {};

export function RepoLists({ suggested }: { suggested: string[] }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const { favorites, isFavorite } = useFavorites();
  const recent = useRecent().filter((r) => !isFavorite(r));
  const suggestions = suggested.filter((r) => !isFavorite(r) && !recent.includes(r));
  if (!hydrated) return null;
  return (
    <>
      <RepoList
        title="★ Favorites"
        repos={[...favorites].sort((a, b) => a.localeCompare(b))}
        empty="No favorites yet – click the ☆ next to a repository to pin it here."
      />
      <RepoList title="Recently viewed" repos={recent} />
      <RepoList title="Suggested" repos={suggestions} />
    </>
  );
}
