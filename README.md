<div align="center">

# 🚀 Release Dashboard

**The Azure DevOps "Releases" view, for GitHub.**<br>
See every release across every environment at a glance, and approve or redeploy without leaving the page.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![Runs locally](https://img.shields.io/badge/runs-locally-2ea44f)

[Features](#-features) · [Quick start](#-quick-start) · [Configuration](#%EF%B8%8F-configuration) · [How it works](#-how-it-works) · [Troubleshooting](#-troubleshooting)

<br>

<img src="docs/screenshots/releases.png" alt="Releases view: every release is a row, every environment a stage" width="100%">

<sub>Screenshots use anonymized repository, user and environment names.</sub>

</div>

## 🤔 Why?

GitHub has environments, deployments and approval gates, but no single page that answers *"which version is running where, and what's waiting for me?"*. Azure DevOps has one. This dashboard brings it to GitHub:

- **One row per release** (tag, branch or commit), **one column per environment**, coloured by status.
- **Approve, reject and redeploy** right from the overview. No clicking through Actions runs.
- **Runs on your machine with your own GitHub login.** No server, no extra permissions, nothing to install in your repositories.

## ✨ Features

<table>
  <tr>
    <td width="42%" valign="top">
      <h3>📋 Releases at a glance</h3>
      <p>GitHub Deployments grouped by tag or branch, with one column per environment in pipeline order.</p>
      <ul>
        <li>Environment cards in promotion order show the <b>version currently live</b> in each environment, with a drift badge: <i>Latest</i>, <i>In sync with …</i> or <i>N behind …</i>.</li>
        <li>Stage chips in pipeline order. A ring and a pulsing dot mark the live version, a striped animated chip a running stage, an amber chip a pending approval.</li>
        <li>A banner lists <b>pending approvals</b> with Approve / Reject buttons. It shows the first three and folds the rest.</li>
        <li><b>In progress</b> shows a live progress bar (jobs done / total) and the step a running release is on, until the run is done.</li>
        <li>A stage only turns green when its whole stage is done (e.g. "Deploy ArgoCD d" after the environment gate), not just the job that uses the environment.</li>
        <li>A hint shows when the default branch has <b>pull requests that are not in any tag yet</b>.</li>
        <li>Relative times ("16h ago") with the exact date next to them.</li>
        <li>Auto-refresh every 60 seconds, every 10 seconds while something is running. A switch in the tab bar turns it off; a countdown ring shows the next refresh and "Updated 12s ago" the age of the data.</li>
      </ul>
    </td>
    <td width="58%"><img src="docs/screenshots/releases.png" alt="Releases view"></td>
  </tr>
  <tr>
    <td width="58%"><img src="docs/screenshots/stage-menu.png" alt="Stage menu with Approve and Reject"></td>
    <td width="42%" valign="top">
      <h3>✅ Approve & redeploy in place</h3>
      <p>Click any stage chip to open its menu:</p>
      <ul>
        <li><b>Approve / Reject</b> a pending gate, also for older releases that are still waiting.</li>
        <li><b>Redeploy &lt;version&gt; to &lt;stage&gt;</b>: re-run that stage and everything after it.</li>
        <li><b>Continue pipeline</b>: re-run failed or rejected jobs.</li>
        <li><b>Run again for &lt;tag&gt;</b>: start the whole pipeline for an older version.</li>
        <li><b>Open in GitHub</b>.</li>
      </ul>
      <p><b>+ New tag</b> creates a tag on any branch to start a release. It shows the latest release and preview, the pull requests merged since the last tag, suggests the next version (release or preview, following your tag style) and blocks tags that already exist.</p>
      <p>Your environment protection rules always apply. GitHub decides who may approve or re-run.</p>
    </td>
  </tr>
  <tr>
    <td width="42%" valign="top">
      <h3>🔎 Jump to any repository</h3>
      <p>Press <kbd>⌘</kbd> <kbd>K</kbd> / <kbd>Ctrl</kbd> <kbd>K</kbd> or <kbd>/</kbd> anywhere and start typing. Suggestions come from <b>every repository you can access</b>, even if you don't know its exact name.</p>
      <ul>
        <li>The <b>sidebar</b> lists your <b>★ favorites</b> and <b>recently viewed</b> repositories for one-click switching. Switching keeps the current tab, e.g. you stay on Pipelines.</li>
        <li>The repository header and tabs stay in place while you switch; the content shows a loading skeleton until GitHub has answered.</li>
        <li><b>Suggested</b> repositories can be preset for your team.</li>
      </ul>
    </td>
    <td width="58%"><img src="docs/screenshots/search.png" alt="Repository search with suggestions"></td>
  </tr>
  <tr>
    <td width="58%"><img src="docs/screenshots/home.png" alt="Overview page in dark mode"></td>
    <td width="42%" valign="top">
      <h3>🏠 Overview</h3>
      <p>Your start page: a greeting with the repository search, and everything you need next.</p>
      <ul>
        <li>Counters for <b>reviews waiting for you</b>, favorites, recently viewed and accessible repositories.</li>
        <li>A tile per favorite with quick links to Releases, History, Pipelines and Pull requests.</li>
        <li><b>Jump back in</b>: recently viewed and suggested repositories.</li>
        <li>Every pull request <b>waiting for your review</b>, across all repositories.</li>
        <li>Light, dark or system theme (toggle in the top bar).</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="42%" valign="top">
      <h3>⚙️ Pipelines view</h3>
      <p>Every run of a GitHub Actions workflow, with <b>one chip per job</b>. Useful for repositories that don't use deployments.</p>
      <ul>
        <li>Pick the workflow from the dropdown. Release/deploy workflows are chosen by default.</li>
        <li>All pending approvals at the top. The first three are shown, the rest are folded.</li>
        <li>The same stage menu as in the Releases view.</li>
      </ul>
    </td>
    <td width="58%"><img src="docs/screenshots/pipelines.png" alt="Pipelines view"></td>
  </tr>
  <tr>
    <td width="58%"><img src="docs/screenshots/history.png" alt="History timeline"></td>
    <td width="42%" valign="top">
      <h3>🕓 History</h3>
      <p>A timeline of every tag on the default branch, newest first.</p>
      <ul>
        <li>The <b>pull requests</b> each tag added since the previous tag, with a compare link.</li>
        <li>Changes on the branch that are <b>not tagged yet</b>.</li>
        <li>Per tag, the status in every environment. A ring marks where it is live.</li>
        <li>Deployed tags from other branches (e.g. previews) appear in between.</li>
        <li>Another branch: <code>?branch=release/1.x</code>.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="42%" valign="top">
      <h3>🔀 Pull requests</h3>
      <p>All open pull requests of a repository, with checks, review status and mergeability at a glance.</p>
      <ul>
        <li>Click a PR to see its description and <b>changed files with the full diff</b>, like GitHub's "Files changed" tab.</li>
        <li><b>Approve</b> or <b>Request changes</b> with a comment.</li>
        <li><b>Merge</b> with any method the repository allows (merge, squash, rebase), optionally deleting the branch.</li>
        <li><b>Close</b> without merging, or <b>Close & delete branch</b>.</li>
        <li>The Overview page lists every PR <b>waiting for your review</b>, across all repositories.</li>
      </ul>
      <p>Branch protection and required reviews still apply. GitHub decides who may merge.</p>
    </td>
    <td width="58%"></td>
  </tr>
  <tr>
    <td width="42%" valign="top">
      <h3>🧭 Built-in setup guide</h3>
      <p>If the dashboard can't reach GitHub as you, it says <b>what's wrong and exactly what to do</b>:</p>
      <ul>
        <li>GitHub CLI not installed or not logged in</li>
        <li>Token invalid, expired or missing scopes</li>
        <li>Corporate proxy blocking the connection</li>
      </ul>
      <p>Fix it, click <b>Check again</b>, done.</p>
    </td>
    <td width="58%"><img src="docs/screenshots/setup-guide.png" alt="Setup guide"></td>
  </tr>
</table>

---

## ⚡ Quick start

**TL;DR**, if you already have Node.js 20.9+ and the GitHub CLI:

```bash
gh auth login
git clone <this-repo-url> release-dashboard && cd release-dashboard
npm install
npm run dev          # → http://localhost:3000
```

Step by step:

### 1. Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| [Node.js](https://nodejs.org/) | **20.9 or newer** (LTS recommended) | `node -v` |
| [GitHub CLI](https://cli.github.com/) *(recommended)* | any | `gh --version` |

### 2. Authenticate with GitHub

Choose **one** option.

**Option A: GitHub CLI (easiest)**

```bash
gh auth login               # choose github.com, HTTPS, log in with a browser
gh auth status              # should show "Logged in to github.com"
```

The dashboard reuses the token from `gh auth token` automatically.

**Option B: Personal access token (PAT)**

Create a token at *GitHub → Settings → Developer settings → Personal access tokens* and put it in `.env.local` (see step 4).

| Token type | Required permissions |
|------------|----------------------|
| Classic | `repo` (add `read:org` so repositories from your organizations appear in search) |
| Fine-grained | Repository access to the repositories you need, plus: **Metadata** (read), **Contents** (**read & write**, for creating tags, merging and deleting branches), **Deployments** (read), **Environments** (read), **Actions** (**read & write**, for approve, re-run and dispatch), **Pull requests** (**read & write**, for reviewing, merging and closing) |

> **Not sure it worked?** Just start the dashboard. It checks the login on every page. If something is wrong (gh not installed, not logged in, token invalid or expired, or proxy certificate problems) it shows a **step-by-step setup guide** instead of the dashboard, with a **Check again** button. When everything works, the header shows *Signed in as &lt;your login&gt;* and whether the token comes from the GitHub CLI or `.env.local`. A yellow banner warns if a classic token is missing the `repo` or `read:org` scope.

> **Organizations with SAML SSO:** after creating the token, click **Configure SSO → Authorize** next to it for your organization. Otherwise you'll get 403/404 errors. With the GitHub CLI, run `gh auth refresh -h github.com` and complete the SSO step.

### 3. Install

```bash
git clone <this-repo-url> release-dashboard
cd release-dashboard
npm install
```

> **Corporate network or proxy?** If `npm install` fails with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` or `SELF_SIGNED_CERT_IN_CHAIN`, see [Troubleshooting](#corporate-proxy--tls-errors).

### 4. Configure (optional)

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```ini
# Leave empty to use `gh auth token`
GITHUB_TOKEN=
# Repositories shown as "Suggested" on the Overview page
DASHBOARD_REPOS=my-org/my-service,my-org/other-service
```

### 5. Run

```bash
npm run dev
```

Open **http://localhost:3000** in your normal browser (Chrome, Edge, Safari or Firefox). Search for a repository (<kbd>⌘</kbd> <kbd>K</kbd> / <kbd>Ctrl</kbd> <kbd>K</kbd> or <kbd>/</kbd>), then star it ☆ to keep it in the sidebar and on the Overview page.

To use a different port: `PORT=3123 npm run dev` (Windows PowerShell: `$env:PORT=3123; npm run dev`).

### Production mode (faster, no hot reload)

```bash
npm run build
npm start                   # http://localhost:3000
```

---

## ⚙️ Configuration

All settings go in `.env.local`.

| Variable | Default | Description |
|----------|---------|-------------|
| `GITHUB_TOKEN` | output of `gh auth token` | Token used for all GitHub API calls |
| `DASHBOARD_REPOS` | – | Comma-separated `owner/repo` list shown as "Suggested" on the Overview page |
| `DASHBOARD_HIDE_ENVS` | `copilot` | Environments to hide (comma-separated) |
| `DASHBOARD_MAX_ROWS` | `20` | Releases, runs or pull requests shown per page |
| `DASHBOARD_TIMEZONE` | `Europe/Zurich` | Timezone for dates |
| `GITHUB_API_URL` | `https://api.github.com` | REST API (for GitHub Enterprise Server: `https://<host>/api/v3`) |
| `GITHUB_GRAPHQL_URL` | `$GITHUB_API_URL/graphql` | GraphQL API (for GitHub Enterprise Server: `https://<host>/api/graphql`) |

URL options:

- `?envs=app-d,app-q,app-p`: show only these environments, in this order.
- `/r/<owner>/<repo>/workflows?workflow=<id>`: choose a workflow in the Pipelines view.

## 🔧 How it works

| View | GitHub API |
|------|------------|
| Releases | GraphQL `repository.deployments` and `environments`; REST `runs/{id}/jobs` for the stage status |
| History, untagged changes | GraphQL `ref.history` with `associatedPullRequests`, `refs` (tags) |
| Pipelines | REST `actions/workflows/{id}/runs`, `runs/{id}/jobs` |
| Approve / reject | `POST actions/runs/{id}/pending_deployments` |
| Redeploy stage | `POST actions/jobs/{id}/rerun` |
| Continue pipeline | `POST actions/runs/{id}/rerun-failed-jobs` |
| Run again for a tag | `POST actions/workflows/{id}/dispatches` |
| New tag | GraphQL `refs` (branches, tags), `POST git/refs` |
| Pull requests | GraphQL `repository.pullRequests`; Overview page: `search` with `review-requested:@me` |
| Changed files | REST `pulls/{n}/files` |
| Approve / request changes | `POST pulls/{n}/reviews` |
| Merge | `PUT pulls/{n}/merge` (with the head SHA you saw, so newer pushes are not merged) |
| Close | `PATCH pulls/{n}` |
| Update branch | `PUT pulls/{n}/update-branch` |
| Delete branch | `DELETE git/refs/heads/{branch}` (never for forks or the default branch) |

For deployments to show up, your workflow jobs must use GitHub environments:

```yaml
jobs:
  deploy-q:
    environment: app-q          # creates a deployment and enforces the environment's approval rules
    needs: deploy-d
```

## 🔒 Security

- The GitHub token stays on the server and is never sent to the browser.
- The server listens on **127.0.0.1 only**, because it acts as *you*, including approvals. Don't expose it on a network or share one instance between several people.
- Favorites, recently viewed repos and the theme are stored in your browser (`localStorage`).

## 🩺 Troubleshooting

The dashboard detects most setup problems itself and shows a guide on the start page:

| Message in the dashboard | Cause | Fix |
|---|---|---|
| *Connect the dashboard to GitHub* | No `GITHUB_TOKEN` and `gh` isn't installed (or not on `PATH`) | Install the GitHub CLI and restart, or set `GITHUB_TOKEN` |
| *Log in to GitHub* | `gh` is installed but not logged in | `gh auth login`, then **Check again** (no restart needed) |
| *Your GitHub login has expired* | GitHub rejected the token (401) | `gh auth login` again, or create a new PAT and restart |
| *Your network blocks the connection to GitHub* | TLS interception by a corporate proxy | See [Corporate proxy / TLS errors](#corporate-proxy--tls-errors) |
| *GitHub is not reachable* | No network / VPN, wrong `GITHUB_API_URL` | Check the connection |

### Corporate proxy / TLS errors

Your company proxy inspects HTTPS traffic with its own root certificate, and Node.js doesn't trust it by default.

**macOS:**

```bash
security find-certificate -a -p /Library/Keychains/System.keychain \
  /System/Library/Keychains/SystemRootCertificates.keychain > ~/.corp-ca.pem
echo 'export NODE_EXTRA_CA_CERTS=~/.corp-ca.pem' >> ~/.zshrc && source ~/.zshrc
```

**Windows (PowerShell):**

```powershell
Get-ChildItem Cert:\LocalMachine\Root | ForEach-Object {
  "-----BEGIN CERTIFICATE-----`n" + [Convert]::ToBase64String($_.RawData, 'InsertLineBreaks') + "`n-----END CERTIFICATE-----"
} | Set-Content -Encoding ascii $HOME\corp-ca.pem
[Environment]::SetEnvironmentVariable('NODE_EXTRA_CA_CERTS', "$HOME\corp-ca.pem", 'User')
# open a new terminal afterwards
```

Then run `npm install` and `npm run dev` again. The API calls to GitHub need the same variable.

### Other problems

| Symptom | Fix |
|---------|-----|
| `Resource protected by organization SAML enforcement` | Authorize your token for SSO (see step 2) |
| Repository not in search | The token has no access to it, or `read:org` is missing. Reload with `/api/repos?refresh` |
| No Approve button, only "Waiting for …" | You're not a required reviewer for that environment |
| "Re-run" options missing | You need write access, the run must be finished, and it must be at most 30 days old |
| Links do nothing inside an IDE's embedded browser | Some embedded browsers block new tabs; use a normal browser |

## 🛠️ Development

```bash
npm run dev        # dev server with hot reload
npx tsc --noEmit   # type check
npm run lint       # ESLint
npm run build      # production build
```

```
src/
  app/                          Next.js App Router
    page.tsx                    Overview page (search, counters, favorites, review requests)
    r/[owner]/[repo]/…          Repo header and tabs (layout), Releases, History, Pipelines and Pull requests views
    api/repos                   Repository list for search (cached for 10 min)
    api/stage-options           What can be done with a stage (loaded when a chip is clicked)
    api/tag-options             Branches, tags and version suggestions for "New tag"
    actions.ts                  Server actions: approve, reject, re-run, dispatch, create tag, review/merge/close PRs
  components/                   UI (Sidebar, MatrixTable, StageMenu, RepoPicker, ThemeToggle, …)
  lib/
    github.ts                   REST and GraphQL client, token handling
    data.ts                     Builds the release/stage matrix
    changes.ts                  Tags on a branch and the pull requests between them
    pulls.ts                    Open pull requests and review requests
    stageOptions.ts             Re-run and dispatch rules
    tags.ts                     Branches and tags for "New tag"
    versions.ts                 Version parsing and next-version suggestions
    model.ts                    Types and status mapping
```

Built with Next.js 16, React 19, TypeScript and Tailwind CSS 4.
