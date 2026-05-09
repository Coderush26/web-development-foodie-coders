import Link from "next/link";
import type { ReactNode } from "react";

type AppShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function AppShell({ eyebrow, title, description, children, actions }: AppShellProps) {
  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-8 px-5 py-6 lg:px-10 lg:py-10">
      <div className="relative overflow-hidden rounded-[2rem] border border-line/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(244,248,248,0.94))] p-7 shadow-[0_30px_90px_-56px_rgba(18,40,58,0.48)] backdrop-blur-xl lg:p-10">
        <div className="pointer-events-none absolute -right-20 top-0 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-accent-strong/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(15,118,110,0.4),transparent)]" />
        <div className="relative flex flex-col gap-6 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Link href="/" className="font-mono text-sm uppercase tracking-[0.28em] text-accent">
              Fleet Crisis Ops
            </Link>
            <div className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">{eyebrow}</p>
              <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                {title}
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-muted">{description}</p>
            </div>
          </div>
          {actions}
        </div>
        <div className="relative mt-8 flex flex-col gap-6">{children}</div>
      </div>
    </main>
  );
}
