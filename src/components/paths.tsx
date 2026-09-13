"use client";

import Link from "next/link";
import { useState } from "react";
import type { PathWithStatus } from "@/domain/types";
import { ArrowRightIcon } from "./ui/icons";
import { Divider, SectionLabel, Tag } from "./ui/primitives";

/** Signal bar. Deliberately shows no number: signals are rough, not measurements. */
function SignalBar({ label, level }: { label: string; level: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 flex-shrink-0 text-xs text-ink-subtle">{label}</span>
      <div className="h-0.5 flex-1 rounded-full bg-white/6">
        <div
          className="h-0.5 rounded-full transition-all duration-700"
          style={{
            width: `${level}%`,
            background: "linear-gradient(90deg, #00A8FF, #0066FF)",
            boxShadow: "0 0 4px rgba(0,168,255,0.4)",
          }}
        />
      </div>
    </div>
  );
}

export function PathCard({ path, index }: { path: PathWithStatus; index: number }) {
  const [hovered, setHovered] = useState(false);
  const active = path.user_path?.status === "active";

  return (
    <article
      className="flex animate-fade-in-up flex-col rounded-2xl p-6 transition-all duration-300"
      style={{
        background: hovered ? "#1A1A22" : "#151519",
        border: hovered || active ? "1px solid rgba(0,168,255,0.2)" : "1px solid rgba(255,255,255,0.07)",
        boxShadow: hovered ? "0 0 30px rgba(0,168,255,0.06), 0 20px 40px rgba(0,0,0,0.4)" : "0 8px 30px rgba(0,0,0,0.3)",
        animationDelay: `${index * 120}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <header className="mb-5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs tracking-widest text-ink-faint">PATH {String(index + 1).padStart(2, "0")}</span>
          {active && <span className="text-xs font-semibold text-primary">Current direction</span>}
        </div>
        <h2 className="mt-1 text-[20px] font-bold tracking-[-0.02em] text-white">{path.title}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {path.metadata.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      </header>

      {path.description && <p className="mb-6 text-sm leading-relaxed text-ink-muted">{path.description}</p>}

      {(path.metadata.signals ?? []).length > 0 && (
        <div className="mb-1">
          <SectionLabel className="mb-4">Fit signals</SectionLabel>
          <div className="flex flex-col gap-3">
            {path.metadata.signals.map((s) => (
              <SignalBar key={s.label} label={s.label} level={s.level} />
            ))}
          </div>
        </div>
      )}

      {path.uncertainties[0] && (
        <>
          <Divider className="my-5" />
          <div className="mb-5">
            <SectionLabel className="mb-2">What we still don&apos;t know</SectionLabel>
            <p className="text-sm leading-relaxed text-ink-subtle italic">&ldquo;{path.uncertainties[0]}&rdquo;</p>
          </div>
        </>
      )}

      <div className="mb-5 rounded-xl border border-primary/10 bg-primary/5 p-4">
        <SectionLabel tone="primary" className="mb-1.5">
          First experiment
        </SectionLabel>
        <p className="text-sm leading-relaxed text-ink-soft">{path.first_experiment}</p>
      </div>

      <Link
        href={`/paths/${path.id}`}
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 py-3 text-sm font-semibold transition-all duration-200"
        style={{
          background: hovered ? "#00A8FF" : "rgba(0,168,255,0.08)",
          color: hovered ? "#000" : "#00A8FF",
          boxShadow: hovered ? "0 0 20px rgba(0,168,255,0.25)" : "none",
        }}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
      >
        Explore this path
        <ArrowRightIcon />
      </Link>
    </article>
  );
}

const COMPARE_ROWS: { label: string; render: (p: PathWithStatus) => React.ReactNode }[] = [
  { label: "Type", render: (p) => <span className="capitalize">{p.metadata.path_type}</span> },
  { label: "Why it may fit", render: (p) => p.why_it_fits[0] },
  { label: "Strengths", render: (p) => p.strengths.join(", ") },
  { label: "Biggest unknown", render: (p) => p.uncertainties[0] },
  { label: "First experiment", render: (p) => p.first_experiment },
  { label: "Duration", render: (p) => `${p.experiment_duration} days` },
];

export function CompareTable({ paths }: { paths: PathWithStatus[] }) {
  return (
    <div className="mt-8 animate-fade-in-up overflow-x-auto rounded-2xl border border-white/6 bg-surface">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/5">
            <th className="w-36 p-4" />
            {paths.map((p) => (
              <th key={p.id} scope="col" className="p-4 font-semibold text-white">
                {p.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARE_ROWS.map((row) => (
            <tr key={row.label} className="border-b border-white/5 last:border-0">
              <th scope="row" className="p-4 align-top text-xs font-semibold tracking-wide text-ink-faint uppercase">
                {row.label}
              </th>
              {paths.map((p) => (
                <td key={p.id} className="p-4 align-top leading-relaxed text-ink-muted">
                  {row.render(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
