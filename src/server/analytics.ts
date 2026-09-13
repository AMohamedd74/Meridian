/** Product events from specs/analytics.md. Only these may be tracked. */
export const ANALYTICS_EVENTS = [
  "landing_viewed",
  "conversation_started",
  "conversation_completed",
  "profile_generated",
  "paths_generated",
  "path_selected",
  "experiment_started",
  "task_completed",
  "experiment_completed",
  "check_in_started",
  "check_in_completed",
  "direction_updated",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

/** Client-originated events; everything else is tracked server-side where it happens. */
export const CLIENT_EVENTS = ["landing_viewed", "check_in_started"] as const satisfies readonly AnalyticsEvent[];

type Props = Record<string, string | number | boolean | null>;

/**
 * Analytics sink. Logs in the mocked phase; swap for a real provider later.
 * Never pass conversation or reflection content as props.
 */
export function track(userId: string, event: AnalyticsEvent, props: Props = {}): void {
  if (process.env.NODE_ENV === "test") return;
  console.info(`[analytics] ${event}`, { user: userId.slice(0, 8), ...props });
}
