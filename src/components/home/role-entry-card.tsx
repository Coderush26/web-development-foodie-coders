import Link from "next/link";

type RoleEntryCardProps = {
  title: string;
  href: string;
  summary: string;
  capabilities: readonly string[];
};

export function RoleEntryCard({ title, href, summary, capabilities }: RoleEntryCardProps) {
  return (
    <section className="rounded-4xl border border-line bg-surface p-6 shadow-lg shadow-slate-900/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">Dashboard</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        </div>
        <Link
          href={href}
          className="action-button-light rounded-full border border-accent bg-accent px-4 py-2 text-sm font-semibold shadow-sm shadow-accent/20"
        >
          Open dashboard
        </Link>
      </div>

      <p className="mt-4 max-w-xl text-sm leading-7 text-muted">{summary}</p>

      <ul className="mt-5 space-y-3 text-sm leading-7 text-muted">
        {capabilities.map((capability) => (
          <li key={capability} className="rounded-2xl border border-line bg-white/70 px-4 py-3">
            {capability}
          </li>
        ))}
      </ul>
    </section>
  );
}
