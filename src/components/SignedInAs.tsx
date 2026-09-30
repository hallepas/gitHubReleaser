/* eslint-disable @next/next/no-img-element */
import type { AuthStatus } from "@/lib/auth";

export function SignedInAs({ status }: { status: Extract<AuthStatus, { ok: true }> }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-gray-600"
      title={`Token from ${status.source === "env" ? "GITHUB_TOKEN in .env.local" : "GitHub CLI (gh auth token)"}${
        status.scopes ? `\nScopes: ${status.scopes.join(", ") || "none"}` : ""
      }`}
    >
      <img src={status.avatarUrl} alt="" className="h-5 w-5 rounded-full" />
      Signed in as <b>{status.login}</b>
      <span className="text-gray-400">({status.source === "env" ? ".env.local" : "GitHub CLI"})</span>
    </span>
  );
}
