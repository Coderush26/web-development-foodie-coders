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
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 lg:px-10 lg:py-12">
      <div className="rounded-4xl border border-line bg-surface p-8 shadow-xl shadow-slate-900/5 backdrop-blur lg:p-10">
        <div className="flex flex-col gap-6 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
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
        <div className="mt-8 flex flex-col gap-6">{children}</div>
      </div>
    </main>
  );
}
