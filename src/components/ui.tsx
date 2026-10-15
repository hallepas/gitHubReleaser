const TONES = {
  brand: "from-brand-500/15 to-indigo-500/10 text-brand-600 dark:text-brand-300",
  cyan: "from-cyan-400/20 to-blue-500/10 text-cyan-600 dark:text-cyan-300",
  amber: "from-amber-400/20 to-orange-500/10 text-amber-600 dark:text-amber-300",
  emerald: "from-emerald-400/20 to-teal-500/10 text-emerald-600 dark:text-emerald-300",
  rose: "from-rose-400/20 to-red-500/10 text-rose-600 dark:text-rose-300",
};

export type Tone = keyof typeof TONES;

export function IconBadge({ tone, children, className = "h-10 w-10" }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl bg-linear-to-br ring-1 ring-current/10 ring-inset ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ReactNode;
  tone: Tone;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{value}</div>
        </div>
        <IconBadge tone={tone}>{icon}</IconBadge>
      </div>
      {hint && <div className="mt-2 truncate text-xs text-gray-500 dark:text-gray-400">{hint}</div>}
    </>
  );
  const className = "card block p-5 transition-all duration-200";
  return href ? (
    <a href={href} className={`${className} hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/10`}>
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function SectionHeading({ title, icon, action, count }: { title: string; icon?: React.ReactNode; action?: React.ReactNode; count?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon && <span className="text-gray-400 dark:text-gray-500">{icon}</span>}
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {count}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

export function CountPill({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "brand" | "amber" }) {
  const cls = {
    gray: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
    brand: "bg-linear-to-r from-brand-500 to-indigo-500 text-white shadow-sm shadow-brand-500/30",
    amber: "bg-amber-400/20 text-amber-700 dark:text-amber-300",
  }[tone];
  return <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums ${cls}`}>{children}</span>;
}

export function EmptyState({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <IconBadge tone="brand" className="h-12 w-12">
        {icon}
      </IconBadge>
      <div className="mt-1 text-sm font-medium">{title}</div>
      {children && <div className="max-w-md text-xs text-gray-500 dark:text-gray-400">{children}</div>}
    </div>
  );
}
