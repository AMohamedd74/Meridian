import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { CheckIcon } from "./icons";

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

export function PageShell({
  children,
  width = "2xl",
}: {
  children: ReactNode;
  width?: "lg" | "2xl" | "6xl";
}) {
  const max = { lg: "max-w-lg", "2xl": "max-w-2xl", "6xl": "max-w-6xl" }[width];
  return (
    <main className="min-h-screen bg-background px-6 pt-20 pb-16">
      <div className={cx(max, "mx-auto")}>{children}</div>
    </main>
  );
}

export function SectionLabel({
  children,
  tone = "faint",
  className,
  as: Tag = "p",
}: {
  children: ReactNode;
  tone?: "faint" | "primary";
  className?: string;
  as?: "p" | "h3";
}) {
  return (
    <Tag
      className={cx(
        "text-xs font-semibold uppercase tracking-wide",
        tone === "primary" ? "text-primary/70" : "text-ink-faint",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

type CardTone = "surface" | "raised" | "accent";

const cardTone: Record<CardTone, string> = {
  surface: "bg-surface border border-white/6",
  raised: "bg-card border border-white/7",
  accent: "border border-primary/15 bg-[linear-gradient(135deg,rgba(0,168,255,0.08),rgba(0,50,150,0.04))]",
};

export function Card({
  children,
  tone = "raised",
  className,
  delay,
  id,
}: {
  children: ReactNode;
  tone?: CardTone;
  className?: string;
  delay?: number;
  id?: string;
}) {
  const style: CSSProperties | undefined = delay !== undefined ? { animationDelay: `${delay}ms` } : undefined;
  return (
    <section id={id} className={cx("rounded-2xl p-6 animate-fade-in-up", cardTone[tone], className)} style={style}>
      {children}
    </section>
  );
}

export function PrimaryButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx(
        "w-full rounded-xl py-3 text-sm font-semibold transition-all duration-200",
        "bg-primary text-black shadow-[0_0_20px_rgba(0,168,255,0.25)] hover:shadow-[0_0_30px_rgba(0,168,255,0.4)]",
        "disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-ink-faint disabled:shadow-none",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function PrimaryLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cx(
        "block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all duration-200",
        "bg-primary text-black shadow-[0_0_20px_rgba(0,168,255,0.25)] hover:shadow-[0_0_30px_rgba(0,168,255,0.4)]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function GhostButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx(
        "rounded-xl border border-white/8 px-5 py-2.5 text-sm font-medium text-ink-subtle transition-all duration-200",
        "hover:border-white/20 hover:text-white",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ProgressLine({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={cx("h-0.5 rounded-full bg-white/6", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <div className="progress-bar h-0.5 transition-all duration-1000" style={{ width: `${value}%` }} />
    </div>
  );
}

/** Small blue dot avatar used for the AI coach and insights. */
export function AIDot({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <div
      className={cx(
        "flex flex-shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10",
        size === "md" ? "h-7 w-7" : "h-5 w-5",
      )}
      aria-hidden
    >
      <div className={cx("rounded-full bg-primary", size === "md" ? "h-2 w-2" : "h-1.5 w-1.5")} />
    </div>
  );
}

export function CheckBullet() {
  return (
    <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
      <CheckIcon />
    </div>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-primary/15 bg-primary/8 px-2.5 py-0.5 text-xs text-primary">
      {children}
    </span>
  );
}

/** Row item used for reasons/unknowns lists on the path detail screen. */
export function ListRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-xl border border-white/5 bg-surface px-4 py-3.5", className)}>{children}</div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cx("h-px bg-white/5", className)} />;
}

export { cx };
