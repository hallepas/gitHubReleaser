"use server";

import {
  cancelGhLogin,
  getGhLoginState,
  GH_HOST,
  listGhAccounts,
  startGhLogin,
  switchGhAccount,
  type GhAccount,
  type LoginState,
} from "@/lib/ghAuth";

export type AccountsResult =
  | { ok: true; host: string; accounts: GhAccount[] }
  | { ok: false; host: string; error: string };

export async function loadGhAccounts(): Promise<AccountsResult> {
  try {
    return { ok: true, host: GH_HOST, accounts: await listGhAccounts() };
  } catch (e) {
    return { ok: false, host: GH_HOST, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function switchAccount(login: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await switchGhAccount(String(login));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  return { ok: true };
}

export async function beginGhLogin(): Promise<LoginState> {
  if (process.env.GITHUB_TOKEN) return { state: "error", message: "GITHUB_TOKEN in .env.local is used instead of the GitHub CLI." };
  return startGhLogin();
}

export async function pollGhLogin(): Promise<LoginState> {
  return getGhLoginState();
}

export async function abortGhLogin(): Promise<void> {
  cancelGhLogin();
}
