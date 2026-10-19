/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { loadGhAccounts, switchAccount, type AccountsResult } from "@/app/accountActions";
import type { AuthStatus } from "@/lib/auth";
import { GhLogin, reloadForNewAccount } from "./GhLogin";
import { ChevronDownIcon } from "./icons";

/** The signed-in account in the top bar; opens a menu to switch or add GitHub CLI accounts. */
export function SignedInAs({ status }: { status: Extract<AuthStatus, { ok: true }> }) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<AccountsResult>();
  const [adding, setAdding] = useState(false);
  const [switching, setSwitching] = useState<string>();
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const viaEnv = status.source === "env";

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const toggle = () => {
    if (open) return setOpen(false);
    setOpen(true);
    setAdding(false);
    setError(undefined);
    if (!viaEnv) startTransition(async () => setAccounts(await loadGhAccounts()));
  };

  const choose = (login: string) => {
    setSwitching(login);
    setError(undefined);
    startTransition(async () => {
      const result = await switchAccount(login);
      if (result.ok) return reloadForNewAccount();
      setError(result.error);
      setSwitching(undefined);
    });
  };

  return (
    <div ref={box} className="relative hidden sm:block">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        title={`Signed in as ${status.login} via ${viaEnv ? "GITHUB_TOKEN in .env.local" : "GitHub CLI (gh auth token)"}${
          status.scopes ? `\nScopes: ${status.scopes.join(", ") || "none"}` : ""
        }`}
        className="inline-flex items-center gap-2 rounded-full border border-(--line) bg-(--surface-solid) py-1 pl-1 pr-2.5 text-left text-xs transition-colors hover:border-brand-500/40"
      >
        <span className="relative">
          <img src={status.avatarUrl} alt="" className="h-6 w-6 rounded-full ring-2 ring-brand-500/40" />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-(--surface-solid) bg-emerald-500" />
        </span>
        <span className="leading-tight">
          <span className="block font-medium">{status.name ?? status.login}</span>
          <span className="block text-[10px] text-gray-500 dark:text-gray-400">
            {status.login} · {viaEnv ? ".env.local" : "GitHub CLI"}
          </span>
        </span>
        <ChevronDownIcon className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="popover absolute right-0 z-40 mt-2 w-80 p-2 text-sm">
          <div className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            GitHub accounts{accounts ? ` · ${accounts.host}` : ""}
          </div>

          {viaEnv ? (
            <p className="px-2 pb-2 text-xs text-gray-600 dark:text-gray-400">
              The dashboard uses <code>GITHUB_TOKEN</code> from <code>.env.local</code>. Remove it and restart the dashboard
              to log in and switch accounts here.
            </p>
          ) : !accounts ? (
            <div className="flex flex-col gap-1.5 px-2 pb-2">
              <div className="skeleton h-9" />
              <div className="skeleton h-9" />
            </div>
          ) : !accounts.ok ? (
            <p className="px-2 pb-2 text-xs text-red-700 dark:text-red-400">{accounts.error}</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {accounts.accounts.map((a) => (
                <li key={a.login}>
                  <button
                    type="button"
                    disabled={a.active || !!switching}
                    onClick={() => (a.valid ? choose(a.login) : setAdding(true))}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors enabled:hover:bg-gray-100 disabled:cursor-default dark:enabled:hover:bg-white/5"
                  >
                    <img
                      src={a.login === status.login ? status.avatarUrl : `https://${accounts.host}/${encodeURIComponent(a.login)}.png?size=64`}
                      alt=""
                      onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                      className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{a.login}</span>
                      {!a.valid && <span className="block text-[10px] text-red-600 dark:text-red-400">Login expired – click to log in again</span>}
                    </span>
                    {a.active ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                        Active
                      </span>
                    ) : switching === a.login ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                    ) : (
                      a.valid && <span className="text-[11px] font-medium text-brand-600 dark:text-brand-400">Switch</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="mx-2 mt-2 text-xs text-red-700 dark:text-red-400">{error}</p>}

          {!viaEnv && (
            <div className="mt-2 border-t border-(--line) px-2 pb-1 pt-3">
              {adding ? (
                <GhLogin autoStart onCancel={() => setAdding(false)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="flex w-full items-center gap-2 rounded-lg py-1 text-left text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-current">+</span>
                  Add another GitHub account
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
