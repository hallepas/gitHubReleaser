import Link from "next/link";
import { Suspense } from "react";
import { getOpenPullRequestCount } from "@/lib/pulls";
import type { AuthStatus } from "@/lib/auth";
import { formatDate } from "@/lib/model";
import { AutoRefresh } from "./AutoRefresh";
import { FavoriteStar } from "./FavoriteStar";
import { ChevronRightIcon, ExternalIcon, GitHubIcon } from "./icons";
import { NewTagButton } from "./NewTag";
import { RecordVisit } from "./RecordVisit";
import { RepoAvatar } from "./RepoAvatar";
import { RepoPicker } from "./RepoPicker";
import { RepoTabs } from "./RepoTabs";
import { AuthWarnings } from "./SetupGuide";
import { TopBar } from "./TopBar";
import { CountPill } from "./ui";

async function PullCount({ owner, repo }: { owner: string; repo: string }) {
  const count = await getOpenPullRequestCount(owner, repo).catch(() => 0);
  if (!count) return null;
  return <CountPill tone="brand">{count}</CountPill>;
}

/** Header shared by all repository tabs. Rendered once by the repository layout, so it stays put while switching tabs. */
export function RepoHeader({ owner, repo, auth }: { owner: string; repo: string; auth: Extract<AuthStatus, { ok: true }> }) {
  const full = `${owner}/${repo}`;
  return (
    <>
      <AuthWarnings warnings={auth.warnings} />
      <TopBar auth={auth}>
        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm xl:flex">
          <Link href="/" className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
            Overview
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
          <span className="truncate text-gray-500 dark:text-gray-400">{owner}</span>
          <ChevronRightIcon className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
          <span className="truncate font-medium">{repo}</span>
        </nav>
        <div className="w-full max-w-sm xl:ml-auto">
          <RepoPicker />
        </div>
      </TopBar>
      <RecordVisit repo={full} />
      <div className="px-4 pt-6 sm:px-6 lg:px-8">
        <div className="flex animate-fade-up flex-wrap items-center gap-4">
          <RepoAvatar repo={full} size="lg" />
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{owner}</div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <span className="truncate">{repo}</span>
              <FavoriteStar repo={full} className="h-5 w-5" />
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a href={`https://github.com/${full}`} target="_blank" rel="noreferrer" className="btn btn-outline py-1.5 text-sm">
              <GitHubIcon className="h-4 w-4" />
              GitHub
              <ExternalIcon className="h-3 w-3 text-gray-400" />
            </a>
            <NewTagButton owner={owner} repo={repo} />
          </div>
        </div>
        <RepoTabs
          base={`/r/${full}`}
          pullCount={
            <Suspense>
              <PullCount owner={owner} repo={repo} />
            </Suspense>
          }
          right={<AutoRefresh renderedAt={formatDate(new Date().toISOString())} />}
        />
      </div>
    </>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="card relative overflow-hidden border-rose-500/40 p-5 pl-6 text-sm">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-rose-500 to-red-600" />
      <b className="text-rose-700 dark:text-rose-300">Could not load data.</b>
      <p className="mt-1 whitespace-pre-wrap text-gray-700 dark:text-gray-300">{message}</p>
      {/SAML|SSO/i.test(message) && (
        <p className="mt-2 text-gray-700 dark:text-gray-300">
          Your token must be authorized for the organization&apos;s SSO. Run{" "}
          <code className="rounded bg-gray-100 px-1 dark:bg-white/10">gh auth refresh -h github.com</code> or authorize the PAT under GitHub →
          Settings → Tokens.
        </p>
      )}
    </div>
  );
}
