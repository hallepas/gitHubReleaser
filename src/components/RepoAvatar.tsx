const GRADIENTS = [
  "from-violet-500 to-indigo-500",
  "from-cyan-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-fuchsia-500 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-sky-400 to-indigo-500",
  "from-rose-400 to-red-500",
  "from-lime-400 to-emerald-500",
];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/** Repositories often share prefixes (e.g. `team-app-…`), so initials come from the last word of the name. */
function initials(repo: string) {
  const name = repo.split("/").pop() ?? repo;
  const word = name.split(/[-_.]/).filter(Boolean).pop() ?? name;
  return (word[0] ?? "?").toUpperCase() + (word[1] ?? "").toLowerCase();
}

export function RepoAvatar({ repo, size = "md" }: { repo: string; size?: "sm" | "md" | "lg" }) {
  const dims = { sm: "h-6 w-6 rounded-md text-[10px]", md: "h-9 w-9 rounded-lg text-xs", lg: "h-12 w-12 rounded-xl text-base" }[size];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center bg-linear-to-br font-semibold text-white shadow-sm ring-1 ring-white/20 ring-inset ${dims} ${
        GRADIENTS[hash(repo.toLowerCase()) % GRADIENTS.length]
      }`}
    >
      {initials(repo)}
    </span>
  );
}
