import type { AuthStatus } from "@/lib/auth";
import { CheckAgainButton } from "./CheckAgainButton";

type Problem = Extract<AuthStatus, { ok: false }>;

const PAT_URL =
  "https://github.com/settings/tokens/new?scopes=repo,read:org&description=Release%20Dashboard";

function Code({ children }: { children: React.ReactNode }) {
  return <pre className="mt-2 overflow-x-auto rounded bg-gray-900 px-3 py-2 text-xs text-gray-100">{children}</pre>;
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-medium">{title}</div>
        <div className="mt-1 text-sm text-gray-700">{children}</div>
      </div>
    </li>
  );
}

function CliSteps({ installed }: { installed: boolean }) {
  let n = 1;
  return (
    <ol className="flex flex-col gap-5">
      {!installed && (
        <Step n={n++} title="Install the GitHub CLI">
          macOS:
          <Code>brew install gh</Code>
          Windows (PowerShell):
          <Code>winget install --id GitHub.cli</Code>
          Or download it from{" "}
          <a className="text-blue-700 underline" href="https://cli.github.com" target="_blank" rel="noreferrer">
            cli.github.com
          </a>
          . Afterwards <b>restart the dashboard</b> (stop it with Ctrl+C and run <code>npm run dev</code> again) so it finds <code>gh</code>.
        </Step>
      )}
      <Step n={n++} title="Log in to GitHub">
        In a terminal run the following and choose <i>GitHub.com → HTTPS → Login with a web browser</i>:
        <Code>gh auth login</Code>
      </Step>
      <Step n={n++} title="Authorize SSO (if your organization uses it)">
        If your organization enforces SAML single sign-on, run:
        <Code>gh auth refresh -h github.com</Code>
        and approve the SSO request in the browser.
      </Step>
      <Step n={n++} title="Check again">
        Click <b>Check again</b> below – no restart needed.
      </Step>
    </ol>
  );
}

function PatSteps() {
  return (
    <ol className="flex flex-col gap-5">
      <Step n={1} title="Create a personal access token">
        <a className="text-blue-700 underline" href={PAT_URL} target="_blank" rel="noreferrer">
          Create a classic token with <code>repo</code> and <code>read:org</code>
        </a>{" "}
        (pre-filled). For SSO organizations click <b>Configure SSO → Authorize</b> next to the token afterwards.
      </Step>
      <Step n={2} title="Put it into .env.local">
        In the dashboard folder create or edit <code>.env.local</code>:
        <Code>GITHUB_TOKEN=ghp_your_token_here</Code>
      </Step>
      <Step n={3} title="Restart the dashboard">
        Stop it with Ctrl+C and run <code>npm run dev</code> again, then click <b>Check again</b>.
      </Step>
    </ol>
  );
}

function TlsSteps() {
  return (
    <ol className="flex flex-col gap-5">
      <Step n={1} title="Export your company's trusted certificates">
        macOS:
        <Code>{`security find-certificate -a -p /Library/Keychains/System.keychain \\
  /System/Library/Keychains/SystemRootCertificates.keychain > ~/.corp-ca.pem`}</Code>
        Windows (PowerShell):
        <Code>{`Get-ChildItem Cert:\\LocalMachine\\Root | ForEach-Object {
  "-----BEGIN CERTIFICATE-----\`n" + [Convert]::ToBase64String($_.RawData, 'InsertLineBreaks') + "\`n-----END CERTIFICATE-----"
} | Set-Content -Encoding ascii $HOME\\corp-ca.pem`}</Code>
      </Step>
      <Step n={2} title="Tell Node.js to trust them and restart">
        macOS:
        <Code>{`echo 'export NODE_EXTRA_CA_CERTS=~/.corp-ca.pem' >> ~/.zshrc && source ~/.zshrc
npm run dev`}</Code>
        Windows (PowerShell, then open a new terminal):
        <Code>{`[Environment]::SetEnvironmentVariable('NODE_EXTRA_CA_CERTS', "$HOME\\corp-ca.pem", 'User')
npm run dev`}</Code>
      </Step>
    </ol>
  );
}

export function SetupGuide({ status }: { status: Problem }) {
  const title = {
    "gh-missing": "Connect the dashboard to GitHub",
    "gh-not-logged-in": "Log in to GitHub",
    "no-token": "Connect the dashboard to GitHub",
    "invalid-token": "Your GitHub login has expired",
    tls: "Your network blocks the connection to GitHub",
    network: "GitHub is not reachable",
    unknown: "GitHub login check failed",
  }[status.problem];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-5">
        <h2 className="text-lg font-semibold text-amber-900">⚠ {title}</h2>
        <p className="mt-1 text-sm text-amber-900">{status.message}</p>
        <p className="mt-2 text-xs text-amber-800">
          The dashboard acts as <b>you</b> on GitHub. It uses <code>GITHUB_TOKEN</code> from <code>.env.local</code> if set,
          otherwise the login of the GitHub CLI (<code>gh auth token</code>). You only see and can do what your GitHub
          account is allowed to.
        </p>
      </div>

      <div className="mt-8">
        {status.problem === "tls" ? (
          <TlsSteps />
        ) : status.problem === "network" ? (
          <p className="text-sm text-gray-700">
            Check your internet / VPN connection. If you use GitHub Enterprise Server, set <code>GITHUB_API_URL</code> in{" "}
            <code>.env.local</code>.
          </p>
        ) : status.source === "env" ? (
          <PatSteps />
        ) : (
          <>
            <h3 className="mb-4 text-sm font-semibold text-gray-500">Option A – GitHub CLI (recommended)</h3>
            <CliSteps installed={status.problem !== "gh-missing"} />
            <h3 className="mb-4 mt-10 text-sm font-semibold text-gray-500">Option B – Personal access token</h3>
            <PatSteps />
          </>
        )}
      </div>

      <div className="mt-8">
        <CheckAgainButton />
      </div>
    </div>
  );
}

export function AuthWarnings({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-900">
      {warnings.map((w) => (
        <div key={w}>
          ⚠ {w}{" "}
          <a className="underline" href={PAT_URL} target="_blank" rel="noreferrer">
            Create a new token
          </a>{" "}
          or run <code>gh auth refresh -s repo,read:org</code>.
        </div>
      ))}
    </div>
  );
}
