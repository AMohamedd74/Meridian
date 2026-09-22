"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const APP_LINKS = [
  { label: "Dashboard", href: "/dashboard", match: (p: string) => p === "/dashboard" },
  { label: "My Path", href: "/paths", match: (p: string) => p.startsWith("/paths") },
  { label: "Experiments", href: "/dashboard#experiment", match: () => false },
  { label: "Journal", href: "/check-in", match: (p: string) => p === "/check-in" || p === "/direction-update" },
];

type Mode = "public" | "exploring" | "app";

function modeFor(pathname: string): Mode {
  if (pathname === "/explore" || pathname === "/analysis") return "exploring";
  if (["/dashboard", "/check-in", "/direction-update"].includes(pathname) || pathname.startsWith("/paths")) return "app";
  return "public";
}

function AccountMenu({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  const initial = email?.[0]?.toUpperCase() ?? "·";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/25 bg-primary/15 text-xs font-semibold text-primary"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-10 right-0 w-56 animate-fade-in rounded-xl border border-white/8 bg-surface p-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
        >
          {email && <p className="truncate px-3 py-2 text-xs text-ink-subtle">{email}</p>}
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              role="menuitem"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink-soft transition-colors hover:bg-white/5 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function Nav({ email, authEnabled }: { email: string | null; authEnabled: boolean }) {
  const pathname = usePathname();
  const mode = modeFor(pathname);
  const signedIn = Boolean(email);

  return (
    <nav
      className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between gap-4 border-b border-white/6 bg-background/80 px-5 backdrop-blur-md sm:px-8"
      aria-label="Main navigation"
    >
      <Link href="/" className="flex flex-shrink-0 select-none items-center gap-2" aria-label="PathPal home">
        <div className="flex h-6 w-6 items-center justify-center rounded-md border border-primary/30 bg-primary/15">
          <div className="h-2 w-2 rounded-full bg-primary" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-white">PathPal</span>
      </Link>

      {mode === "app" && (
        <div className="no-scrollbar flex items-center gap-4 overflow-x-auto sm:gap-6">
          {APP_LINKS.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`nav-link flex-shrink-0 ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
      {mode === "exploring" && <span className="text-sm text-ink-subtle">Your exploration</span>}
      {mode === "public" && (
        <div className="hidden items-center gap-6 sm:flex">
          <span className="nav-link" aria-disabled title="Coming soon">
            How it works
          </span>
          <span className="nav-link" aria-disabled title="Coming soon">
            About
          </span>
        </div>
      )}

      <div className="flex flex-shrink-0 items-center gap-4">
        {mode === "app" && authEnabled ? (
          <AccountMenu email={email} />
        ) : mode === "public" && pathname !== "/login" ? (
          <Link
            href={signedIn || !authEnabled ? "/dashboard" : "/login"}
            className="rounded-full border border-white/12 px-4 py-1.5 text-sm font-medium text-ink-muted transition-all duration-200 hover:border-white/25 hover:text-white"
          >
            {signedIn ? "Dashboard" : "Sign in"}
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
