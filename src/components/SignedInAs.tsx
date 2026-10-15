/* eslint-disable @next/next/no-img-element */
import type { AuthStatus } from "@/lib/auth";

export function SignedInAs({ status }: { status: Extract<AuthStatus, { ok: true }> }) {
  return (
    <span
      className="hidden items-center gap-2 rounded-full border border-(--line) bg-(--surface-solid) py-1 pl-1 pr-3 text-xs sm:inline-flex"
      title={`Signed in as ${status.login} via ${status.source === "env" ? "GITHUB_TOKEN in .env.local" : "GitHub CLI (gh auth token)"}${
        status.scopes ? `\nScopes: ${status.scopes.join(", ") || "none"}` : ""
      }`}
    >
      <span className="relative">
        <img src={status.avatarUrl} alt="" className="h-6 w-6 rounded-full ring-2 ring-brand-500/40" />
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-(--surface-solid) bg-emerald-500" />
      </span>
      <span className="leading-tight">
        <span className="block font-medium">{status.name ?? status.login}</span>
        <span className="block text-[10px] text-gray-500 dark:text-gray-400">
          {status.login} · {status.source === "env" ? ".env.local" : "GitHub CLI"}
        </span>
      </span>
    </span>
  );
}
