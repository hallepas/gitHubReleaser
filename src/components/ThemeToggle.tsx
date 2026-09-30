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

  return (
    <div role="group" aria-label="Color theme" className="inline-flex gap-0.5 rounded-full border border-gray-300 p-0.5 dark:border-gray-700">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          aria-label={o.title}
          aria-pressed={pref === o.value}
          onClick={() => choose(o.value)}
          className={`rounded-full p-1 transition-colors ${
            pref === o.value
              ? "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
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
