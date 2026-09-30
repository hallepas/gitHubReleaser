"use client";

import { useCallback, useSyncExternalStore } from "react";

const FAVORITES = "dashboard.favorites";
const RECENT = "dashboard.recent";
const EVENT = "dashboard-storage";
const MAX_RECENT = 8;
const EMPTY: string[] = [];

const snapshots = new Map<string, { raw: string | null; value: string[] }>();

function read(key: string): string[] {
  const raw = localStorage.getItem(key);
  const cached = snapshots.get(key);
  if (cached && cached.raw === raw) return cached.value;
  let value: string[] = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) value = parsed.filter((x) => typeof x === "string");
  } catch {
    // ignore corrupt storage
  }
  snapshots.set(key, { raw, value });
  return value;
}

function write(key: string, value: string[]) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function useList(key: string): string[] {
  return useSyncExternalStore(
    subscribe,
    () => read(key),
    () => EMPTY,
  );
}

export function useFavorites() {
  const favorites = useList(FAVORITES);
  const isFavorite = useCallback(
    (repo: string) => favorites.some((f) => f.toLowerCase() === repo.toLowerCase()),
    [favorites],
  );
  const toggle = useCallback((repo: string) => {
    const current = read(FAVORITES);
    const exists = current.some((f) => f.toLowerCase() === repo.toLowerCase());
    write(
      FAVORITES,
      exists ? current.filter((f) => f.toLowerCase() !== repo.toLowerCase()) : [...current, repo],
    );
  }, []);
  return { favorites, isFavorite, toggle };
}

export function useRecent() {
  return useList(RECENT);
}

export function addRecent(repo: string) {
  const current = read(RECENT).filter((r) => r.toLowerCase() !== repo.toLowerCase());
  write(RECENT, [repo, ...current].slice(0, MAX_RECENT));
}
