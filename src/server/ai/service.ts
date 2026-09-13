import type { z } from "zod";
import {
  CandidatePathsSchema,
  CheckInEvidenceSchema,
  ConversationTurnSchema,
  DirectionDecisionSchema,
  PlanSchema,
  ProfileContentSchema,
} from "@/domain/schemas";
import { AIError, type AIProvider } from "./types";

const MAX_ATTEMPTS = 2;

/**
 * Calls the provider and validates its output. Retries once on malformed output
 * or a transient failure, then throws a recoverable AIError. Malformed output
 * never leaves this function.
 */
async function validated<S extends z.ZodType>(
  operation: string,
  schema: S,
  call: () => Promise<unknown>,
): Promise<z.infer<S>> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const parsed = schema.safeParse(await call());
      if (parsed.success) return parsed.data;
      lastError = parsed.error;
      // Log shape problems only — never the conversation content.
      console.warn(`[ai] ${operation}: invalid output (attempt ${attempt})`, parsed.error.issues.map((i) => i.path.join(".")));
    } catch (error) {
      lastError = error;
      console.warn(`[ai] ${operation}: call failed (attempt ${attempt})`, error instanceof Error ? error.message : error);
      if (error instanceof AIError && !error.retryable) break;
    }
  }
  throw new AIError(`AI ${operation} failed`, operation, false, lastError);
}

type Input<K extends keyof AIProvider> = Parameters<AIProvider[K]>[0];

export function createAIService(provider: AIProvider) {
  return {
    conversationTurn: (input: Input<"conversationTurn">) =>
      validated("conversationTurn", ConversationTurnSchema, () => provider.conversationTurn(input)),
    generateProfile: (input: Input<"generateProfile">) =>
      validated("generateProfile", ProfileContentSchema, () => provider.generateProfile(input)),
    generatePaths: (input: Input<"generatePaths">) =>
      validated("generatePaths", CandidatePathsSchema, () => provider.generatePaths(input)),
    generateRoadmap: (input: Input<"generateRoadmap">) =>
      validated("generateRoadmap", PlanSchema, () => provider.generateRoadmap(input)),
    analyzeCheckIn: (input: Input<"analyzeCheckIn">) =>
      validated("analyzeCheckIn", CheckInEvidenceSchema, () => provider.analyzeCheckIn(input)),
    updateDirection: (input: Input<"updateDirection">) =>
      validated("updateDirection", DirectionDecisionSchema, () => provider.updateDirection(input)),
  };
}

export type AIService = ReturnType<typeof createAIService>;
