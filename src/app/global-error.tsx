"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Last-resort boundary for errors thrown by the root layout itself, which
 * `onRequestError` in src/instrumentation.ts never sees. Without this, a render
 * failure in the layout is invisible to Sentry and shows the stock Next.js page.
 *
 * This file replaces the root layout when active, so it renders its own <html>
 * and <body> and does not receive globals.css. Colours are inlined from the
 * @theme tokens so the page still matches the design when everything else has
 * failed; no conversation or profile content is ever rendered here.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background: "#050505",
          color: "#ffffff",
          colorScheme: "dark",
          fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <title>Something went wrong — PathPal</title>
        <main
          style={{
            width: "100%",
            maxWidth: "26rem",
            borderRadius: "1rem",
            border: "1px solid rgba(0, 168, 255, 0.15)",
            background: "#151519",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              margin: "0 auto 1.25rem",
              height: "2.5rem",
              width: "2.5rem",
              borderRadius: "9999px",
              border: "1px solid rgba(0, 168, 255, 0.25)",
              background: "rgba(0, 168, 255, 0.1)",
              boxShadow: "0 0 24px rgba(0, 168, 255, 0.15)",
            }}
          />
          <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ margin: "0.75rem 0 1.75rem", fontSize: "0.875rem", lineHeight: 1.6, color: "#8b8b9e" }}>
            This one is on us, not on you. Your progress is saved — try again, and if it keeps
            happening you can come back to it later.
          </p>
          <button
            type="button"
            onClick={retry}
            style={{
              width: "100%",
              cursor: "pointer",
              borderRadius: "0.5rem",
              border: "none",
              background: "#00a8ff",
              padding: "0.625rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#000000",
              boxShadow: "0 0 16px rgba(0, 168, 255, 0.3)",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ margin: "1.25rem 0 0", fontSize: "0.6875rem", color: "#3a3a52" }}>
              Reference: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
