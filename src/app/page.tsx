import Link from "next/link";

export const dynamic = "force-dynamic";

export default function Home() {
  const repos = (process.env.DASHBOARD_REPOS ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter((r) => /^[\w.-]+\/[\w.-]+$/.test(r));

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Release Dashboard</h1>
      <p className="mt-1 text-sm text-gray-600">
        Azure DevOps–style release overview for GitHub environments, deployments and workflow runs.
      </p>

      <form action="/go" className="mt-8 flex gap-2">
        <input
          name="repo"
          required
          placeholder="owner/repo"
          pattern="[\w.\-]+/[\w.\-]+"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Open</button>
      </form>

      {repos.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-gray-500">Configured repositories</h2>
          <ul className="mt-3 divide-y divide-gray-100 rounded border border-gray-200">
            {repos.map((r) => (
              <li key={r}>
                <Link href={`/r/${r}/deployments`} className="block px-4 py-3 text-sm text-blue-700 hover:bg-gray-50">
                  {r}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
