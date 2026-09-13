import type { CheckInInput, ExperimentDraft, PathDraft, ProfileContent, RoadmapContent } from "@/domain/schemas";
import type {
  CheckIn,
  Conversation,
  Experiment,
  ExperimentTask,
  Insight,
  InsightSource,
  Message,
  MessageRole,
  Path,
  Profile,
  Roadmap,
  UserPath,
} from "@/domain/types";

/**
 * Persistence boundary. Every method is scoped to `userId`, mirroring the
 * Row Level Security the Supabase implementation will enforce.
 */
export interface Repository {
  getProfile(userId: string): Promise<Profile | null>;
  upsertProfile(userId: string, content: ProfileContent): Promise<Profile>;

  createConversation(userId: string): Promise<Conversation>;
  getConversation(userId: string, id: string): Promise<Conversation | null>;
  getLatestConversation(userId: string): Promise<Conversation | null>;
  updateConversation(
    userId: string,
    id: string,
    patch: Partial<Pick<Conversation, "status" | "coverage" | "ready_to_complete" | "completed_at">>,
  ): Promise<Conversation>;
  addMessages(
    userId: string,
    conversationId: string,
    messages: { role: MessageRole; content: string }[],
  ): Promise<Message[]>;
  listMessages(userId: string, conversationId: string): Promise<Message[]>;

  createPaths(userId: string, conversationId: string, drafts: PathDraft[]): Promise<Path[]>;
  /** The user's paths in creation order; optionally for one conversation. */
  listPaths(userId: string, conversationId?: string): Promise<Path[]>;
  getPath(userId: string, pathId: string): Promise<Path | null>;
  updatePath(userId: string, pathId: string, patch: Partial<Pick<Path, "title" | "category">>): Promise<Path>;

  listUserPaths(userId: string): Promise<UserPath[]>;
  upsertUserPath(
    userId: string,
    pathId: string,
    patch: Partial<Pick<UserPath, "status" | "selected_at" | "exploration_score">>,
  ): Promise<UserPath>;

  createExperiment(userId: string, pathId: string, draft: ExperimentDraft): Promise<Experiment>;
  getActiveExperiment(userId: string, pathId: string): Promise<Experiment | null>;
  updateExperiment(
    userId: string,
    id: string,
    patch: Partial<Pick<Experiment, "status" | "completed_at">>,
  ): Promise<Experiment>;
  listTasks(userId: string, experimentId: string): Promise<ExperimentTask[]>;
  updateTask(userId: string, taskId: string, completed: boolean): Promise<ExperimentTask>;

  createRoadmap(userId: string, pathId: string, title: string, content: RoadmapContent): Promise<Roadmap>;
  getActiveRoadmap(userId: string, pathId: string): Promise<Roadmap | null>;

  createCheckIn(userId: string, pathId: string, input: CheckInInput): Promise<CheckIn>;
  updateCheckInAnalysis(userId: string, id: string, analysis: NonNullable<CheckIn["analysis"]>): Promise<CheckIn>;
  getCheckIn(userId: string, id: string): Promise<CheckIn | null>;
  getLatestCheckIn(userId: string, pathId?: string): Promise<CheckIn | null>;

  createInsights(
    userId: string,
    items: { path_id: string | null; content: string; headline: string | null; source_type: InsightSource }[],
  ): Promise<Insight[]>;
  listInsights(userId: string): Promise<Insight[]>;
}

export class NotFoundError extends Error {
  constructor(entity: string) {
    super(`${entity} not found`);
    this.name = "NotFoundError";
  }
}
