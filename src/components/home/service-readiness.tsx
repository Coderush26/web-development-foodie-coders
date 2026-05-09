type ExternalService = {
  name: string;
  purpose: string;
  apiKeyEnv: string | null;
  requiredInPhase: string;
  configured: boolean;
  notes: string;
};

type ServiceReadinessProps = {
  services: readonly ExternalService[];
  envNames: readonly string[];
};

export function ServiceReadiness({ services, envNames }: ServiceReadinessProps) {
  return (
    <section className="rounded-4xl border border-line bg-surface p-6 shadow-lg shadow-slate-900/5">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
          External integrations
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          API and env planning
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          Phase 1 does not require any external API to run. These names are fixed now so later
          phases can reuse them without guesswork.
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        {services.map((service) => (
          <div key={service.name} className="rounded-2xl border border-line bg-white/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{service.name}</h3>
                <p className="mt-1 text-sm text-muted">{service.purpose}</p>
              </div>
              <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                {service.requiredInPhase}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-muted">{service.notes}</p>
            <p className="mt-3 font-mono text-xs uppercase tracking-[0.18em] text-accent">
              {service.apiKeyEnv ? `Key: ${service.apiKeyEnv}` : "No API key required"}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-line bg-white/55 p-4">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted">
          Env names to reserve
        </p>
        <p className="mt-2 text-sm leading-7 text-muted">{envNames.join(" • ")}</p>
      </div>
    </section>
  );
}
