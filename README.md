# Release Dashboard (POC)

An Azure DevOps "Releases"-style overview for GitHub: releases (tags/branches) as rows and environments as coloured stage chips.

![stages](https://img.shields.io/badge/A--UI-succeeded-green) ![stages](https://img.shields.io/badge/UAT--UI-succeeded-green) ![stages](https://img.shields.io/badge/PAV--UI-pending%20approval-blue)

## Views

| Tab | Data source | Rows | Columns |
|-----|-------------|------|---------|
| **Releases (Deployments)** | GitHub Deployments + Environments (GraphQL) | Tag / branch / commit | Environments |
| **Pipelines (Workflow runs)** | GitHub Actions runs + jobs (REST) | Workflow runs | Jobs |

Features:
- Repository search with type-ahead over every repo your token can access (cached server-side for 10 min).
- ★ Favorites and "Recently viewed" on the home page (stored in the browser's localStorage).
- "Pending approval on X stage" banner (environment protection rules).
- **Approve / Reject** pending stages directly in the dashboard (banner buttons, or click a blue waiting chip).
  Uses `POST /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments`; GitHub enforces that you are a required reviewer.
  Other waiting stages show who has to approve. Older releases whose run is still waiting can be approved too.
- **Release an older version**: click any stage chip to get the options GitHub allows for it:
  - *Redeploy &lt;version&gt; to &lt;stage&gt;* – re-runs that stage's job and all later jobs (run finished, ≤ 30 days old).
  - *Continue pipeline* – re-runs failed/rejected jobs so the pipeline continues to later stages.
  - *Run "&lt;workflow&gt;" again for &lt;tag&gt;* – `workflow_dispatch` on that tag (full pipeline; needs `workflow_dispatch` in the workflow).
  Approval gates always apply; re-running requires write access to the repository.
- Current live version per environment (ringed chip + summary cards).
- Approvals that were overtaken by a newer deployment are shown as cancelled.
- Columns are auto-ordered by pipeline order; override with `?envs=A-UI,UAT-UI,PAV-UI`.
- Auto-refresh every 60 s; every chip links to the GitHub run/job log.

## Getting started

```bash
cp .env.example .env.local   # set DASHBOARD_REPOS, optionally GITHUB_TOKEN
npm install
npm run dev                  # http://localhost:3000
```

The server binds to `127.0.0.1` only, because it acts with your GitHub token (including approvals).

Authentication happens server-side only. `GITHUB_TOKEN` is used if set, otherwise the token from `gh auth token`.
The token needs read access to the repo's deployments, environments and actions (and SSO authorization for SSO-protected orgs).

### Corporate proxy (TLS interception)

If `npm install` or the GitHub API calls fail with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, export the macOS trusted CAs and point Node at them:

```bash
security find-certificate -a -p /Library/Keychains/System.keychain \
  /System/Library/Keychains/SystemRootCertificates.keychain > ~/.macos-ca.pem
export NODE_EXTRA_CA_CERTS=~/.macos-ca.pem
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `GITHUB_TOKEN` | `gh auth token` | Token used for GitHub API calls |
| `DASHBOARD_REPOS` | – | Comma-separated `owner/repo` list shown as "Suggested" on the home page |
| `DASHBOARD_HIDE_ENVS` | `copilot` | Environments to hide |
| `DASHBOARD_MAX_ROWS` | `20` | Rows per view |
| `DASHBOARD_TIMEZONE` | `Europe/Zurich` | Timezone for dates |
| `GITHUB_API_URL` / `GITHUB_GRAPHQL_URL` | github.com | For GitHub Enterprise Server |
