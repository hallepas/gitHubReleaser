"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createTag } from "@/app/actions";
import type { TagOptions } from "@/lib/tags";
import { compareVersions, parseVersion, tagNameError } from "@/lib/versions";

export function NewTagButton({ owner, repo }: { owner: string; repo: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden>
          <path d="M1 7.78V2.75C1 1.78 1.78 1 2.75 1h5.03c.46 0 .9.18 1.24.51l5.5 5.5a1.75 1.75 0 0 1 0 2.48l-5.03 5.03a1.75 1.75 0 0 1-2.48 0l-5.5-5.5A1.75 1.75 0 0 1 1 7.78Zm1.5 0c0 .07.03.13.07.18l5.5 5.5a.25.25 0 0 0 .36 0l5.03-5.03a.25.25 0 0 0 0-.36l-5.5-5.5a.25.25 0 0 0-.18-.07H2.75a.25.25 0 0 0-.25.25ZM6 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
        </svg>
        New tag
      </button>
      {open && <NewTagDialog owner={owner} repo={repo} onClose={() => setOpen(false)} />}
    </>
  );
}

function NewTagDialog({ owner, repo, onClose }: { owner: string; repo: string; onClose: () => void }) {
  const [options, setOptions] = useState<TagOptions>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tag-options?${new URLSearchParams({ owner, repo })}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? res.statusText);
        if (!cancelled) setOptions(body);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [owner, repo]);

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center bg-black/40 p-4 pt-24" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-tag-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-5 text-sm shadow-xl dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="new-tag-title" className="text-base font-semibold">
            New tag in {owner}/{repo}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
            ✕
          </button>
        </div>
        {error ? (
          <p className="text-red-700 dark:text-red-400">{error}</p>
        ) : !options ? (
          <p className="text-gray-500 dark:text-gray-400">Loading branches and tags…</p>
        ) : !options.canWrite ? (
          <p className="text-gray-500 dark:text-gray-400">You need write access to the repository to create tags.</p>
        ) : options.branches.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">This repository has no branches yet.</p>
        ) : (
          <TagForm owner={owner} repo={repo} options={options} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function TagForm({ owner, repo, options, onClose }: { owner: string; repo: string; options: TagOptions; onClose: () => void }) {
  const router = useRouter();
  const [branchName, setBranchName] = useState(options.defaultBranch ?? options.branches[0].name);
  const [preview, setPreview] = useState(false);
  const [tag, setTag] = useState(options.suggestions.find((s) => !s.preview)?.tag ?? "");
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState<string>();
  const [pending, startTransition] = useTransition();

  const branch = options.branches.find((b) => b.name === branchName) ?? options.branches[0];
  const suggestions = options.suggestions.filter((s) => s.preview === preview);
  const trimmed = tag.trim();
  const nameError = tagNameError(trimmed);
  const exists = options.tags.includes(trimmed);
  const parsed = parseVersion(trimmed);
  const latest = options.latestRelease ? parseVersion(options.latestRelease) : undefined;
  const belowLatest = parsed && latest && compareVersions(parsed, latest) < 0;
  const canSubmit = !nameError && !exists && !pending;

  const chooseKind = (p: boolean) => {
    setPreview(p);
    setTag(options.suggestions.find((s) => s.preview === p)?.tag ?? "");
  };

  const submit = () =>
    startTransition(async () => {
      setError(undefined);
      const res = await createTag({ owner, repo, tag: trimmed, sha: branch.sha });
      if (!res.ok) return setError(res.error);
      setCreated(trimmed);
      router.refresh();
      // GitHub needs a few seconds to queue the triggered run.
      setTimeout(() => router.refresh(), 6000);
    });

  if (created) {
    return (
      <div className="flex flex-col gap-3">
        <p className="font-medium text-green-700 dark:text-green-400">
          ✓ Tag {created} created on {branch.name} ({branch.sha.slice(0, 7)}).
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Workflows that run on tag pushes start within a few seconds. The release run shows up under <b>In progress</b> on the
          Releases tab and moves into the table once it deploys to its first stage.
        </p>
        <div className="flex gap-4 text-xs">
          <a className="text-blue-700 hover:underline dark:text-blue-400" href={`https://github.com/${owner}/${repo}/actions`} target="_blank" rel="noreferrer">
            Open workflow runs ↗
          </a>
          <a className="text-blue-700 hover:underline dark:text-blue-400" href={`https://github.com/${owner}/${repo}/tree/${encodeURIComponent(created)}`} target="_blank" rel="noreferrer">
            View tag ↗
          </a>
        </div>
        <div>
          <button type="button" onClick={onClose} className="rounded bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-700">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-6 text-xs text-gray-600 dark:text-gray-400">
        <span>
          Latest release: <b className="font-mono text-gray-900 dark:text-gray-100">{options.latestRelease ?? "–"}</b>
        </span>
        <span>
          Latest preview: <b className="font-mono text-gray-900 dark:text-gray-100">{options.latestPreview ?? "–"}</b>
        </span>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Branch</span>
        <select
          value={branch.name}
          onChange={(e) => setBranchName(e.target.value)}
          className="rounded border border-gray-300 bg-white px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900"
        >
          {options.branches.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
              {b.name === options.defaultBranch ? " (default)" : ""}
            </option>
          ))}
        </select>
        <span className="truncate text-xs text-gray-500 dark:text-gray-400" title={branch.headline}>
          <span className="font-mono">{branch.sha.slice(0, 7)}</span> {branch.headline} · {branch.date}
        </span>
        {branch.tags.length > 0 && (
          <span className="text-xs text-amber-700 dark:text-amber-400">
            ⚠ This commit is already tagged {branch.tags.join(", ")}.
          </span>
        )}
      </label>

      <div className="flex flex-col gap-2">
        <div role="group" aria-label="Tag type" className="inline-flex self-start rounded border border-gray-300 text-xs dark:border-gray-700">
          {[false, true].map((p) => (
            <button
              key={String(p)}
              type="button"
              aria-pressed={preview === p}
              onClick={() => chooseKind(p)}
              className={`px-3 py-1 first:rounded-l last:rounded-r ${
                preview === p
                  ? "bg-gray-200 font-medium text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                  : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              {p ? "Preview" : "Release"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s.tag}
              type="button"
              title={s.note}
              onClick={() => setTag(s.tag)}
              className={`rounded border px-2 py-0.5 font-mono text-xs ${
                s.tag === trimmed
                  ? "border-blue-600 bg-blue-50 text-blue-900 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-200"
                  : "border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              }`}
            >
              {s.tag} <span className="font-sans text-gray-500 dark:text-gray-400">· {s.note}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Tag name</span>
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && canSubmit && submit()}
          spellCheck={false}
          className="rounded border border-gray-300 bg-transparent px-2 py-1.5 font-mono focus:border-blue-600 focus:outline-none dark:border-gray-700 dark:focus:border-blue-500"
        />
        {trimmed && nameError && <span className="text-xs text-red-700 dark:text-red-400">{nameError}</span>}
        {exists && <span className="text-xs text-red-700 dark:text-red-400">Tag {trimmed} already exists.</span>}
        {!nameError && !exists && !parsed && (
          <span className="text-xs text-amber-700 dark:text-amber-400">Not a version like v1.2.3 – it won&apos;t be used for future suggestions.</span>
        )}
        {!exists && belowLatest && (
          <span className="text-xs text-amber-700 dark:text-amber-400">Lower than the latest release {options.latestRelease}.</span>
        )}
      </label>

      {!nameError && !exists && (
        <div className="rounded border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-800 dark:bg-gray-950">
          Creates {parsed?.pre ? "preview" : "release"} tag <b className="font-mono">{trimmed}</b> on <b>{branch.name}</b> at{" "}
          <span className="font-mono">{branch.sha.slice(0, 7)}</span>. Workflows triggered by tag pushes start automatically.
        </div>
      )}

      {error && <p className="text-xs text-red-700 dark:text-red-400">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={pending} className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="rounded bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "Creating…" : `Create tag ${trimmed}`}
        </button>
      </div>
    </div>
  );
}
