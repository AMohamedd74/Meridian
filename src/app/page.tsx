"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, MicIcon } from "@/components/ui/icons";
import { api } from "@/lib/api";
import { pendingOpening } from "@/lib/session";

const STARTERS = [
  "I'm not sure what I want to do with my life",
  "I'm bored with my career",
  "I have too many interests",
  "I want to start something of my own",
];

export default function LandingPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasInput = input.trim().length > 0;

  useEffect(() => {
    api.track("landing_viewed");
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const start = (text: string) => {
    if (!text.trim()) return;
    pendingOpening.set(text.trim());
    router.push("/explore");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 pt-14 pb-16">
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0,168,255,0.04) 0%, transparent 70%)" }}
      />

      <div className="relative flex w-full max-w-2xl animate-fade-in-up flex-col items-center">
        <div className="mb-10 text-center">
          <h1 className="mb-5 text-[clamp(32px,5vw,52px)] leading-tight font-bold tracking-[-0.03em] text-white">
            <span className="text-primary">You&apos;re not lost.</span> You just haven&apos;t
            <br className="hidden md:block" /> found your direction yet.
          </h1>
          <p className="mx-auto max-w-lg text-[15px] leading-relaxed text-ink-subtle">
            Have a conversation with AI about your life, interests, ambitions and what you want next. We&apos;ll help
            you discover paths worth exploring.
          </p>
        </div>

        <form
          className="w-full rounded-2xl bg-surface transition-all duration-300"
          style={{
            border: focused ? "1px solid rgba(0,168,255,0.35)" : "1px solid rgba(255,255,255,0.07)",
            boxShadow: focused
              ? "0 0 0 3px rgba(0,168,255,0.07), 0 20px 60px rgba(0,0,0,0.5)"
              : "0 20px 60px rgba(0,0,0,0.4)",
          }}
          onSubmit={(e) => {
            e.preventDefault();
            start(input);
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                start(input);
              }
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Tell me what's on your mind..."
            rows={3}
            maxLength={4000}
            className="w-full resize-none bg-transparent px-5 pt-5 pb-3 text-[15px] leading-relaxed text-white caret-primary outline-none placeholder:text-ink-subtle focus-visible:outline-none"
            aria-label="Start your conversation"
          />
          <div className="flex items-center justify-between px-4 pt-1 pb-4">
            <div className="flex items-center gap-1 text-ink-subtle" aria-hidden>
              <MicIcon />
              <span className="text-xs">Voice</span>
            </div>
            <button
              type="submit"
              disabled={!hasInput}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200"
              style={{
                background: hasInput ? "#00A8FF" : "rgba(255,255,255,0.05)",
                color: hasInput ? "#000" : "#3A3A52",
                cursor: hasInput ? "pointer" : "not-allowed",
                boxShadow: hasInput ? "0 0 16px rgba(0,168,255,0.3)" : "none",
              }}
            >
              <span>Continue</span>
              <ArrowRightIcon />
            </button>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {STARTERS.map((s) => (
            <button key={s} className="chip whitespace-normal sm:whitespace-nowrap" onClick={() => start(s)}>
              {s}
            </button>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-ink-faint">
          Your conversation helps build a personal picture of what might fit you.
        </p>
      </div>
    </main>
  );
}
