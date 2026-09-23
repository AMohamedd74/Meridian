import * as Sentry from "@sentry/nextjs";

/**
 * Browser error monitoring. Enabled by setting NEXT_PUBLIC_SENTRY_DSN (a DSN is
 * a write-only endpoint, so it is safe in the browser).
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    // Errors only by default, matching the server. Tracing costs quota; raise deliberately.
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0),
    sendDefaultPii: false,
    beforeBreadcrumb(breadcrumb) {
      // Breadcrumbs can capture typed input and message text; keep only navigation and errors.
      return ["navigation", "error", "fetch", "xhr"].includes(breadcrumb.category ?? "") ? breadcrumb : null;
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
