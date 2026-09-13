import {
  CandidatePathsSchema,
  CheckInEvidenceSchema,
  ConversationTurnSchema,
  DirectionDecisionSchema,
  PlanSchema,
  ProfileContentSchema,
} from "@/domain/schemas";
import type { Experiment, ExperimentTask, Path } from "@/domain/types";
import type { OpenAIClient } from "./client";
import { PROMPTS } from "./prompts";
import type { AIProvider, ChatMessage } from "./types";

export interface OpenAIProviderOptions {
  /** Conversation replies are interactive, so they get a tighter budget than generation. */
  conversationTimeoutMs?: number;
  generationTimeoutMs?: number;
}

/** Keeps the most recent messages that fit a character budget, preserving order. */
export function recentMessages(messages: ChatMessage[], maxChars: number): ChatMessage[] {
  const kept: ChatMessage[] = [];
  let used = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    used += messages[i].content.length;
    if (used > maxChars && kept.length > 0) break;
    kept.unshift({ role: messages[i].role, content: messages[i].content });
  }
  return kept;
}

// Only the fields a prompt needs — no ids, user ids or timestamps.
const pathContext = (path: Path) => ({
  title: path.title,
  category: path.category,
  description: path.description,
  why_it_fits: path.why_it_fits,
  strengths: path.strengths,
  uncertainties: path.uncertainties,
  first_experiment: path.first_experiment,
  experiment_duration_days: path.experiment_duration,
  path_type: path.metadata.path_type,
  success_criteria: path.metadata.success_criteria,
  thirty_day_direction: path.metadata.thirty_day_direction,
});

const experimentContext = (experiment: Experiment | null, tasks: ExperimentTask[]) =>
  experiment && {
    title: experiment.title,
    objective: experiment.description,
    uncertainty_tested: experiment.metadata.uncertainty_tested,
    duration_days: experiment.duration_days,
    tasks: tasks.map((t) => ({ title: t.title, completed: t.completed })),
  };

export function createOpenAIProvider(
  client: OpenAIClient,
  { conversationTimeoutMs = 30_000, generationTimeoutMs = 90_000 }: OpenAIProviderOptions = {},
): AIProvider {
  const json = (value: unknown) => JSON.stringify(value);

  return {
    conversationTurn({ messages }) {
      const history = recentMessages(messages, 40_000);
      return client.structured({
        prompt: PROMPTS.conversation,
        schema: ConversationTurnSchema,
        // The first turn has no user message yet; the prompt covers how to open.
        input: history.length > 0 ? history : [{ role: "user", content: "(The user has opened the conversation.)" }],
        timeoutMs: conversationTimeoutMs,
      });
    },

    generateProfile({ messages }) {
      return client.structured({
        prompt: PROMPTS.profile,
        schema: ProfileContentSchema,
        input: json({ conversation: recentMessages(messages, 120_000) }),
        timeoutMs: generationTimeoutMs,
      });
    },

    generatePaths({ profile }) {
      return client.structured({
        prompt: PROMPTS.paths,
        schema: CandidatePathsSchema,
        input: json({ profile }),
        timeoutMs: generationTimeoutMs,
      });
    },

    generateRoadmap({ profile, path, replan }) {
      return client.structured({
        prompt: PROMPTS.roadmap,
        schema: PlanSchema,
        input: json({
          today: new Date().toISOString().slice(0, 10),
          profile,
          direction: pathContext(path),
          replan: replan && {
            check_in: replan.checkIn,
            evidence: replan.evidence,
            decision: replan.decision,
            roadmap_should_change: replan.decision.roadmap_should_change,
            previous_roadmap: replan.previousRoadmap,
          },
        }),
        timeoutMs: generationTimeoutMs,
      });
    },

    analyzeCheckIn({ profile, path, experiment, tasks, checkIn }) {
      return client.structured({
        prompt: PROMPTS.checkInAnalysis,
        schema: CheckInEvidenceSchema,
        input: json({
          profile,
          direction: pathContext(path),
          experiment: experimentContext(experiment, tasks),
          check_in: checkIn,
        }),
        timeoutMs: generationTimeoutMs,
      });
    },

    updateDirection({ profile, path, experiment, tasks, checkIn, explorationLevel, evidence }) {
      return client.structured({
        prompt: PROMPTS.directionUpdate,
        schema: DirectionDecisionSchema,
        input: json({
          profile,
          current_direction: { ...pathContext(path), exploration_level: explorationLevel },
          experiment: experimentContext(experiment, tasks),
          check_in: checkIn,
          evidence,
        }),
        timeoutMs: generationTimeoutMs,
      });
    },
  };
}
