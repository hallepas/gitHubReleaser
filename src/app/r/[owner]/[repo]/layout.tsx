import { RepoHeader } from "@/components/RepoHeader";
import { SetupGuide } from "@/components/SetupGuide";
import { TopBar } from "@/components/TopBar";
import { getAuthStatus } from "@/lib/auth";

export default async function RepoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  const auth = await getAuthStatus();
  if (!auth.ok) {
    return (
      <>
        <TopBar />
        <SetupGuide status={auth} />
      </>
    );
  }
  return (
    <>
      <RepoHeader owner={owner} repo={repo} auth={auth} />
      <main className="flex flex-1 flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </>
  );
}
