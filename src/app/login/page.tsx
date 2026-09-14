"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowRightIcon } from "@/components/ui/icons";
import { safeNextPath } from "@/lib/safe-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; email: string } | { kind: "error"; message: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Login() {
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [email, setEmail] = useState("");
  const [focused, setFocused] = useState(false);
  const [status, setStatus] = useState<Status>(
    params.get("error") ? { kind: "error", message: "That sign-in link is invalid or has expired. Request a new one." } : { kind: "idle" },
  );
  const valid = EMAIL.test(email.trim());

  const submit = async () => {
    if (!valid || status.kind === "sending") return;
    setStatus({ kind: "sending" });
    const address = email.trim();
    const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
      email: address,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      },
    });
    setStatus(
      error
        ? {
            kind: "error",
            message:
              error.status === 429
                ? "Too many attempts. Please wait a minute and try again."
                : "We couldn't send your sign-in link. Please try again.",
          }
        : { kind: "sent", email: address },
    );
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 pt-14 pb-16">
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0,168,255,0.04) 0%, transparent 70%)" }}
      />
      <div className="relative w-full max-w-md animate-fade-in-up">
        {status.kind === "sent" ? (
          <div className="text-center" role="status">
            <h1 className="mb-4 text-[clamp(28px,4vw,36px)] font-bold tracking-[-0.03em] text-white">Check your email.</h1>
            <p className="mb-8 text-[15px] leading-relaxed text-ink-subtle">
              We sent a sign-in link to <span className="text-ink-soft">{status.email}</span>. Open it on this device to
              continue.
            </p>
            <button
              onClick={() => setStatus({ kind: "idle" })}
              className="text-sm text-ink-subtle transition-colors hover:text-white"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="mb-4 text-[clamp(28px,4vw,36px)] font-bold tracking-[-0.03em] text-white">
                Sign in to <span className="text-primary">continue.</span>
              </h1>
              <p className="text-[15px] leading-relaxed text-ink-subtle">
                We&apos;ll email you a link — no password needed. New here? The same link creates your account.
              </p>
            </div>

            {!isSupabaseConfigured ? (
              <p className="text-center text-sm text-ink-muted" role="alert">
                Sign-in isn&apos;t configured yet. Add your Supabase URL and publishable key to <code>.env.local</code>.
              </p>
            ) : (
              <form
                className="rounded-2xl bg-surface transition-all duration-300"
                style={{
                  border: focused ? "1px solid rgba(0,168,255,0.35)" : "1px solid rgba(255,255,255,0.07)",
                  boxShadow: focused
                    ? "0 0 0 3px rgba(0,168,255,0.07), 0 20px 60px rgba(0,0,0,0.5)"
                    : "0 20px 60px rgba(0,0,0,0.4)",
                }}
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
              >
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="you@example.com"
                  className="w-full rounded-t-[15px] bg-transparent px-5 pt-5 pb-3 text-[15px] text-white caret-primary outline-none placeholder:text-ink-subtle focus-visible:outline-none"
                />
                <div className="flex items-center justify-end px-4 pt-1 pb-4">
                  <button
                    type="submit"
                    disabled={!valid || status.kind === "sending"}
                    className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200"
                    style={{
                      background: valid ? "#00A8FF" : "rgba(255,255,255,0.05)",
                      color: valid ? "#000" : "#3A3A52",
                      cursor: valid ? "pointer" : "not-allowed",
                      boxShadow: valid ? "0 0 16px rgba(0,168,255,0.3)" : "none",
                    }}
                  >
                    <span>{status.kind === "sending" ? "Sending…" : "Email me a link"}</span>
                    <ArrowRightIcon />
                  </button>
                </div>
              </form>
            )}

            {status.kind === "error" && (
              <p className="mt-4 text-center text-sm text-ink-muted" role="alert">
                {status.message}
              </p>
            )}

            <p className="mt-8 text-center text-xs text-ink-faint">
              <Link href="/" className="transition-colors hover:text-white">
                ← Back
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}
