"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TaskList, useTaskToggle } from "@/components/tasks";
import { AIDot, Card, PageShell, PrimaryLink, ProgressLine, SectionLabel } from "@/components/ui/primitives";
import { EmptyState, ErrorState, LoadingScreen } from "@/components/ui/states";
import { daysRemaining, explorationLabel, taskProgress } from "@/domain/rules";
import type { DashboardView } from "@/domain/types";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

function useGreeting() {
  const [greeting, setGreeting] = useState("Welcome back.");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning." : h < 18 ? "Good afternoon." : "Good evening.");
  }, []);
  return greeting;
}

const CONTINUE_LABEL = { definitely: "Definitely", maybe: "Maybe", probably_not: "Probably not" } as const;

function Dashboard({ data, setData }: { data: DashboardView; setData: (u: (d: DashboardView) => DashboardView) => void }) {
  const greeting = useGreeting();
  const { toggle, error: taskError } = useTaskToggle((id, completed) =>
    setData((d) =>
      d.current
        ? { ...d, current: { ...d.current, tasks: d.current.tasks.map((t) => (t.id === id ? { ...t, completed } : t)) } }
        : d,
    ),
  );
  const { path, user_path, roadmap, current, insights, latest_check_in } = data;
  if (!path || !user_path) return null;

  const level = user_path.exploration_score;
  const progress = current ? taskProgress(current.tasks) : 0;
  const daysLeft = current ? daysRemaining(current.experiment.started_at, current.experiment.duration_days) : 0;
  const highlighted = insights.find((i) => i.headline);
  const learned = insights.filter((i) => !i.headline).slice(0, 4);
  const allDone = current !== null && current.tasks.every((t) => t.completed);

  return (
    <PageShell>
      <div className="mb-10 animate-fade-in">
        <p className="mb-1 text-sm text-ink-subtle">{greeting}</p>
        <h1 className="mb-1 text-[clamp(28px,4vw,38px)] font-bold tracking-[-0.03em] text-white">You&apos;re exploring</h1>
        <p className="text-[clamp(28px,4vw,38px)] font-bold tracking-[-0.03em] text-primary">{path.title}</p>

        <div className="mt-6 rounded-2xl border border-white/6 bg-surface p-5">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <SectionLabel className="mb-0.5">Your direction</SectionLabel>
              <p className="text-sm font-semibold text-white">{path.title}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tracking-[-0.03em] text-primary">{level}%</p>
              <p className="text-xs text-ink-subtle">exploration level</p>
            </div>
          </div>
          <ProgressLine value={level} className="mb-3" />
          <p className="text-xs leading-relaxed text-ink-subtle">
            {latest_check_in?.analysis?.direction.explanation ??
              "Your direction is becoming clearer as you collect real-world evidence."}{" "}
            <span className="text-ink-faint">{explorationLabel(level)} — a rough signal, not a measurement.</span>
          </p>
        </div>
      </div>

      {roadmap && (
        <Card className="mb-5" delay={100}>
          <SectionLabel className="mb-2">Current focus</SectionLabel>
          <h2 className="mb-2 text-[18px] font-semibold tracking-tight text-white">{roadmap.content.current_focus.title}</h2>
          <p className="mb-4 text-sm leading-relaxed text-ink-subtle">{roadmap.content.current_focus.description}</p>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-ink-subtle">Progress</span>
            <span className="text-xs font-semibold text-primary">{progress}%</span>
          </div>
          <ProgressLine value={progress} />
        </Card>
      )}

      <Card className="mb-5" delay={180}>
        <SectionLabel className="mb-4">This week</SectionLabel>
        {current && current.tasks.length > 0 ? (
          <TaskList tasks={current.tasks} onToggle={(t) => void toggle(t)} />
        ) : (
          <p className="text-sm text-ink-subtle">No tasks yet this week.</p>
        )}
        {taskError && (
          <p className="mt-3 text-xs text-ink-muted" role="alert">
            {taskError}
          </p>
        )}
      </Card>

      {current && (
        <Card tone="accent" className="mb-5" delay={240} id="experiment">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <SectionLabel tone="primary" className="mb-1">
                Your experiment
              </SectionLabel>
              <h2 className="text-[17px] font-semibold tracking-tight text-white">{current.experiment.title}</h2>
              <p className="mt-1 text-xs text-ink-subtle">
                {current.tasks.filter((t) => t.completed).length} of {current.tasks.length} tasks done
              </p>
            </div>
            <div className="flex-shrink-0 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-xs text-primary">
              {daysLeft === 0 ? "Time to reflect" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
            </div>
          </div>
          {allDone || daysLeft === 0 ? (
            <PrimaryLink href="/check-in" className="mt-3 py-2.5">
              Reflect on this experiment
            </PrimaryLink>
          ) : (
            <PrimaryLink href={`/paths/${path.id}#experiment`} className="mt-3 py-2.5">
              Continue experiment
            </PrimaryLink>
          )}
          <p className="mt-3 text-center text-xs">
            <Link href="/check-in" className="text-ink-subtle transition-colors hover:text-white">
              Weekly check-in →
            </Link>
          </p>
        </Card>
      )}

      <section className="mb-5 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
        <SectionLabel className="mb-4">What we&apos;ve learned about you</SectionLabel>
        {learned.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {learned.map((insight) => (
              <div key={insight.id} className="rounded-xl border border-white/5 bg-surface p-4">
                <p className="text-sm leading-relaxed text-ink-muted">{insight.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-subtle">Insights will appear as you explore and check in.</p>
        )}
      </section>

      <Card
        tone="surface"
        className="mb-5 border-primary/10 shadow-[0_0_20px_rgba(0,168,255,0.04)]"
        delay={360}
      >
        <div className="mb-3 flex items-center gap-2">
          <AIDot size="sm" />
          <p className="text-xs font-semibold text-primary">AI Insight</p>
        </div>
        {highlighted ? (
          <>
            <h2 className="mb-2 font-semibold tracking-tight text-white">{highlighted.headline}</h2>
            <p className="mb-4 text-sm leading-relaxed text-ink-subtle">{highlighted.content}</p>
            <Link href="/direction-update" className="text-sm font-medium text-primary transition-opacity hover:opacity-70">
              Explore this insight →
            </Link>
          </>
        ) : (
          <>
            <h2 className="mb-2 font-semibold tracking-tight text-white">Patterns take a little evidence.</h2>
            <p className="mb-4 text-sm leading-relaxed text-ink-subtle">
              After your first check-in, we&apos;ll point out what seems to energize you — and what doesn&apos;t.
            </p>
            <Link href="/check-in" className="text-sm font-medium text-primary transition-opacity hover:opacity-70">
              Check in →
            </Link>
          </>
        )}
      </Card>

      {latest_check_in && (
        <Card tone="raised" delay={420}>
          <div className="mb-4 flex items-center justify-between">
            <SectionLabel>Recent feedback</SectionLabel>
            <span className="text-xs text-ink-faint">
              {new Date(latest_check_in.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {[
              ["Energy", `${latest_check_in.energy}/10`],
              ["Enjoyment", `${latest_check_in.enjoyment}/10`],
              ["Want to continue", CONTINUE_LABEL[latest_check_in.continue_preference]],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-ink-muted">{label}</span>
                <span className="rounded-full bg-white/4 px-2.5 py-0.5 text-sm font-semibold text-ink-soft">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </PageShell>
  );
}

export default function DashboardPage() {
  const dashboard = useResource(api.dashboard);

  if (dashboard.status === "loading") return <LoadingScreen label="Loading your dashboard" />;
  if (dashboard.status === "error") {
    return (
      <PageShell>
        <ErrorState message={dashboard.error} onRetry={dashboard.reload} />
      </PageShell>
    );
  }

  const data = dashboard.data;
  if (!data.path) {
    return (
      <PageShell>
        {data.has_paths ? (
          <EmptyState
            title="Choose a direction to test."
            body="You have three possible directions waiting. Pick one to get a small, concrete first experiment."
            cta={{ href: "/paths", label: "See your directions" }}
          />
        ) : (
          <EmptyState
            title="Let's find a direction worth testing."
            body={
              data.has_conversation
                ? "Pick up your exploration where you left off."
                : "Start with a conversation about your life, interests and what you want next."
            }
            cta={{ href: data.has_conversation ? "/explore" : "/", label: data.has_conversation ? "Continue exploring" : "Start exploring" }}
          />
        )}
      </PageShell>
    );
  }

  return <Dashboard data={data} setData={dashboard.setData} />;
}
