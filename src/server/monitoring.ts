import * as Sentry from "@sentry/nextjs";

/**
 * Single place unexpected server errors are reported. Sentry is enabled by
 * setting SENTRY_DSN; without it, errors are logged and nothing is sent.
 *
 * Never pass conversation, reflection or profile content as context: only
 * identifiers and shapes belong here (specs/architecture.md §8).
 */
type Context = Record<string, string | number | boolean | null | undefined>;

export function reportError(error: unknown, context: Context = {}): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[error]", message, context);

  Sentry.captureException(error, { extra: context });
}
