"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  closePullRequest,
  mergePullRequest,
  reviewPullRequest,
  updatePullRequestBranch,
  type ReviewResult,
} from "@/app/actions";
import type { MergeMethod, PullRequest } from "@/lib/model";

const METHOD_LABEL: Record<MergeMethod, string> = {
  merge: "Create a merge commit",
  squash: "Squash and merge",
  rebase: "Rebase and merge",
};

const MERGE_WARNING: Record<string, string> = {
  BLOCKED: "Branch protection rules are not satisfied yet. GitHub will refuse the merge unless you may bypass them.",
  BEHIND: "The branch is behind its base branch. If the repository requires up-to-date branches, update it first and wait for the checks.",
  UNSTABLE: "Some checks are not passing.",
};

const BTN = "rounded px-2.5 py-0.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50";
const OUTLINE = "border border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800";

type Mode = "approve" | "changes" | "merge" | "close";

export function PullRequestActions({ pr }: { pr: PullRequest }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>();
  const [comment, setComment] = useState("");
  const [method, setMethod] = useState<MergeMethod>(pr.defaultMergeMethod);
  const [deleteBranch, setDeleteBranch] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();

  const id = { owner: pr.owner, repo: pr.repo, number: pr.number };
  const submit = (action: () => Promise<ReviewResult>, message: string) =>
    startTransition(async () => {
      setError(undefined);
      const res = await action();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(message);
      setMode(undefined);
      router.refresh();
    });

  if (done) return <span className="text-xs font-medium text-green-700 dark:text-green-400">{done}</span>;

  const errorLine = error && <span className="text-xs text-red-700 dark:text-red-400">{error}</span>;
  const cancel = (
    <button disabled={pending} onClick={() => setMode(undefined)} className={`${BTN} ${OUTLINE}`}>
      Cancel
    </button>
  );
  const panel = "flex w-full flex-col gap-2 text-xs lg:w-80";

  if (mode === "approve" || mode === "changes") {
    const approve = mode === "approve";
    const send = () =>
      submit(
        () => reviewPullRequest({ ...id, event: approve ? "APPROVE" : "REQUEST_CHANGES", body: comment }),
        approve ? "✓ Approved" : "Changes requested",
      );
    return (
      <div className={panel}>
        <span>
          {approve ? "Approve" : "Request changes on"} <b>#{pr.number}</b>?
        </span>
        <textarea
          autoFocus
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={approve ? "Comment (optional)" : "What needs to change? (required)"}
          className="rounded border border-gray-300 bg-transparent px-2 py-1 dark:border-gray-700"
        />
        <div className="flex gap-2">
          <button
            disabled={pending || (!approve && !comment.trim())}
            onClick={send}
            className={`${BTN} text-white ${approve ? "bg-green-700 hover:bg-green-800" : "bg-red-700 hover:bg-red-800"}`}
          >
            {pending ? "Sending…" : approve ? "Confirm approve" : "Request changes"}
          </button>
          {cancel}
        </div>
        {errorLine}
      </div>
    );
  }

  if (mode === "merge") {
    const warning = MERGE_WARNING[pr.mergeState];
    return (
      <div className={panel}>
        <span>
          Merge <b>#{pr.number}</b> into <b className="font-mono">{pr.baseRef}</b>?
        </span>
        {pr.mergeMethods.length > 1 ? (
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as MergeMethod)}
            className="rounded border border-gray-300 bg-transparent px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
          >
            {pr.mergeMethods.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABEL[m]}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-gray-600 dark:text-gray-400">{METHOD_LABEL[method]}</span>
        )}
        {pr.canDeleteBranch && !pr.deleteBranchOnMerge && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={deleteBranch} onChange={(e) => setDeleteBranch(e.target.checked)} />
            Delete branch <span className="font-mono">{pr.headRef}</span>
          </label>
        )}
        {warning && <span className="text-amber-700 dark:text-amber-400">{warning}</span>}
        <div className="flex gap-2">
          <button
            disabled={pending}
            onClick={() =>
              submit(
                () => mergePullRequest({ ...id, method, sha: pr.headSha, deleteBranch: deleteBranch && !pr.deleteBranchOnMerge }),
                "✓ Merged",
              )
            }
            className={`${BTN} bg-purple-700 text-white hover:bg-purple-800`}
          >
            {pending ? "Merging…" : "Confirm merge"}
          </button>
          {pr.mergeState === "BEHIND" && (
            <button
              disabled={pending}
              onClick={() =>
                submit(
                  () => updatePullRequestBranch({ ...id, sha: pr.headSha }),
                  "Branch updated – checks are running again",
                )
              }
              className={`${BTN} ${OUTLINE}`}
            >
              Update branch
            </button>
          )}
          {cancel}
        </div>
        {errorLine}
      </div>
    );
  }

  if (mode === "close") {
    const close = (withBranch: boolean) =>
      submit(() => closePullRequest({ ...id, deleteBranch: withBranch }), withBranch ? "Closed, branch deleted" : "Closed");
    return (
      <div className={panel}>
        <span>
          Close <b>#{pr.number}</b> without merging?
        </span>
        <div className="flex flex-wrap gap-2">
          <button disabled={pending} onClick={() => close(false)} className={`${BTN} bg-red-700 text-white hover:bg-red-800`}>
            {pending ? "Closing…" : "Close"}
          </button>
          {pr.canDeleteBranch && (
            <button disabled={pending} onClick={() => close(true)} className={`${BTN} bg-red-700 text-white hover:bg-red-800`}>
              Close & delete branch
            </button>
          )}
          {cancel}
        </div>
        {errorLine}
      </div>
    );
  }

  const mergeBlocked = pr.isDraft
    ? "Draft pull requests can't be merged."
    : pr.mergeable === "CONFLICTING"
      ? "Resolve the conflicts first."
      : undefined;
  const open = (m: Mode) => {
    setError(undefined);
    setMode(m);
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {!pr.viewerIsAuthor && (
        <>
          <button onClick={() => open("approve")} className={`${BTN} bg-green-700 text-white hover:bg-green-800`}>
            Approve
          </button>
          <button onClick={() => open("changes")} className={`${BTN} ${OUTLINE}`}>
            Request changes
          </button>
        </>
      )}
      {pr.canMerge && pr.mergeMethods.length > 0 && (
        <button
          disabled={!!mergeBlocked}
          title={mergeBlocked}
          onClick={() => open("merge")}
          className={`${BTN} bg-purple-700 text-white hover:bg-purple-800`}
        >
          Merge
        </button>
      )}
      {pr.canClose && (
        <button
          onClick={() => open("close")}
          className={`${BTN} border border-red-700 text-red-700 hover:bg-red-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-950`}
        >
          Close
        </button>
      )}
      {errorLine}
    </div>
  );
}
