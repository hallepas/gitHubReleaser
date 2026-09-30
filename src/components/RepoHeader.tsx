import Link from "next/link";
import { AutoRefresh } from "./AutoRefresh";
import { formatDate } from "@/lib/model";

export function RepoHeader({
  owner,
  repo,
  active,
  children,
}: {
  owner: string;
  repo: string;
  active: "deployments" | "workflows";
  children?: React.ReactNode;
}) {
  const base = `/r/${owner}/${repo}`;
  const tab = (id: typeof active, label: string) => (
    <Link
      href={`${base}/${id}`}
      className={`border-b-2 pb-2 ${active === id ? "border-blue-600 font-medium text-gray-900" : "border-transparent text-gray-600 hover:text-gray-900"}`}
    >
      {label}
    </Link>
  );
  return (
    <header className="px-6 pt-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-xs text-gray-500 hover:underline">
            ← All repositories
          </Link>
          <h1 className="text-2xl font-semibold">
            <a href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noreferrer" className="hover:underline">
              {owner}/{repo}
            </a>
          </h1>
        </div>
        <AutoRefresh renderedAt={formatDate(new Date().toISOString())} />
      </div>
      <nav className="mt-4 flex items-center gap-6 text-sm">
        {tab("deployments", "Releases (Deployments)")}
        {tab("workflows", "Pipelines (Workflow runs)")}
        <div className="ml-auto pb-2">{children}</div>
      </nav>
    </header>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="m-6 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-900">
      <b>Could not load data.</b>
      <p className="mt-1 whitespace-pre-wrap">{message}</p>
      {/SAML|SSO/i.test(message) && (
        <p className="mt-2">
          Your token must be authorized for the organization&apos;s SSO. Run{" "}
          <code>gh auth refresh -h github.com</code> or authorize the PAT under GitHub → Settings → Tokens.
        </p>
      )}
    </div>
  );
}
