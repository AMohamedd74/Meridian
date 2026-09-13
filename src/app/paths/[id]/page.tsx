"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ClockIcon } from "@/components/ui/icons";
import {
  CheckBullet,
  Divider,
  ListRow,
  PageShell,
  PrimaryButton,
  PrimaryLink,
  SectionLabel,
  Tag,
} from "@/components/ui/primitives";
import { ErrorState, LoadingScreen } from "@/components/ui/states";
import { taskProgress } from "@/domain/rules";
import type { PathDetailView } from "@/domain/types";
import { api, errorMessage } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

function Section({ title, delay, children, id }: { title: string; delay: number; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="mb-8 animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <SectionLabel as="h3" className="mb-5 tracking-widest">
        {title}
      </SectionLabel>
      {children}
    </section>
  );
}

function Roadmap({ detail }: { detail: PathDetailView }) {
  const content = detail.roadmap?.content;
  if (!content) return null;
  // Horizons get less specific as they extend further out.
  const rows = [
    { label: "Next action", value: content.next_action, strong: true },
    { label: "This week", value: content.this_week.join(" · "), strong: true },
    { label: "30 days", value: content.thirty_days },
    { label: "90 days", value: content.ninety_days },
    { label: "Longer term", value: content.longer_term },
  ];
  return (
    <>
      <Section title="Your roadmap" delay={250}>
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <ListRow key={row.label} className="flex flex-col gap-1 sm:flex-row sm:gap-4">
              <span className="w-28 flex-shrink-0 text-xs font-semibold tracking-wide text-ink-faint uppercase sm:pt-0.5">
                {row.label}
              </span>
              <p className={`text-sm leading-relaxed ${row.strong ? "text-ink-soft" : "text-ink-subtle"}`}>{row.value}</p>
            </ListRow>
          ))}
        </div>
      </Section>
      <Divider className="mb-8" />
    </>
  );
}

export default function PathDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const detail = useResource(() => api.path(id), [id]);
  const [selecting, setSelecting] = useState(false);
  const [selectError, setSelectError] = useState<string | null>(null);

  if (detail.status === "loading") return <LoadingScreen label="Loading direction" />;
  if (detail.status === "error") {
    return (
      <PageShell>
        <ErrorState
          message={detail.error}
          onRetry={detail.reload}
          secondary={
            <Link href="/paths" className="text-sm text-ink-subtle hover:text-white">
              All directions
            </Link>
          }
        />
      </PageShell>
    );
  }

  const { path, current } = detail.data;
  const active = path.user_path?.status === "active";

  const select = async () => {
    setSelecting(true);
    setSelectError(null);
    try {
      await api.selectPath(path.id);
      router.push("/dashboard");
    } catch (e) {
      setSelectError(errorMessage(e));
      setSelecting(false);
    }
  };

  return (
    <PageShell>
      <Link href="/paths" className="mb-8 inline-block text-sm text-ink-subtle transition-colors hover:text-white">
        ← All directions
      </Link>

      <div className="mb-10 animate-fade-in-up">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-primary">
            {active ? "Your current direction" : "A possible direction"}
          </div>
        </div>
        <h1 className="mb-4 text-[clamp(28px,5vw,40px)] font-bold tracking-[-0.03em] text-white">{path.title}</h1>
        {path.description && <p className="text-base leading-relaxed text-ink-muted">{path.description}</p>}
      </div>

      {/* Sections are skipped when a field is missing (e.g. directions restored from partial data). */}
      {(path.why_it_fits.length > 0 || path.strengths.length > 0) && (
        <>
          <Section title="Why this path may fit" delay={100}>
            <div className="flex flex-col gap-3">
              {path.why_it_fits.map((reason) => (
                <ListRow key={reason} className="flex items-start gap-3">
                  <CheckBullet />
                  <p className="text-sm leading-relaxed text-ink-soft">{reason}</p>
                </ListRow>
              ))}
            </div>
            {path.strengths.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs text-ink-faint">Strengths you&apos;d bring:</span>
                {path.strengths.map((s) => (
                  <Tag key={s}>{s}</Tag>
                ))}
              </div>
            )}
          </Section>

          <Divider className="mb-8" />
        </>
      )}

      {path.uncertainties.length > 0 && (
        <>
          <Section title="What we don't know yet" delay={200}>
            <div className="flex flex-col gap-3">
              {path.uncertainties.map((u) => (
                <ListRow key={u}>
                  <p className="text-sm leading-relaxed text-ink-subtle italic">&ldquo;{u}&rdquo;</p>
                  <p className="mt-2 text-xs text-ink-faint">This is something we&apos;ll test.</p>
                </ListRow>
              ))}
            </div>
          </Section>

          <Divider className="mb-8" />
        </>
      )}

      <Section title="Your first 30 days" delay={220}>
        {path.metadata.thirty_day_direction && (
          <p className="mb-4 text-sm leading-relaxed text-ink-muted">{path.metadata.thirty_day_direction}</p>
        )}
        <SectionLabel className="mb-3">You&apos;ll know it worked if</SectionLabel>
        <ul className="flex flex-col gap-2">
          {path.metadata.success_criteria.map((c) => (
            <li key={c} className="flex items-start gap-3 text-sm leading-relaxed text-ink-soft">
              <CheckBullet />
              {c}
            </li>
          ))}
        </ul>
      </Section>

      <Divider className="mb-8" />

      {active && <Roadmap detail={detail.data} />}

      <section id="experiment" className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
        <SectionLabel as="h3" className="mb-5 tracking-widest">
          {active ? "Your current experiment" : "Your first experiment"}
        </SectionLabel>
        <div
          className="rounded-2xl border border-primary/15 p-6 shadow-[0_0_30px_rgba(0,168,255,0.04)]"
          style={{ background: "linear-gradient(135deg, rgba(0,168,255,0.08), rgba(0,50,150,0.05))" }}
        >
          <h4 className="mb-1 text-lg font-semibold tracking-tight text-white">
            {current?.experiment.title ?? path.first_experiment}
          </h4>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs text-ink-subtle">
              <ClockIcon />
              {current?.experiment.duration_days ?? path.experiment_duration} days
            </div>
            {current && (
              <span className="text-xs text-ink-subtle">
                {taskProgress(current.tasks)}% of tasks done
              </span>
            )}
          </div>
          {(current || path.uncertainties[0]) && (
            <p className="mb-6 text-sm leading-relaxed text-ink-muted">
              {current
                ? current.experiment.description
                : `This experiment is designed to answer: ${path.uncertainties[0]}`}
            </p>
          )}

          {active ? (
            <PrimaryLink href="/dashboard">Go to your dashboard →</PrimaryLink>
          ) : (
            <>
              <PrimaryButton onClick={() => void select()} disabled={selecting} aria-busy={selecting}>
                {selecting ? "Building your plan…" : "Start experiment →"}
              </PrimaryButton>
              {selectError && (
                <p className="mt-3 text-center text-xs text-ink-muted" role="alert">
                  {selectError}
                </p>
              )}
              <p className="mt-3 text-center text-xs text-ink-faint">
                You can change direction at any time.
              </p>
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
}
