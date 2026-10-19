"use client";

import { useEffect, useState, useTransition } from "react";
import { abortGhLogin, beginGhLogin, pollGhLogin } from "@/app/accountActions";
import type { LoginState } from "@/lib/ghAuth";
import { ExternalIcon, GitHubIcon } from "./icons";

/** After the account changed: refresh the cached repo list for the new account, then reload everything. */
export async function reloadForNewAccount() {
  await fetch("/api/repos", { cache: "reload" }).catch(() => undefined);
  window.location.reload();
}

/** Runs `gh auth login --web` on the server and walks the user through GitHub's device login in the browser. */
export function GhLogin({
  label = "Log in with GitHub",
  autoStart = false,
  onCancel,
}: {
  label?: string;
  autoStart?: boolean;
  onCancel?: () => void;
}) {
  const [login, setLogin] = useState<LoginState>({ state: autoStart ? "starting" : "idle" });
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  const busy = login.state === "starting" || login.state === "waiting";

  useEffect(() => {
    // A login that is already running is reused by the server, so a double mount is harmless.
    if (autoStart) startTransition(async () => setLogin(await beginGhLogin()));
  }, [autoStart]);

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => {
      startTransition(async () => {
        const next = await pollGhLogin();
        setLogin((cur) => (cur.state === "starting" || cur.state === "waiting" ? next : cur));
        if (next.state === "done") await reloadForNewAccount();
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [busy]);

  const start = () => {
    setCopied(false);
    setLogin({ state: "starting" });
    startTransition(async () => setLogin(await beginGhLogin()));
  };

  const cancel = () => {
    setLogin({ state: "idle" });
    startTransition(() => abortGhLogin());
    onCancel?.();
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // clipboard blocked – the code is still shown
    }
  };

  if (login.state === "idle" || login.state === "error") {
    return (
      <div className="flex flex-col gap-2">
        {login.state === "error" && (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-800 dark:text-red-300">
            {login.message}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button type="button" onClick={start} className="btn btn-primary px-4 py-2 text-sm">
            <GitHubIcon className="h-4 w-4" />
            {login.state === "error" ? "Try again" : label}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn btn-outline px-3 py-2 text-sm">
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  if (login.state === "starting") {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        Asking GitHub for a login code…
      </div>
    );
  }

  if (login.state === "done") {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        Logged in{login.login ? ` as ${login.login}` : ""}. Loading your repositories…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-gray-600 dark:text-gray-400">
        1. Copy this code &nbsp;·&nbsp; 2. Paste it on GitHub and authorize <b>GitHub CLI</b>
      </div>
      <button
        type="button"
        onClick={() => copy(login.code)}
        title="Copy code"
        className="group flex items-center justify-between gap-3 rounded-xl border border-dashed border-brand-500/50 bg-brand-500/5 px-4 py-3 transition-colors hover:bg-brand-500/10"
      >
        <span className="font-mono text-2xl font-bold tracking-[0.3em]">{login.code}</span>
        <span className="text-xs font-medium text-brand-600 dark:text-brand-400">{copied ? "✓ Copied" : "Copy"}</span>
      </button>
      <div className="flex items-center gap-2">
        <a
          href={login.url}
          target="_blank"
          rel="noreferrer"
          onClick={() => copy(login.code)}
          className="btn btn-primary min-w-0 flex-1 px-3 py-2 text-sm"
        >
          Copy & open GitHub
          <ExternalIcon className="h-3.5 w-3.5" />
        </a>
        <button type="button" onClick={cancel} className="btn btn-outline shrink-0 px-3 py-2 text-sm">
          Cancel
        </button>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
        Waiting for you to authorize on GitHub. This updates automatically.
      </div>
    </div>
  );
}
