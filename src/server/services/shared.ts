import { AIError } from "../ai/types";
import { AppError } from "../errors";

/** Converts provider failures into a recoverable, user-safe error. */
export async function withAI<T>(message: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AIError) throw new AppError("ai_unavailable", message);
    throw error;
  }
}

/**
 * Collapses concurrent identical operations (double-clicks, React StrictMode
 * double effects) into one, so AI generation never runs twice for the same key.
 */
const inFlight = new Map<string, Promise<unknown>>();

export function once<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = fn().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}
