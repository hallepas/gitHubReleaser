# Release Dashboard

An Azure DevOps "Releases"-style overview for GitHub. Each release (tag, branch or commit) is a row, and each environment is a coloured stage chip. You can approve, reject and redeploy directly from the dashboard.

```
Releases              Created               Stages
1.0.2-preview.9       30/09/2026 11:40:22   [✔ app-d] [⏱ app-q ▾] [○ app-p]
1.0.2-preview.8       30/09/2026 07:23:48   [✔ app-d] [⏱ app-q ▾] [○ app-p]
1.0.1                 30/07/2026 15:15:25   [✔ app-d] [✖ app-q]   [○ app-p]
```

## Features

- **Releases view**: GitHub Deployments grouped by tag or branch, with one column per environment. Columns are sorted in pipeline order automatically.
- **Pipelines view**: GitHub Actions runs of a workflow, with one column per job.
- **Current version per environment**: summary cards at the top, and a ring around the live version's chip.
- **Pending approvals**: a banner with **Approve / Reject** buttons.
- **Stage menu**: click any stage chip to:
  - approve or reject it. Older releases whose run is still waiting can be approved too.
  - **Redeploy \<version\> to \<stage\>**: re-run that stage's job and all later jobs. The run must be finished and at most 30 days old.
  - **Continue pipeline**: re-run failed or rejected jobs.
  - **Run "\<workflow\>" again for \<tag\>**: start the full pipeline for an older version. The workflow needs a `workflow_dispatch` trigger.
  - open the stage in GitHub.
- **Repository search**: suggestions as you type, across every repository you can access.
- **★ Favorites** and **Recently viewed** on the home page.
- **Auto-refresh**: every 60 seconds.

Approval gates (GitHub environment protection rules) always apply. GitHub decides who may approve or re-run.

---

## Quick start

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
| Fine-grained | Repository access to the repositories you need, plus: **Metadata** (read), **Contents** (read), **Deployments** (read), **Environments** (read), **Actions** (**read & write**, for approve, re-run and dispatch) |

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
# Repositories shown as "Suggested" on the home page
DASHBOARD_REPOS=my-org/my-service,my-org/other-service
```

### 5. Run

```bash
npm run dev
```

Open **http://localhost:3000** in your normal browser (Chrome, Edge, Safari or Firefox). Search for a repository, then star it ☆ to keep it on the home page.

To use a different port: `PORT=3123 npm run dev` (Windows PowerShell: `$env:PORT=3123; npm run dev`).

### Production mode (faster, no hot reload)

```bash
npm run build
npm start                   # http://localhost:3000
```

---

## Configuration

All settings go in `.env.local`.

| Variable | Default | Description |
|----------|---------|-------------|
| `GITHUB_TOKEN` | output of `gh auth token` | Token used for all GitHub API calls |
| `DASHBOARD_REPOS` | – | Comma-separated `owner/repo` list shown as "Suggested" on the home page |
| `DASHBOARD_HIDE_ENVS` | `copilot` | Environments to hide (comma-separated) |
| `DASHBOARD_MAX_ROWS` | `20` | Releases or runs shown per page |
| `DASHBOARD_TIMEZONE` | `Europe/Zurich` | Timezone for dates |
| `GITHUB_API_URL` | `https://api.github.com` | REST API (for GitHub Enterprise Server: `https://<host>/api/v3`) |
| `GITHUB_GRAPHQL_URL` | `$GITHUB_API_URL/graphql` | GraphQL API (for GitHub Enterprise Server: `https://<host>/api/graphql`) |

URL options:

- `?envs=app-d,app-q,app-p`: show only these environments, in this order.
- `/r/<owner>/<repo>/workflows?workflow=<id>`: choose a workflow in the Pipelines view.

## How it works

| View | GitHub API |
|------|------------|
| Releases | GraphQL `repository.deployments` and `environments` |
| Pipelines | REST `actions/workflows/{id}/runs`, `runs/{id}/jobs` |
| Approve / reject | `POST actions/runs/{id}/pending_deployments` |
| Redeploy stage | `POST actions/jobs/{id}/rerun` |
| Continue pipeline | `POST actions/runs/{id}/rerun-failed-jobs` |
| Run again for a tag | `POST actions/workflows/{id}/dispatches` |

For deployments to show up, your workflow jobs must use GitHub environments:

```yaml
jobs:
  deploy-q:
    environment: app-q          # creates a deployment and enforces the environment's approval rules
    needs: deploy-d
```

## Security

- The GitHub token stays on the server and is never sent to the browser.
- The server listens on **127.0.0.1 only**, because it acts as *you*, including approvals. Don't expose it on a network or share one instance between several people.
- Favorites and recently viewed repos are stored in your browser (`localStorage`).

## Troubleshooting

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
| "No GitHub token found" | Run `gh auth login`, or set `GITHUB_TOKEN` in `.env.local` |
| `Resource protected by organization SAML enforcement` | Authorize your token for SSO (see step 2) |
| Repository not in search | The token has no access to it, or `read:org` is missing. Reload with `/api/repos?refresh` |
| No Approve button, only "Waiting for …" | You're not a required reviewer for that environment |
| "Re-run" options missing | You need write access, the run must be finished, and it must be at most 30 days old |
| Links do nothing inside an IDE's embedded browser | Some embedded browsers block new tabs; use a normal browser |

## Development

```bash
npm run dev        # dev server with hot reload
npx tsc --noEmit   # type check
npm run lint       # ESLint
npm run build      # production build
```

```
src/
  app/                          Next.js App Router
    page.tsx                    Home page (search, favorites)
    r/[owner]/[repo]/…          Releases and Pipelines views
    api/repos                   Repository list for search (cached for 10 min)
    api/stage-options           What can be done with a stage (loaded when a chip is clicked)
    actions.ts                  Server actions: approve, reject, re-run, dispatch
  components/                   UI (MatrixTable, StageMenu, RepoPicker, …)
  lib/
    github.ts                   REST and GraphQL client, token handling
    data.ts                     Builds the release/stage matrix
    stageOptions.ts             Re-run and dispatch rules
    model.ts                    Types and status mapping
```

Built with Next.js 16, React 19, TypeScript and Tailwind CSS 4.
