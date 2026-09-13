import { z } from "zod";

/**
 * Validation schemas for all AI-generated structured data and user input.
 * AI output is untrusted: everything passes through these before persistence.
 */

const text = (max: number) => z.string().trim().min(1).max(max);
/**
 * Length caps on AI output are safety bounds, not style limits: they are NOT
 * sent to the model (strict decoding would cut text off mid-sentence at the
 * cap). Desired length is set in the prompts, so keep these generous.
 */
const list = (maxItems: number, maxLen = 800) => z.array(text(maxLen)).max(maxItems);

// ---------- Conversation ----------

export const ConversationTurnSchema = z.object({
  reply: text(4000),
  /** 0..1 — how much of the needed picture the coach believes it has. Internal heuristic. */
  coverage: z.number().min(0).max(1),
  /** True once there is enough to produce a profile, paths, uncertainties and experiments. */
  ready_to_complete: z.boolean(),
});
export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;

export const SendMessageInputSchema = z.object({
  content: text(4000),
});

export const StartConversationInputSchema = z.object({
  opening: text(4000).optional(),
});

// ---------- Profile ----------

export const ProfileContentSchema = z.object({
  summary: text(2000),
  values: list(12),
  interests: list(12),
  skills: list(12),
  motivations: list(12),
  preferences: list(12),
  constraints: list(12),
  goals: list(12),
  dislikes: list(12),
  uncertainties: list(12),
});
export type ProfileContent = z.infer<typeof ProfileContentSchema>;

// ---------- Paths (three directions) ----------

export const PathTypeSchema = z.enum(["direct", "adjacent", "hybrid"]);

export const FitSignalSchema = z.object({
  label: text(80),
  /** 0..100 rough signal strength. Never presented as a validated measurement. */
  level: z.number().int().min(0).max(100),
});

export const PathDraftSchema = z.object({
  title: text(150),
  category: text(100),
  tags: list(3, 60).min(1),
  path_type: PathTypeSchema,
  description: text(1500),
  why_it_fits: list(6).min(1),
  relevant_strengths: list(6).min(1),
  uncertainties: list(4).min(1),
  first_experiment: text(1500),
  experiment_duration_days: z.number().int().min(1).max(60),
  success_criteria: list(5).min(1),
  thirty_day_direction: text(1500),
  signals: z.array(FitSignalSchema).min(1).max(5),
  /** 0..100 internal starting exploration level. */
  initial_exploration_level: z.number().int().min(0).max(100),
});
export type PathDraft = z.infer<typeof PathDraftSchema>;

export const CandidatePathsSchema = z
  .object({ paths: z.array(PathDraftSchema).length(3) })
  .refine(
    ({ paths }) => new Set(paths.map((p) => p.title.toLowerCase())).size === 3,
    { message: "Directions must be distinct" },
  );
export type CandidatePaths = z.infer<typeof CandidatePathsSchema>;

// ---------- Experiment + roadmap ----------

export const ExperimentDraftSchema = z.object({
  title: text(200),
  objective: text(1500),
  /** The uncertainty this experiment is designed to answer. */
  uncertainty_tested: text(800),
  duration_days: z.number().int().min(1).max(60),
  expected_evidence: list(5).min(1),
  reflection_prompt: text(800),
  tasks: z
    .array(
      z.object({
        title: text(200),
        description: text(1200),
        day_offset: z.number().int().min(0).max(60),
      }),
    )
    .min(2)
    .max(7),
});
export type ExperimentDraft = z.infer<typeof ExperimentDraftSchema>;

export const RoadmapContentSchema = z.object({
  current_focus: z.object({ title: text(150), description: text(1200) }),
  next_action: text(600),
  this_week: list(5).min(1),
  thirty_days: text(1500),
  ninety_days: text(1500),
  longer_term: text(1500),
});
export type RoadmapContent = z.infer<typeof RoadmapContentSchema>;

export const PlanSchema = z.object({
  experiment: ExperimentDraftSchema,
  roadmap: RoadmapContentSchema,
});
export type Plan = z.infer<typeof PlanSchema>;

// ---------- Check-ins ----------

const scale = z.number().int().min(1).max(10);

export const ContinuePreferenceSchema = z.enum(["definitely", "maybe", "probably_not"]);
export type ContinuePreference = z.infer<typeof ContinuePreferenceSchema>;

export const CheckInInputSchema = z.object({
  energy: scale,
  motivation: scale,
  enjoyment: scale,
  difficulty: scale,
  enjoyed_activities: list(10, 60),
  disliked_activities: list(10, 60),
  continue_preference: ContinuePreferenceSchema,
  reflection: z.string().trim().max(2000),
});
export type CheckInInput = z.infer<typeof CheckInInputSchema>;

/** Evidence extracted from a check-in (analyzeCheckIn). Makes no decisions. */
export const CheckInEvidenceSchema = z.object({
  patterns: list(5),
  new_interests: list(5),
  friction: list(5),
  evidence_for: list(5),
  evidence_against: list(5),
  open_uncertainties: list(5),
  insight: z.object({ headline: text(200), content: text(1500) }),
  learned: list(4, 400),
});
export type CheckInEvidence = z.infer<typeof CheckInEvidenceSchema>;

/** The decision taken from that evidence (updateDirection). */
export const DirectionDecisionSchema = z.object({
  changed: z.boolean(),
  title: text(150),
  /** Why the direction/plan changed (or why it didn't). Always required. */
  explanation: text(1500),
  exploration_delta: z.number().int().min(-30).max(30),
  shifts: z.array(z.object({ label: text(80), delta: z.number().int().min(-30).max(30) })).max(5),
  /** Whether the focus and longer horizons of the roadmap should be revised, not just the next experiment. */
  roadmap_should_change: z.boolean(),
});
export type DirectionDecision = z.infer<typeof DirectionDecisionSchema>;

/** Persisted analysis: evidence + decision. */
export const CheckInAnalysisSchema = CheckInEvidenceSchema.extend({ direction: DirectionDecisionSchema });
export type CheckInAnalysis = z.infer<typeof CheckInAnalysisSchema>;

export const TaskUpdateInputSchema = z.object({ completed: z.boolean() });
