import { cache, Suspense } from "react";
import { EyeIcon, LayersIcon, PullRequestIcon, StarIcon } from "@/components/icons";
import { PullRequestList } from "@/components/PullRequestList";
import { FavoriteTiles, LocalCount, RecentRepos } from "@/components/RepoLists";
import { RepoPicker } from "@/components/RepoPicker";
import { AuthWarnings, SetupGuide } from "@/components/SetupGuide";
import { TopBar } from "@/components/TopBar";
import { CountPill, EmptyState, SectionHeading, StatCard } from "@/components/ui";
import { getAuthStatus } from "@/lib/auth";
import { getAllRepos } from "@/lib/repos";
import { getReviewRequests } from "@/lib/pulls";

export const dynamic = "force-dynamic";

// Shared by the counter and the list so GitHub is only asked once per request.
const reviewRequests = cache(getReviewRequests);

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: process.env.DASHBOARD_TIMEZONE ?? "Europe/Zurich" }).format(
      new Date(),
    ),
  );
  return hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

async function RepoCount() {
  const repos = await getAllRepos().catch(() => undefined);
  return <>{repos ? repos.length : "–"}</>;
}

async function ReviewCount() {
  const pulls = await reviewRequests().catch(() => undefined);
  return <>{pulls ? pulls.length : "–"}</>;
}

async function ReviewRequests() {
  let pulls;
  try {
    pulls = await reviewRequests();
  } catch (e) {
    return (
      <p className="p-5 text-sm text-red-700 dark:text-red-400">
        Could not load review requests: {e instanceof Error ? e.message : String(e)}
      </p>
    );
  }
  if (!pulls.length) {
    return (
      <EmptyState icon={<PullRequestIcon className="h-5 w-5" />} title="You're all caught up">
        Nothing is waiting for your review right now.
      </EmptyState>
    );
  }
  return <PullRequestList pulls={pulls} showRepo />;
}

const Skeleton = ({ className }: { className: string }) => <span className={`skeleton inline-block ${className}`} />;

export default async function Home() {
  const auth = await getAuthStatus();
  if (!auth.ok) {
    return (
      <>
        <TopBar>
          <span className="text-sm font-medium">Setup</span>
        </TopBar>
        <SetupGuide status={auth} />
      </>
    );
  }
  // Warm the repository cache so the search box is ready immediately.
  getAllRepos().catch(() => {});
  const suggested = (process.env.DASHBOARD_REPOS ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter((r) => /^[\w.-]+\/[\w.-]+$/.test(r));

  return (
    <>
      <AuthWarnings warnings={auth.warnings} />
      <TopBar auth={auth}>
        <span className="text-sm font-medium">Overview</span>
      </TopBar>
      <main className="stagger mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative z-10">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-linear-to-br from-brand-600 via-indigo-600 to-cyan-500 dark:from-brand-700 dark:via-indigo-800 dark:to-cyan-700" />
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" />
            <div className="absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-fuchsia-400/25 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.12)_1px,transparent_1px)] bg-size-[18px_18px] mask-[linear-gradient(to_bottom,black,transparent)]" />
          </div>
          <div className="relative px-6 py-10 sm:px-10">
            <p className="text-sm font-medium text-white/70">{greeting()},</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{auth.name ?? auth.login}</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Azure DevOps–style release overview for GitHub environments, deployments and workflow runs.
            </p>
            <div className="mt-6 max-w-2xl">
              <RepoPicker autoFocus size="lg" />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Awaiting your review"
            tone="amber"
            icon={<PullRequestIcon className="h-5 w-5" />}
            href="#reviews"
            value={
              <Suspense fallback={<Skeleton className="h-8 w-10" />}>
                <ReviewCount />
              </Suspense>
            }
            hint="Pull requests requesting you"
          />
          <StatCard label="Favorites" tone="brand" icon={<StarIcon className="h-5 w-5" />} value={<LocalCount kind="favorites" />} hint="Pinned in the sidebar" />
          <StatCard label="Recently viewed" tone="cyan" icon={<EyeIcon className="h-5 w-5" />} value={<LocalCount kind="recent" />} hint="Repositories you opened" />
          <StatCard
            label="Repositories"
            tone="emerald"
            icon={<LayersIcon className="h-5 w-5" />}
            value={
              <Suspense fallback={<Skeleton className="h-8 w-14" />}>
                <RepoCount />
              </Suspense>
            }
            hint={`Visible to ${auth.login}`}
          />
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <SectionHeading title="Favorites" icon={<StarIcon filled className="h-4 w-4 text-amber-400" />} />
            <FavoriteTiles />
          </section>
          <section>
            <SectionHeading title="Jump back in" icon={<EyeIcon className="h-4 w-4" />} />
            <div className="card p-3">
              <RecentRepos suggested={suggested} />
            </div>
          </section>
        </div>

        <section id="reviews" className="scroll-mt-20">
          <SectionHeading
            title="Waiting for your review"
            icon={<PullRequestIcon className="h-4 w-4" />}
            count={
              <Suspense>
                <CountPill tone="amber">
                  <ReviewCount />
                </CountPill>
              </Suspense>
            }
          />
          <div className="card">
            <Suspense
              fallback={
                <div className="flex flex-col gap-3 p-5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-9 w-9 rounded-full!" />
                      <div className="flex flex-1 flex-col gap-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              }
            >
              <ReviewRequests />
            </Suspense>
          </div>
        </section>
      </main>
    </>
  );
}
