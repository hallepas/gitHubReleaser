"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RepoSummary } from "@/lib/repos";
import { useFavorites } from "@/lib/favorites";
import { FavoriteStar } from "./FavoriteStar";

const MAX_RESULTS = 12;

function score(repo: RepoSummary, tokens: string[]): number {
  const full = repo.fullName.toLowerCase();
  const name = full.split("/")[1];
  const haystack = `${full} ${(repo.description ?? "").toLowerCase()}`;
  if (!tokens.every((t) => haystack.includes(t))) return -1;
  const q = tokens.join(" ");
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (tokens.every((t) => name.includes(t))) return 60;
  if (tokens.every((t) => full.includes(t))) return 40;
  return 10;
}

export function RepoPicker({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const { isFavorite } = useFavorites();
  const [repos, setRepos] = useState<RepoSummary[] | null>(null);
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/repos")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? res.statusText);
        return body as RepoSummary[];
      })
      .then((data) => !cancelled && setRepos(data))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    if (!repos) return [];
    const tokens = query.toLowerCase().split(/[\s/]+/).filter(Boolean);
    const scored = repos
      .map((r, i) => ({ r, i, s: tokens.length ? score(r, tokens) : 1 }))
      .filter((x) => x.s >= 0)
      .map((x) => ({ ...x, s: x.s + (isFavorite(x.r.fullName) ? 5 : 0) - (x.r.archived ? 20 : 0) }));
    // Stable: score, then most recently pushed (source order).
    scored.sort((a, b) => b.s - a.s || a.i - b.i);
    return scored.slice(0, MAX_RESULTS).map((x) => x.r);
  }, [repos, query, isFavorite]);

  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (repo: string) => {
    setOpen(false);
    router.push(`/r/${repo}/deployments`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[active]?.fullName ?? (/^[\w.-]+\/[\w.-]+$/.test(query.trim()) ? query.trim() : undefined);
      if (pick) go(pick);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder={repos ? `Search ${repos.length} repositories…` : "Loading repositories…"}
        role="combobox"
        aria-expanded={open}
        aria-controls="repo-results"
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:focus:border-blue-500"
      />
      {open && (
        <ul
          id="repo-results"
          ref={listRef}
          role="listbox"
          className="absolute z-10 mt-1 max-h-96 w-full overflow-auto rounded border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:shadow-black/50"
        >
          {error && <li className="px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</li>}
          {!error && !repos && <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Loading repositories…</li>}
          {repos && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No repository matches “{query}”.</li>
          )}
          {results.map((r, i) => (
            <li
              key={r.fullName}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                go(r.fullName);
              }}
              className={`flex cursor-pointer items-start gap-2 px-3 py-2 text-sm ${i === active ? "bg-blue-50 dark:bg-blue-950" : ""}`}
            >
              <FavoriteStar repo={r.fullName} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate">
                    <span className="text-gray-500 dark:text-gray-400">{r.fullName.split("/")[0]}/</span>
                    <span className="font-medium">{r.fullName.split("/")[1]}</span>
                  </span>
                  {r.private && <span className="rounded border px-1 text-[10px] text-gray-500 dark:text-gray-400">private</span>}
                  {r.archived && <span className="rounded border px-1 text-[10px] text-amber-700 dark:text-amber-400">archived</span>}
                </div>
                {r.description && <div className="truncate text-xs text-gray-500 dark:text-gray-400">{r.description}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
