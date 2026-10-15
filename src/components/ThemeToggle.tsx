"use client";

import { useEffect, useSyncExternalStore } from "react";
import { THEME_KEY, applyTheme, readThemePref, type ThemePref } from "@/lib/theme";

const EVENT = "dashboard-theme";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

const ICONS: Record<ThemePref, React.ReactNode> = {
  system: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </>
  ),
  dark: <path d="M20.99 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.78 9.79Z" />,
};

const OPTIONS: { value: ThemePref; title: string }[] = [
  { value: "system", title: "System theme" },
  { value: "light", title: "Light theme" },
  { value: "dark", title: "Dark theme" },
];

export function ThemeToggle() {
  const pref = useSyncExternalStore(subscribe, readThemePref, () => "system" as const);

  useEffect(() => {
    // Read storage instead of `pref` so the hydration render (server snapshot) never flips the theme.
    const apply = () => applyTheme(readThemePref());
    apply();
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [pref]);

  const choose = (value: ThemePref) => {
    try {
      if (value === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, value);
    } catch {
      // storage unavailable – still switch for this page view
    }
    applyTheme(value);
    window.dispatchEvent(new Event(EVENT));
  };

  const index = OPTIONS.findIndex((o) => o.value === pref);

  return (
    <div
      role="group"
      aria-label="Color theme"
      className="relative inline-flex shrink-0 rounded-full border border-(--line) bg-(--surface-solid) p-0.5 shadow-sm"
    >
      <span
        aria-hidden
        className="absolute top-0.5 left-0.5 h-7 w-7 rounded-full bg-linear-to-br from-brand-500 to-indigo-500 shadow-md shadow-brand-500/30 transition-transform duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
        style={{ transform: `translateX(${index * 1.75}rem)` }}
      />
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          aria-label={o.title}
          aria-pressed={pref === o.value}
          onClick={() => choose(o.value)}
          className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
            pref === o.value ? "text-white" : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            {ICONS[o.value]}
          </svg>
        </button>
      ))}
    </div>
  );
}
