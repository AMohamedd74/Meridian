"use client";

import Link from "next/link";
import { useState } from "react";
import { CompareTable, PathCard } from "@/components/paths";
import { GhostButton, PageShell } from "@/components/ui/primitives";
import { EmptyState, ErrorState, LoadingScreen } from "@/components/ui/states";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

export default function PathsPage() {
  const paths = useResource(api.paths);
  const [comparing, setComparing] = useState(false);

  if (paths.status === "loading") return <LoadingScreen label="Loading your directions" />;
  if (paths.status === "error") {
    return (
      <PageShell>
        <ErrorState message={paths.error} onRetry={paths.reload} />
      </PageShell>
    );
  }
  if (paths.data.length === 0) {
    return (
      <PageShell>
        <EmptyState
          title="No directions yet."
          body="Have a conversation first. Once we understand a bit about you, we'll suggest three directions worth testing."
          cta={{ href: "/", label: "Start exploring" }}
        />
      </PageShell>
    );
  }

  const hasActive = paths.data.some((p) => p.user_path?.status === "active");

  return (
    <PageShell width="6xl">
      <div className="mb-14 animate-fade-in text-center">
        <h1 className="mb-4 text-[clamp(28px,4vw,44px)] font-bold tracking-[-0.03em] text-white">
          Three directions worth exploring.
        </h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-subtle">
          Based on what you&apos;ve shared, these paths stand out. None of them is the &ldquo;correct&rdquo; answer.
          They&apos;re possibilities worth testing.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {paths.data.map((path, i) => (
          <PathCard key={path.id} path={path} index={i} />
        ))}
      </div>

      <p className="mx-auto mt-6 max-w-lg text-center text-xs leading-relaxed text-ink-faint">
        Fit signals are rough estimates drawn from your conversation — not scientific measurements.
      </p>

      {comparing && <CompareTable paths={paths.data} />}

      <div className="mt-10 flex flex-col items-center gap-3">
        <p className="text-sm text-ink-faint">{hasActive ? "Want to keep going?" : "Not ready to choose?"}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <GhostButton onClick={() => setComparing((c) => !c)} aria-expanded={comparing}>
            {comparing ? "Hide comparison" : "Compare paths"}
          </GhostButton>
          {hasActive && (
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/8 px-5 py-2.5 text-sm font-medium text-ink-subtle transition-all hover:border-white/20 hover:text-white"
            >
              Back to dashboard
            </Link>
          )}
        </div>
      </div>
    </PageShell>
  );
}
