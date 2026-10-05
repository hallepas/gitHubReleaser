import type { PullFile } from "@/lib/model";

const MAX_FILES = 300;
const COLLAPSE_ABOVE = 400;

type Line = { kind: "hunk" | "meta" | "add" | "del" | "ctx"; text: string; old?: number; new?: number };

function parsePatch(patch: string): Line[] {
  const lines: Line[] = [];
  let oldNo = 0;
  let newNo = 0;
  for (const raw of patch.split("\n")) {
    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) {
      oldNo = Number(hunk[1]);
      newNo = Number(hunk[2]);
      lines.push({ kind: "hunk", text: raw });
    } else if (raw.startsWith("+")) {
      lines.push({ kind: "add", text: raw.slice(1), new: newNo++ });
    } else if (raw.startsWith("-")) {
      lines.push({ kind: "del", text: raw.slice(1), old: oldNo++ });
    } else if (raw.startsWith("\\")) {
      lines.push({ kind: "meta", text: raw });
    } else {
      lines.push({ kind: "ctx", text: raw.slice(1), old: oldNo++, new: newNo++ });
    }
  }
  return lines;
}

const ROW: Record<Line["kind"], string> = {
  add: "bg-green-50 dark:bg-green-950/50",
  del: "bg-red-50 dark:bg-red-950/50",
  ctx: "",
  hunk: "bg-blue-50 text-gray-600 dark:bg-blue-950/40 dark:text-gray-400",
  meta: "text-gray-500 dark:text-gray-500",
};

const SIGN: Record<Line["kind"], string> = { add: "+", del: "-", ctx: " ", hunk: "", meta: "" };

const STATUS: Record<PullFile["status"], string> = {
  added: "Added",
  removed: "Deleted",
  modified: "Modified",
  renamed: "Renamed",
  copied: "Copied",
  changed: "Changed",
  unchanged: "Unchanged",
};

function Diff({ patch }: { patch: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-xs leading-5">
        <tbody>
          {parsePatch(patch).map((l, i) =>
            l.kind === "hunk" || l.kind === "meta" ? (
              <tr key={i} className={ROW[l.kind]}>
                <td colSpan={4} className="whitespace-pre px-3">
                  {l.text}
                </td>
              </tr>
            ) : (
              <tr key={i} className={ROW[l.kind]}>
                <td className="w-12 select-none px-2 text-right text-gray-400 dark:text-gray-600">{l.old}</td>
                <td className="w-12 select-none px-2 text-right text-gray-400 dark:text-gray-600">{l.new}</td>
                <td className="w-4 select-none text-center">{SIGN[l.kind]}</td>
                <td className="whitespace-pre pr-3">{l.text}</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function Counts({ file }: { file: Pick<PullFile, "additions" | "deletions"> }) {
  return (
    <span className="font-mono text-xs">
      <span className="text-green-700 dark:text-green-400">+{file.additions}</span>{" "}
      <span className="text-red-700 dark:text-red-400">−{file.deletions}</span>
    </span>
  );
}

export function PullRequestFiles({ files }: { files: PullFile[] }) {
  const shown = files.slice(0, MAX_FILES);
  const total = files.reduce((s, f) => ({ additions: s.additions + f.additions, deletions: s.deletions + f.deletions }), {
    additions: 0,
    deletions: 0,
  });
  return (
    <section className="px-6 py-4">
      <h2 className="flex items-center gap-3 text-sm font-medium">
        {files.length} {files.length === 1 ? "file" : "files"} changed <Counts file={total} />
      </h2>
      <ul className="mt-2 columns-1 text-xs md:columns-2">
        {shown.map((f, i) => (
          <li key={f.filename} className="flex items-center gap-2 py-0.5">
            <Counts file={f} />
            <a href={`#file-${i}`} className="truncate font-mono text-blue-700 hover:underline dark:text-blue-400">
              {f.filename}
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-4">
        {shown.map((f, i) => (
          <details
            key={f.filename}
            id={`file-${i}`}
            open={f.additions + f.deletions <= COLLAPSE_ABOVE}
            className="group scroll-mt-4 overflow-hidden rounded border border-gray-200 dark:border-gray-800"
          >
            <summary className="flex cursor-pointer items-center gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs dark:border-gray-800 dark:bg-gray-900">
              <span className="text-gray-500 transition-transform group-open:rotate-90" aria-hidden>
                ▸
              </span>
              <span className="rounded border border-gray-300 px-1.5 text-gray-600 dark:border-gray-700 dark:text-gray-400">
                {STATUS[f.status]}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono">
                {f.previous_filename && <>{f.previous_filename} → </>}
                {f.filename}
              </span>
              <Counts file={f} />
              <a href={f.blob_url} target="_blank" rel="noreferrer" className="text-gray-500 hover:underline dark:text-gray-400">
                View file ↗
              </a>
            </summary>
            {f.patch ? (
              <Diff patch={f.patch} />
            ) : (
              <p className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
                No diff available (binary file, rename without changes, or diff too large).
              </p>
            )}
          </details>
        ))}
      </div>
      {files.length > MAX_FILES && (
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Showing the first {MAX_FILES} of {files.length} files. Open the pull request on GitHub to see the rest.
        </p>
      )}
    </section>
  );
}
