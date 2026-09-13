"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon } from "@/components/ui/icons";
import { ErrorState } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";

const STEPS = [
  { label: "Understanding your story", at: 600 },
  { label: "Mapping your interests", at: 1400 },
  { label: "Identifying your strengths", at: 2400 },
  { label: "Exploring possible directions", at: 3400 },
  { label: "Building your paths", at: 4600 },
];
/** Keep the sequence readable even when generation is fast. */
const MIN_DURATION_MS = 5400;

function Orb() {
  return (
    <div className="relative mb-14 flex items-center justify-center" aria-hidden>
      <div
        className="absolute animate-orb-pulse rounded-full border border-primary/8"
        style={{ width: 200, height: 200, background: "radial-gradient(circle, rgba(0,168,255,0.06) 0%, transparent 70%)" }}
      />
      <div
        className="absolute rounded-full border border-primary/12"
        style={{
          width: 140,
          height: 140,
          background: "radial-gradient(circle, rgba(0,168,255,0.1) 0%, transparent 70%)",
          animation: "orb-pulse 2.5s ease-in-out infinite 0.3s",
        }}
      />
      <div
        className="relative flex animate-orb-inner items-center justify-center rounded-full border border-primary/35"
        style={{
          width: 80,
          height: 80,
          background: "radial-gradient(circle at 35% 35%, rgba(0,168,255,0.5), rgba(0,100,200,0.15))",
          boxShadow: "0 0 30px rgba(0,168,255,0.25), inset 0 0 20px rgba(0,168,255,0.1)",
        }}
      >
        <div
          className="rounded-full"
          style={{
            width: 24,
            height: 24,
            background: "radial-gradient(circle at 35% 35%, #00A8FF, #0066FF)",
            boxShadow: "0 0 12px rgba(0,168,255,0.6)",
          }}
        />
      </div>
    </div>
  );
}

function Analysis() {
  const router = useRouter();
  const conversationParam = useSearchParams().get("c");
  const [visible, setVisible] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(conversationParam);
  const attempt = useRef(0);

  const run = useCallback(async () => {
    const thisAttempt = ++attempt.current;
    setError(null);
    setVisible(0);
    const timers = STEPS.map((s, i) => setTimeout(() => setVisible((v) => Math.max(v, i + 1)), s.at));
    const minWait = new Promise((r) => setTimeout(r, MIN_DURATION_MS));

    try {
      const id = conversationParam ?? (await api.latestConversation())?.conversation.id;
      if (!id) throw new Error("No conversation found. Start an exploration first.");
      setConversationId(id);
      await Promise.all([api.completeConversation(id), minWait]);
      if (thisAttempt === attempt.current) router.replace("/paths");
    } catch (e) {
      timers.forEach(clearTimeout);
      if (thisAttempt === attempt.current) setError(e instanceof Error && !("status" in e) ? e.message : errorMessage(e));
    }
  }, [conversationParam, router]);

  useEffect(() => {
    void run();
    return () => {
      attempt.current++;
    };
  }, [run]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 pt-14">
      <Orb />

      <div className="mb-12 animate-fade-in text-center">
        <h1 className="mb-3 text-[clamp(24px,4vw,36px)] font-bold tracking-[-0.025em] text-white">
          {error ? "We hit a snag." : "Connecting the dots..."}
        </h1>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-ink-subtle">
          We&apos;re looking at your interests, strengths, motivations and the kind of life you want to build.
        </p>
      </div>

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => void run()}
          secondary={
            <Link href={conversationId ? "/explore" : "/"} className="text-sm text-ink-subtle hover:text-white">
              Back to conversation
            </Link>
          }
        />
      ) : (
        <ol className="flex w-full max-w-xs flex-col gap-3" role="status" aria-live="polite">
          {STEPS.map((step, i) => {
            const isVisible = i < visible;
            const isDone = isVisible && i < visible - 1;
            const isActive = isVisible && !isDone;
            return (
              <li
                key={step.label}
                className="flex items-center gap-3 transition-all duration-500"
                style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? "translateX(0)" : "translateX(-8px)" }}
              >
                <div
                  className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300"
                  style={{
                    background: isDone ? "rgba(0,168,255,0.15)" : "rgba(0,168,255,0.1)",
                    border: isDone ? "1px solid rgba(0,168,255,0.4)" : "1px solid rgba(0,168,255,0.3)",
                  }}
                >
                  {isDone && <CheckIcon />}
                  {isActive && (
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" style={{ animation: "orb-pulse 1s ease-in-out infinite" }} />
                  )}
                </div>
                <span
                  className="text-sm transition-all duration-300"
                  style={{ color: isDone ? "#D0D0E0" : "#8B8B9E", fontWeight: isDone ? 500 : 400 }}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense>
      <Analysis />
    </Suspense>
  );
}
