import type {
  CheckInAnalysis,
  CheckInInput,
  ExperimentDraft,
  PathDraft,
  ProfileContent,
  RoadmapContent,
} from "./schemas";

/** Persisted entities. Mirrors specs/data-model.md. Timestamps are ISO strings. */

export interface Profile extends ProfileContent {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export type ConversationStatus = "active" | "completed";

export interface Conversation {
  id: string;
  user_id: string;
  status: ConversationStatus;
  coverage: number;
  ready_to_complete: boolean;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface Path {
  id: string;
  user_id: string;
  conversation_id: string;
  title: string;
  category: string;
  description: string;
  why_it_fits: string[];
  strengths: string[];
  uncertainties: string[];
  first_experiment: string;
  experiment_duration: number;
  metadata: Pick<
    PathDraft,
    "tags" | "path_type" | "success_criteria" | "thirty_day_direction" | "signals" | "initial_exploration_level"
  >;
  created_at: string;
}

export type UserPathStatus = "suggested" | "selected" | "active" | "paused" | "completed" | "abandoned";

export interface UserPath {
  id: string;
  user_id: string;
  path_id: string;
  status: UserPathStatus;
  selected_at: string | null;
  exploration_score: number;
  created_at: string;
  updated_at: string;
}

export type ExperimentStatus = "active" | "completed" | "abandoned";

export interface Experiment {
  id: string;
  user_id: string;
  path_id: string;
  title: string;
  description: string;
  goal: string;
  duration_days: number;
  status: ExperimentStatus;
  metadata: Pick<ExperimentDraft, "uncertainty_tested" | "expected_evidence" | "reflection_prompt">;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExperimentTask {
  id: string;
  experiment_id: string;
  title: string;
  description: string;
  completed: boolean;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CheckIn extends CheckInInput {
  id: string;
  user_id: string;
  path_id: string;
  /** AI analysis of this check-in, including before/after direction. Null until analysed. */
  analysis: (CheckInAnalysis & { before: DirectionSnapshot; after: DirectionSnapshot }) | null;
  created_at: string;
}

export interface DirectionSnapshot {
  title: string;
  exploration_level: number;
}

export type InsightSource = "conversation" | "check_in";

export interface Insight {
  id: string;
  user_id: string;
  path_id: string | null;
  content: string;
  headline: string | null;
  source_type: InsightSource;
  created_at: string;
}

export interface Roadmap {
  id: string;
  user_id: string;
  path_id: string;
  title: string;
  horizon: string;
  content: RoadmapContent;
  version: number;
  active: boolean;
  created_at: string;
}

// ---------- API view models ----------

export interface ConversationView {
  conversation: Conversation;
  messages: Message[];
}

export interface PathWithStatus extends Path {
  user_path: UserPath | null;
}

export interface ExperimentView {
  experiment: Experiment;
  tasks: ExperimentTask[];
}

export interface PathDetailView {
  path: PathWithStatus;
  roadmap: Roadmap | null;
  current: ExperimentView | null;
}

export interface DirectionUpdateView {
  check_in: CheckIn;
  path: Path;
  current: ExperimentView | null;
}

export interface DashboardView {
  path: Path | null;
  user_path: UserPath | null;
  roadmap: Roadmap | null;
  current: ExperimentView | null;
  insights: Insight[];
  latest_check_in: CheckIn | null;
  has_conversation: boolean;
  has_paths: boolean;
}
