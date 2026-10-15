"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { createTag } from "@/app/actions";
import type { TagOptions } from "@/lib/tags";
import { compareVersions, parseVersion, tagNameError } from "@/lib/versions";
import { TagIcon } from "./icons";

export function NewTagButton({ owner, repo }: { owner: string; repo: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-primary py-1.5 text-sm"
      >
        <TagIcon className="h-4 w-4" />
        New tag
      </button>
      {/* Portal: ancestors with backdrop-filter would otherwise become the containing block of the fixed overlay. */}
      {open && createPortal(<NewTagDialog owner={owner} repo={repo} onClose={() => setOpen(false)} />, document.body)}
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
    <div className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center bg-gray-950/40 p-4 pt-24 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-tag-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="popover w-full max-w-lg overflow-hidden rounded-2xl! p-6 text-sm"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="new-tag-title" className="flex items-center gap-3 text-base font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-indigo-500 text-white shadow-md shadow-brand-500/30">
              <TagIcon className="h-4 w-4" />
            </span>
            <span>
              New tag
              <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">
                {owner}/{repo}
              </span>
            </span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100"
          >
            ✕
          </button>
        </div>
        {error ? (
          <p className="text-red-700 dark:text-red-400">{error}</p>
        ) : !options ? (
          <div className="flex flex-col gap-3">
            <span className="skeleton h-4 w-1/2" />
            <span className="skeleton h-9" />
            <span className="skeleton h-9" />
          </div>
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
          <button type="button" onClick={onClose} className="btn btn-primary">
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
          className="input"
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
        {options.untagged?.branch === branch.name && options.untagged.commits > 0 && (
          <div className="mt-1 rounded-lg border border-brand-500/20 bg-brand-500/5 px-3 py-2 text-xs">
            <div className="text-gray-700 dark:text-gray-300">
              New on {branch.name} since <b className="font-mono">{options.untagged.latestTag ?? "the first commit"}</b> ({options.untagged.commits}{" "}
              {options.untagged.commits === 1 ? "commit" : "commits"}):
            </div>
            {options.untagged.pullRequests.length ? (
              <ul className="mt-1 flex flex-col gap-0.5">
                {options.untagged.pullRequests.map((pr) => (
                  <li key={pr.number} className="truncate" title={pr.title}>
                    <a href={pr.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline dark:text-blue-400">
                      #{pr.number}
                    </a>{" "}
                    {pr.title}
                    {pr.author && <span className="text-gray-500 dark:text-gray-400"> · {pr.author}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-1 text-gray-500 dark:text-gray-400">Direct commits only, no pull requests.</div>
            )}
          </div>
        )}
      </label>

      <div className="flex flex-col gap-2">
        <div role="group" aria-label="Tag type" className="inline-flex self-start rounded-lg border border-(--line) bg-gray-100/60 p-0.5 text-xs dark:bg-white/5">
          {[false, true].map((p) => (
            <button
              key={String(p)}
              type="button"
              aria-pressed={preview === p}
              onClick={() => chooseKind(p)}
              className={`rounded-md px-3 py-1 font-medium transition-all ${
                preview === p
                  ? "bg-(--surface-solid) text-gray-900 shadow-sm dark:text-gray-100"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
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
              className={`rounded-full border px-2.5 py-0.5 font-mono text-xs transition-all ${
                s.tag === trimmed
                  ? "border-brand-500 bg-brand-500/10 text-brand-800 shadow-sm shadow-brand-500/20 dark:text-brand-200"
                  : "border-(--line) hover:border-brand-500/40 hover:bg-brand-500/5"
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
          className="input font-mono"
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
        <div className="rounded-lg border border-(--line) bg-gray-50 p-3 text-xs dark:bg-white/5">
          Creates {parsed?.pre ? "preview" : "release"} tag <b className="font-mono">{trimmed}</b> on <b>{branch.name}</b> at{" "}
          <span className="font-mono">{branch.sha.slice(0, 7)}</span>. Workflows triggered by tag pushes start automatically.
        </div>
      )}

      {error && <p className="text-xs text-red-700 dark:text-red-400">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={pending} className="btn btn-outline">
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="btn btn-primary"
        >
          {pending ? "Creating…" : `Create tag ${trimmed}`}
        </button>
      </div>
    </div>
  );
}
