import * as Sentry from "@sentry/nextjs";

/**
 * Server and edge error monitoring. Enabled by setting SENTRY_DSN; without it
 * the SDK is inert, so local development and tests report nothing.
 */
export function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    // Errors only by default; tracing costs quota. Raise deliberately.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    sendDefaultPii: false,
    beforeSend(event) {
      // Requests carry conversation and reflection text; never send bodies, headers or cookies.
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    },
  });
}

export const onRequestError = Sentry.captureRequestError;
