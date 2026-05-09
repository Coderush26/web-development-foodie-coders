import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  tone?: "default" | "accent" | "warning";
};

const toneClasses = {
  default:
    "border-line/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,250,0.78))]",
  accent:
    "border-accent/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(235,249,246,0.86))]",
  warning:
    "border-accent-strong/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,244,237,0.86))]",
} as const;

export function SectionCard({ title, description, children, tone = "default" }: SectionCardProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-[1.75rem] border p-6 shadow-[0_24px_70px_-52px_rgba(18,40,58,0.7)] backdrop-blur-xl ${toneClasses[tone]}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(18,40,58,0.14),transparent)]" />
      <div className="relative space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-7 text-muted">{description}</p>
        ) : null}
      </div>
      <div className="relative mt-5">{children}</div>
    </section>
  );
}
