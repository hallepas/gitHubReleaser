"use client";

import { useFavorites } from "@/lib/favorites";
import { StarIcon } from "./icons";

export function FavoriteStar({ repo, className = "h-4 w-4" }: { repo: string; className?: string }) {
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
      aria-label={on ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={on}
      className={`inline-flex items-center justify-center rounded-md p-0.5 transition-all hover:scale-110 active:scale-95 ${
        on ? "text-amber-400 drop-shadow-[0_0_6px_rgb(251_191_36/0.5)]" : "text-gray-300 hover:text-amber-400 dark:text-gray-600"
      }`}
    >
      <StarIcon filled={on} className={className} />
    </button>
  );
}
