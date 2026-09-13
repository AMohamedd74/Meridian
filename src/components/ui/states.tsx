import Link from "next/link";
import type { ReactNode } from "react";
import { GhostButton, PageShell } from "./primitives";

export function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-primary"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  );
}

export function LoadingScreen({ label = "Loading" }: { label?: string }) {
  return (
    <PageShell>
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3" role="status">
        <TypingDots />
        <p className="text-sm text-ink-subtle">{label}</p>
      </div>
    </PageShell>
  );
}

export function ErrorState({
  message,
  onRetry,
  retrying,
  secondary,
}: {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  secondary?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center" role="alert">
      <p className="max-w-sm text-sm leading-relaxed text-ink-muted">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <GhostButton onClick={onRetry} disabled={retrying}>
            {retrying ? "Trying again…" : "Try again"}
          </GhostButton>
        )}
        {secondary}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="flex min-h-[50vh] animate-fade-in flex-col items-center justify-center text-center">
      <h2 className="mb-3 text-[clamp(24px,4vw,32px)] font-bold tracking-[-0.03em] text-white">{title}</h2>
      <p className="mb-8 max-w-sm text-sm leading-relaxed text-ink-subtle">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-black shadow-[0_0_20px_rgba(0,168,255,0.25)] transition-all hover:shadow-[0_0_30px_rgba(0,168,255,0.4)]"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
