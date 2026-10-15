"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { RepoSummary } from "@/lib/repos";
import { useFavorites } from "@/lib/favorites";
import { FavoriteStar } from "./FavoriteStar";
import { SearchIcon } from "./icons";
import { RepoAvatar } from "./RepoAvatar";

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

const noop = () => () => {};

function useIsMac() {
  return useSyncExternalStore(noop, () => /Mac|iPhone|iPad/.test(navigator.platform), () => true);
}

export function ShortcutHint({ className = "" }: { className?: string }) {
  const mac = useIsMac();
  return (
    <kbd
      className={`inline-flex items-center gap-0.5 rounded-md border border-(--line) bg-(--surface-solid) px-1.5 py-0.5 font-sans text-[10px] font-medium text-gray-500 shadow-sm dark:text-gray-400 ${className}`}
    >
      {mac ? "⌘" : "Ctrl"} K
    </kbd>
  );
}

export function RepoPicker({ autoFocus = false, size = "md" }: { autoFocus?: boolean; size?: "md" | "lg" }) {
  const router = useRouter();
  const { isFavorite } = useFavorites();
  const [repos, setRepos] = useState<RepoSummary[] | null>(null);
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K or "/" focuses the search from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  const large = size === "lg";

  return (
    <div className="group/picker relative">
      <SearchIcon
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within/picker:text-brand-500 ${
          large ? "left-4 h-5 w-5" : "left-3 h-4 w-4"
        }`}
      />
      <input
        ref={inputRef}
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
        className={`input ${large ? "h-14 rounded-2xl pl-12 pr-16 text-base shadow-lg shadow-brand-900/5" : "h-9 pl-9 pr-14 text-sm"}`}
      />
      <ShortcutHint className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${large ? "right-4" : "right-2.5"}`} />
      {open && (
        <ul
          id="repo-results"
          ref={listRef}
          role="listbox"
          className="popover scrollbar-thin absolute z-40 mt-2 max-h-[26rem] w-full min-w-80 overflow-auto p-1.5"
        >
          {error && <li className="px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</li>}
          {!error && !repos && (
            <li className="flex flex-col gap-2 p-2">
              {[0, 1, 2].map((i) => (
                <span key={i} className="skeleton h-8" />
              ))}
            </li>
          )}
          {repos && results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">No repository matches “{query}”.</li>
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
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                i === active ? "bg-brand-500/10 dark:bg-brand-400/15" : ""
              }`}
            >
              <RepoAvatar repo={r.fullName} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate">
                    <span className="text-gray-500 dark:text-gray-400">{r.fullName.split("/")[0]}/</span>
                    <span className="font-medium">{r.fullName.split("/")[1]}</span>
                  </span>
                  {r.private && (
                    <span className="rounded-full border border-(--line) px-1.5 text-[10px] text-gray-500 dark:text-gray-400">private</span>
                  )}
                  {r.archived && (
                    <span className="rounded-full bg-amber-500/10 px-1.5 text-[10px] text-amber-700 dark:text-amber-400">archived</span>
                  )}
                </div>
                {r.description && <div className="truncate text-xs text-gray-500 dark:text-gray-400">{r.description}</div>}
              </div>
              <FavoriteStar repo={r.fullName} />
              {i === active && <span className="text-[10px] text-gray-400">↵</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
