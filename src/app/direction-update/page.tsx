"use client";

import { ArrowRightIcon } from "@/components/ui/icons";
import { AIDot, Card, PageShell, PrimaryLink, SectionLabel } from "@/components/ui/primitives";
import { EmptyState, ErrorState, LoadingScreen } from "@/components/ui/states";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

function Snapshot({ label, title, level, highlight }: { label: string; title: string; level: number; highlight?: boolean }) {
  return (
    <div className="text-center">
      <SectionLabel tone={highlight ? "primary" : "faint"} className="mb-3">
        {label}
      </SectionLabel>
      <p className={`mb-2 text-sm ${highlight ? "font-semibold text-ink-soft" : "font-medium text-ink-subtle"}`}>{title}</p>
      <div className={`mb-3 text-3xl font-bold tracking-[-0.03em] ${highlight ? "text-primary" : "text-ink-subtle"}`}>
        {level}%
      </div>
      <div className="h-1 rounded-full bg-white/6">
        {highlight ? (
          <div className="progress-bar h-1" style={{ width: `${level}%` }} />
        ) : (
          <div className="h-1 rounded-full bg-white/15" style={{ width: `${level}%` }} />
        )}
      </div>
    </div>
  );
}

function EvidenceList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs text-ink-faint">{title}</p>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="text-sm leading-relaxed text-ink-muted">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DirectionUpdatePage() {
  const update = useResource(api.latestDirectionUpdate);

  if (update.status === "loading") return <LoadingScreen />;
  if (update.status === "error") {
    return (
      <PageShell width="lg">
        <ErrorState message={update.error} onRetry={update.reload} />
      </PageShell>
    );
  }

  const analysis = update.data?.check_in.analysis;
  if (!update.data || !analysis) {
    return (
      <PageShell width="lg">
        <EmptyState
          title={update.data ? "Your check-in is saved." : "No updates yet."}
          body={
            update.data
              ? "We haven't finished analysing it. Head back to the check-in to try again."
              : "After your first check-in, you'll see how the evidence changed your direction and plan."
          }
          cta={{ href: "/check-in", label: update.data ? "Back to check-in" : "Check in" }}
        />
      </PageShell>
    );
  }

  const { before, after, direction } = analysis;
  const next = update.data.current;

  return (
    <PageShell width="lg">
      <div className="mb-10 animate-fade-in">
        <div className="mb-4 flex items-center gap-2">
          <AIDot size="sm" />
          <span className="text-xs font-semibold text-primary">Direction update</span>
        </div>
        <h1 className="text-[clamp(28px,5vw,40px)] font-bold tracking-[-0.03em] text-white">
          {direction.changed ? "Your path is evolving." : "Here's what your week showed."}
        </h1>
      </div>

      <Card tone="surface" className="mb-6" delay={100}>
        <div className="mb-6 grid grid-cols-2 gap-4">
          <Snapshot label="Before" title={before.title} level={before.exploration_level} />
          <Snapshot label="After" title={after.title} level={after.exploration_level} highlight />
        </div>

        {direction.changed && (
          <div className="flex items-center justify-center gap-3 border-y border-white/5 py-4">
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-full border border-primary/10 bg-primary/6 px-4 py-2">
              <span className="text-xs text-ink-subtle">{before.title}</span>
              <ArrowRightIcon stroke="#00A8FF" />
              <span className="text-xs font-medium text-primary">{after.title}</span>
            </div>
          </div>
        )}

        <p className="mt-4 text-sm leading-relaxed text-ink-subtle">{direction.explanation}</p>
        <p className="mt-3 text-xs text-ink-faint">Exploration level is a rough internal signal, not a measurement.</p>
      </Card>

      <Card tone="raised" className="mb-6" delay={200}>
        {direction.shifts.length > 0 ? (
          <>
            <SectionLabel className="mb-4">What shifted</SectionLabel>
            <div className="flex flex-col gap-3">
              {direction.shifts.map(({ label, delta }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-ink-muted">{label}</span>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-sm font-semibold"
                    style={{
                      background: delta >= 0 ? "rgba(0,168,255,0.08)" : "rgba(255,255,255,0.04)",
                      color: delta >= 0 ? "#00A8FF" : "#5A5A72",
                    }}
                  >
                    {delta >= 0 ? `+${delta}` : `−${Math.abs(delta)}`}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <SectionLabel className="mb-4">What we noticed</SectionLabel>
            <div className="flex flex-col gap-4">
              <EvidenceList title="Supports this direction" items={analysis.evidence_for} />
              <EvidenceList title="Points away from it" items={analysis.evidence_against} />
              <EvidenceList title="Patterns" items={analysis.patterns} />
              <EvidenceList title="Still unknown" items={analysis.open_uncertainties} />
            </div>
          </>
        )}
      </Card>

      {next && (
        <Card tone="accent" className="mb-8" delay={280}>
          <SectionLabel tone="primary" className="mb-2">
            Your next experiment
          </SectionLabel>
          <h2 className="mb-2 text-[18px] font-semibold tracking-tight text-white">{next.experiment.title}</h2>
          <p className="mb-5 text-sm leading-relaxed text-ink-muted">{next.experiment.description}</p>
          <PrimaryLink href="/dashboard">Continue exploring →</PrimaryLink>
        </Card>
      )}
    </PageShell>
  );
}
