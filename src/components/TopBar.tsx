import type { AuthStatus } from "@/lib/auth";
import { Brand } from "./Sidebar";
import { SignedInAs } from "./SignedInAs";
import { ThemeToggle } from "./ThemeToggle";

/** Sticky glass bar at the top of every page. */
export function TopBar({
  auth,
  children,
  right,
}: {
  auth?: Extract<AuthStatus, { ok: true }>;
  children?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="glass sticky top-0 z-20 border-b border-(--line)">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="lg:hidden">
          <Brand compact />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-4">{children}</div>
        {right}
        {auth && <SignedInAs status={auth} />}
        <ThemeToggle />
      </div>
    </header>
  );
}
