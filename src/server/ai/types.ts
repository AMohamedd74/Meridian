import type { CheckInEvidence, CheckInInput, DirectionDecision, ProfileContent, RoadmapContent } from "@/domain/schemas";
import type { Experiment, ExperimentTask, Message, Path } from "@/domain/types";

export type ChatMessage = Pick<Message, "role" | "content">;

export interface CheckInContext {
  profile: ProfileContent;
  path: Path;
  experiment: Experiment | null;
  tasks: ExperimentTask[];
  checkIn: CheckInInput;
}

/** What the roadmap generator needs to know when replanning after a check-in. */
export interface ReplanContext {
  checkIn: CheckInInput;
  evidence: CheckInEvidence;
  decision: DirectionDecision;
  previousRoadmap: RoadmapContent | null;
}

/**
 * Provider-agnostic AI boundary (specs/architecture.md §4). One operation per
 * prompt. Implementations return raw, untrusted output; `createAIService` validates it.
 */
export interface AIProvider {
  conversationTurn(input: { messages: ChatMessage[] }): Promise<unknown>;
  generateProfile(input: { messages: ChatMessage[] }): Promise<unknown>;
  generatePaths(input: { profile: ProfileContent }): Promise<unknown>;
  /** First experiment + roadmap for a path; `replan` is present after a check-in. */
  generateRoadmap(input: { profile: ProfileContent; path: Path; replan?: ReplanContext }): Promise<unknown>;
  analyzeCheckIn(input: CheckInContext): Promise<unknown>;
  updateDirection(input: CheckInContext & { explorationLevel: number; evidence: CheckInEvidence }): Promise<unknown>;
}

export class AIError extends Error {
  constructor(
    message: string,
    readonly operation: string,
    /** False for failures a retry can't fix (timeouts, auth, bad request). */
    readonly retryable = true,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AIError";
  }
}
