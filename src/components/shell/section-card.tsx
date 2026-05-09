import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  tone?: "default" | "accent" | "warning";
};

const toneClasses = {
  default: "border-line bg-surface",
  accent: "border-accent/20 bg-white/75",
  warning: "border-accent-strong/20 bg-white/75",
} as const;

export function SectionCard({ title, description, children, tone = "default" }: SectionCardProps) {
  return (
    <section className={`rounded-3xl border p-6 shadow-lg shadow-slate-900/5 ${toneClasses[tone]}`}>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-7 text-muted">{description}</p>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
