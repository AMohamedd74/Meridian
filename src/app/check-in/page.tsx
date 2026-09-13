"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { PageShell, PrimaryButton, SectionLabel } from "@/components/ui/primitives";
import { EmptyState, ErrorState, LoadingScreen } from "@/components/ui/states";
import type { CheckInInput, ContinuePreference } from "@/domain/schemas";
import { api, errorMessage } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

const ACTIVITIES = ["Creating", "Learning", "Building", "Talking to people", "Researching", "Selling", "Planning", "Problem solving"];

const CONTINUE_OPTIONS: { value: ContinuePreference; label: string }[] = [
  { value: "definitely", label: "Definitely" },
  { value: "maybe", label: "Maybe" },
  { value: "probably_not", label: "Probably not" },
];

function QuestionCard({
  question,
  children,
  delay,
  className = "mb-4",
  labelClassName = "mb-4",
}: {
  question: string;
  children: ReactNode;
  delay: number;
  className?: string;
  labelClassName?: string;
}) {
  const id = useId();
  return (
    <div
      role="group"
      aria-labelledby={id}
      className={`animate-fade-in-up rounded-2xl border border-white/6 bg-surface p-6 ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p id={id} className={`text-sm font-medium text-ink-soft ${labelClassName}`}>
        {question}
      </p>
      {children}
    </div>
  );
}

function Scale({
  question,
  value,
  onChange,
  low,
  high,
  describe,
  delay,
}: {
  question: string;
  value: number;
  onChange: (v: number) => void;
  low: string;
  high: string;
  describe: (v: number) => string;
  delay: number;
}) {
  const pct = (value - 1) * (100 / 9);
  return (
    <QuestionCard question={question} delay={delay} labelClassName="mb-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-ink-subtle">1</span>
        <div className="text-center">
          <span className="text-3xl font-bold tracking-[-0.03em] text-primary">{value}</span>
          <span className="ml-2 text-sm text-ink-subtle">— {describe(value)}</span>
        </div>
        <span className="text-xs text-ink-subtle">10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range w-full"
        style={{ background: `linear-gradient(90deg, #00A8FF ${pct}%, rgba(255,255,255,0.08) ${pct}%)` }}
        aria-label={question}
      />
      <div className="mt-2 flex justify-between">
        <span className="text-xs text-ink-faint">{low}</span>
        <span className="text-xs text-ink-faint">{high}</span>
      </div>
    </QuestionCard>
  );
}

function Chips({
  question,
  selected,
  onToggle,
  delay,
}: {
  question: string;
  selected: string[];
  onToggle: (chip: string) => void;
  delay: number;
}) {
  return (
    <QuestionCard question={question} delay={delay}>
      <div className="flex flex-wrap gap-2">
        {ACTIVITIES.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onToggle(chip)}
            className={`chip ${selected.includes(chip) ? "active" : ""}`}
            aria-pressed={selected.includes(chip)}
          >
            {chip}
          </button>
        ))}
      </div>
    </QuestionCard>
  );
}

const level = (v: number) => (v <= 3 ? "Low" : v <= 6 ? "Moderate" : v <= 8 ? "High" : "Very high");
const toggleIn = (list: string[], item: string) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export default function CheckInPage() {
  const router = useRouter();
  const dashboard = useResource(api.dashboard);
  const [energy, setEnergy] = useState(5);
  const [motivation, setMotivation] = useState(5);
  const [enjoyment, setEnjoyment] = useState(5);
  const [difficulty, setDifficulty] = useState(5);
  const [enjoyed, setEnjoyed] = useState<string[]>([]);
  const [disliked, setDisliked] = useState<string[]>([]);
  const [continuePref, setContinuePref] = useState<ContinuePreference | null>(null);
  const [reflection, setReflection] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPath = dashboard.status === "success" && Boolean(dashboard.data.path);
  useEffect(() => {
    if (hasPath) api.track("check_in_started");
  }, [hasPath]);

  if (dashboard.status === "loading") return <LoadingScreen />;
  if (dashboard.status === "error") {
    return (
      <PageShell width="lg">
        <ErrorState message={dashboard.error} onRetry={dashboard.reload} />
      </PageShell>
    );
  }
  if (!dashboard.data.path) {
    return (
      <PageShell width="lg">
        <EmptyState
          title="Choose a direction first."
          body="Check-ins reflect on a real experiment. Pick a direction to test, then come back after a few days."
          cta={{ href: "/paths", label: "See your directions" }}
        />
      </PageShell>
    );
  }

  const submit = async () => {
    if (!continuePref) return;
    setSubmitting(true);
    setError(null);
    const input: CheckInInput = {
      energy,
      motivation,
      enjoyment,
      difficulty,
      enjoyed_activities: enjoyed,
      disliked_activities: disliked,
      continue_preference: continuePref,
      reflection,
    };
    try {
      // If a previous attempt saved the check-in but analysis failed, retry that instead of duplicating it.
      const previous = error ? await api.latestDirectionUpdate() : null;
      if (previous && !previous.check_in.analysis) {
        await api.retryCheckInAnalysis(previous.check_in.id);
      } else {
        await api.submitCheckIn(input);
      }
      router.push("/direction-update");
    } catch (e) {
      setError(errorMessage(e));
      setSubmitting(false);
    }
  };

  return (
    <PageShell width="lg">
      <div className="mb-10 animate-fade-in">
        <SectionLabel className="mb-3">Weekly check-in</SectionLabel>
        <h1 className="text-[clamp(24px,4vw,36px)] font-bold tracking-[-0.03em] text-white">How did this week feel?</h1>
        <p className="mt-2 text-sm text-ink-subtle">Reflecting on: {dashboard.data.current?.experiment.title ?? dashboard.data.path.title}</p>
      </div>

      <Scale
        question="How energized did you feel while working on your path?"
        value={energy}
        onChange={setEnergy}
        low="Drained"
        high="Energized"
        describe={level}
        delay={80}
      />
      <Chips question="What did you enjoy most?" selected={enjoyed} onToggle={(c) => setEnjoyed((l) => toggleIn(l, c))} delay={160} />
      <Chips question="What drained you?" selected={disliked} onToggle={(c) => setDisliked((l) => toggleIn(l, c))} delay={200} />
      <Scale question="How much did you enjoy the work itself?" value={enjoyment} onChange={setEnjoyment} low="Not at all" high="Loved it" describe={level} delay={220} />
      <Scale question="How motivated were you to keep going?" value={motivation} onChange={setMotivation} low="Not at all" high="Very" describe={level} delay={240} />
      <Scale question="How difficult did it feel?" value={difficulty} onChange={setDifficulty} low="Easy" high="Very hard" describe={level} delay={260} />

      <QuestionCard question="Would you want to do more of this?" delay={280}>
        <div className="grid grid-cols-3 gap-2">
          {CONTINUE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setContinuePref(opt.value)}
              className="rounded-xl py-3 text-sm font-medium transition-all duration-200"
              style={{
                background: continuePref === opt.value ? "rgba(0,168,255,0.12)" : "rgba(255,255,255,0.03)",
                border: continuePref === opt.value ? "1px solid rgba(0,168,255,0.3)" : "1px solid rgba(255,255,255,0.06)",
                color: continuePref === opt.value ? "#00A8FF" : "#5A5A72",
              }}
              aria-pressed={continuePref === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </QuestionCard>

      <QuestionCard question="Anything else you noticed? (optional)" delay={300} className="mb-8">
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="What surprised you this week?"
          className="w-full resize-none rounded-xl border border-white/6 bg-transparent px-4 py-3 text-sm leading-relaxed text-white caret-primary outline-none placeholder:text-ink-faint focus:border-primary/35 focus-visible:outline-none"
        />
      </QuestionCard>

      <PrimaryButton
        onClick={() => void submit()}
        disabled={!continuePref || submitting}
        aria-busy={submitting}
        className="animate-fade-in-up rounded-2xl py-4 shadow-[0_0_24px_rgba(0,168,255,0.3)]"
        style={{ animationDelay: "320ms" }}
      >
        {submitting ? "Looking at your week…" : error ? "Try again" : "Update my direction"}
      </PrimaryButton>
      {!continuePref && <p className="mt-3 text-center text-xs text-ink-faint">Choose whether you&apos;d want to do more of this to continue.</p>}
      {error && (
        <p className="mt-3 text-center text-xs text-ink-muted" role="alert">
          {error}
        </p>
      )}
    </PageShell>
  );
}
