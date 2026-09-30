"use client";

import { useFavorites } from "@/lib/favorites";

export function FavoriteStar({ repo, className = "" }: { repo: string; className?: string }) {
  const { isFavorite, toggle } = useFavorites();
  const on = isFavorite(repo);
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(repo);
      }}
      title={on ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={on}
      className={`text-lg leading-none ${on ? "text-amber-500" : "text-gray-300 hover:text-amber-400 dark:text-gray-600"} ${className}`}
    >
      {on ? "★" : "☆"}
    </button>
  );
}
