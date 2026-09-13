import type { ExperimentTask } from "./types";

/** Pure business rules. No I/O, no React. */

export const MAX_EXPLORATION_STEP = 15;

/**
 * Safety floor under the coach's own readiness judgement: a single detailed
 * message is not enough to build a profile and three distinct directions.
 */
export const MIN_USER_MESSAGES_TO_COMPLETE = 3;

export function isReadyToComplete(coachReady: boolean, userMessageCount: number): boolean {
  return coachReady && userMessageCount >= MIN_USER_MESSAGES_TO_COMPLETE;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Exploration level moves in bounded steps no matter what the AI suggests:
 * one check-in is limited evidence.
 */
export function nextExplorationLevel(current: number, suggestedDelta: number): number {
  const step = clamp(Math.round(suggestedDelta), -MAX_EXPLORATION_STEP, MAX_EXPLORATION_STEP);
  return clamp(current + step, 5, 95);
}

export function taskProgress(tasks: Pick<ExperimentTask, "completed">[]): number {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100);
}

export function daysRemaining(startedAt: string, durationDays: number, now = new Date()): number {
  const end = new Date(startedAt).getTime() + durationDays * 86_400_000;
  return Math.max(0, Math.ceil((end - now.getTime()) / 86_400_000));
}

export function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();
}

export function explorationLabel(level: number): string {
  if (level < 35) return "Early signal";
  if (level < 60) return "Emerging signal";
  if (level < 80) return "Growing signal";
  return "Strong signal";
}
