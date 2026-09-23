import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "./errors";

/**
 * Per-user limits on expensive operations, so one account (or a script) can't
 * run up the AI bill. Counters are held in Postgres, so they hold across
 * serverless instances; see supabase/migrations/*_rate_limits.sql.
 */
export const LIMITS = {
  /** Conversation turns: one AI call each, and people type fast. */
  conversation: { max: 60, windowSeconds: 3600 },
  /** Profile + directions, selecting a direction, check-in analysis: several AI calls each. */
  generation: { max: 12, windowSeconds: 3600 },
  /** Backstop across a day, so an hourly limit can't be ridden indefinitely. */
  generation_daily: { max: 40, windowSeconds: 86_400 },
} as const;

export type LimitName = keyof typeof LIMITS;

export interface RateLimiter {
  /** Counts one request and reports whether it is allowed. */
  consume(bucket: string, max: number, windowSeconds: number): Promise<{ allowed: boolean; retryAfter: number }>;
}

function friendlyWait(seconds: number): string {
  if (seconds <= 90) return "in a moment";
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `in about ${minutes} minutes`;
  const hours = Math.ceil(minutes / 60);
  return `in about ${hours} hour${hours === 1 ? "" : "s"}`;
}

/** Throws a user-safe 429 when any of the named limits is exceeded. */
export async function enforceLimits(limiter: RateLimiter, names: readonly LimitName[]): Promise<void> {
  for (const name of names) {
    const { max, windowSeconds } = LIMITS[name];
    const { allowed, retryAfter } = await limiter.consume(name, max, windowSeconds);
    if (!allowed) {
      throw new AppError(
        "rate_limited",
        `You've done a lot in a short time. Please try again ${friendlyWait(retryAfter)}.`,
        retryAfter,
      );
    }
  }
}

/** Counts in Postgres as the signed-in user; the function derives the user from the session. */
export function createSupabaseRateLimiter(db: SupabaseClient): RateLimiter {
  return {
    async consume(bucket, max, windowSeconds) {
      const { data, error } = await db
        .rpc("consume_rate_limit", { p_bucket: bucket, p_max_requests: max, p_window_seconds: windowSeconds })
        .maybeSingle<{ allowed: boolean; retry_after: number }>();

      if (error || !data) {
        // Never lock users out because the limiter itself failed; log and allow.
        console.error("[rate-limit] check failed", error?.code ?? "no-data", error?.message ?? "");
        return { allowed: true, retryAfter: 0 };
      }
      return { allowed: data.allowed, retryAfter: data.retry_after };
    },
  };
}

/** Per-process counters for local development without Supabase, and for tests. */
export function createMemoryRateLimiter(now: () => number = Date.now): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    async consume(bucket, max, windowSeconds) {
      const ms = windowSeconds * 1000;
      const current = windows.get(bucket);
      const window = current && now() - current.start < ms ? current : { start: now(), count: 0 };
      window.count += 1;
      windows.set(bucket, window);
      return {
        allowed: window.count <= max,
        retryAfter: Math.max(1, Math.ceil((window.start + ms - now()) / 1000)),
      };
    },
  };
}
