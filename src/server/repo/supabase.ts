import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "@/domain/rules";
import type {
  CheckIn,
  Conversation,
  Experiment,
  ExperimentTask,
  Insight,
  Message,
  Path,
  Profile,
  Roadmap,
  UserPath,
} from "@/domain/types";
import { NotFoundError, type Repository } from "./types";

/**
 * Supabase repository. The client acts as the signed-in user, so Row Level
 * Security is the real ownership boundary; the explicit user_id filters below
 * are defence in depth and keep queries index-friendly.
 */

export class RepositoryError extends Error {
  constructor(operation: string, cause: PostgrestError) {
    // Log-safe: Postgres error codes/messages never include row content.
    super(`${operation} failed: ${cause.code} ${cause.message}`);
    this.name = "RepositoryError";
  }
}

type Result<T> = { data: T | null; error: PostgrestError | null };

function many<T>(operation: string, { data, error }: Result<T[]>): T[] {
  if (error) throw new RepositoryError(operation, error);
  return data ?? [];
}

/** invalid_text_representation: e.g. a malformed uuid in the URL. It can't match a row, so treat it as not found. */
const INVALID_TEXT_REPRESENTATION = "22P02";

function maybe<T>(operation: string, { data, error }: Result<T>): T | null {
  if (error?.code === INVALID_TEXT_REPRESENTATION) return null;
  if (error) throw new RepositoryError(operation, error);
  return data;
}

function one<T>(operation: string, entity: string, result: Result<T>): T {
  const row = maybe(operation, result);
  if (!row) throw new NotFoundError(entity);
  return row;
}

/** Explicit, strictly increasing timestamps keep batch-inserted rows in order. */
function sequence(count: number): string[] {
  const base = Date.now();
  return Array.from({ length: count }, (_, i) => new Date(base + i).toISOString());
}

const nowIso = () => new Date().toISOString();

export function createSupabaseRepository(db: SupabaseClient): Repository {
  const repo: Repository = {
    async getProfile(userId) {
      return maybe<Profile>("getProfile", await db.from("profiles").select().eq("user_id", userId).maybeSingle());
    },
    async upsertProfile(userId, content) {
      return one<Profile>(
        "upsertProfile",
        "Profile",
        await db
          .from("profiles")
          .upsert({ ...content, user_id: userId }, { onConflict: "user_id" })
          .select()
          .single(),
      );
    },

    async createConversation(userId) {
      return one<Conversation>(
        "createConversation",
        "Conversation",
        await db.from("conversations").insert({ user_id: userId }).select().single(),
      );
    },
    async getConversation(userId, id) {
      return maybe<Conversation>(
        "getConversation",
        await db.from("conversations").select().eq("id", id).eq("user_id", userId).maybeSingle(),
      );
    },
    async getLatestConversation(userId) {
      return maybe<Conversation>(
        "getLatestConversation",
        await db
          .from("conversations")
          .select()
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      );
    },
    async updateConversation(userId, id, patch) {
      return one<Conversation>(
        "updateConversation",
        "Conversation",
        await db.from("conversations").update(patch).eq("id", id).eq("user_id", userId).select().maybeSingle(),
      );
    },
    async addMessages(userId, conversationId, messages) {
      if (!(await repo.getConversation(userId, conversationId))) throw new NotFoundError("Conversation");
      const times = sequence(messages.length);
      return many<Message>(
        "addMessages",
        await db
          .from("messages")
          .insert(messages.map((m, i) => ({ ...m, conversation_id: conversationId, created_at: times[i] })))
          .select()
          .order("created_at"),
      );
    },
    async listMessages(userId, conversationId) {
      if (!(await repo.getConversation(userId, conversationId))) throw new NotFoundError("Conversation");
      return many<Message>(
        "listMessages",
        await db.from("messages").select().eq("conversation_id", conversationId).order("created_at"),
      );
    },

    async createPaths(userId, conversationId, drafts) {
      const times = sequence(drafts.length);
      const paths = many<Path>(
        "createPaths",
        await db
          .from("paths")
          .insert(
            drafts.map((d, i) => ({
              user_id: userId,
              conversation_id: conversationId,
              title: d.title,
              category: d.category,
              description: d.description,
              why_it_fits: d.why_it_fits,
              strengths: d.relevant_strengths,
              uncertainties: d.uncertainties,
              first_experiment: d.first_experiment,
              experiment_duration: d.experiment_duration_days,
              metadata: {
                tags: d.tags,
                path_type: d.path_type,
                success_criteria: d.success_criteria,
                thirty_day_direction: d.thirty_day_direction,
                signals: d.signals,
                initial_exploration_level: d.initial_exploration_level,
              },
              created_at: times[i],
            })),
          )
          .select()
          .order("created_at"),
      );
      many(
        "createUserPaths",
        await db
          .from("user_paths")
          .insert(
            paths.map((p) => ({
              user_id: userId,
              path_id: p.id,
              exploration_score: p.metadata.initial_exploration_level,
            })),
          )
          .select("id"),
      );
      return paths;
    },
    async listPaths(userId, conversationId) {
      let query = db.from("paths").select().eq("user_id", userId);
      if (conversationId) query = query.eq("conversation_id", conversationId);
      return many<Path>("listPaths", await query.order("created_at"));
    },
    async getPath(userId, pathId) {
      return maybe<Path>("getPath", await db.from("paths").select().eq("id", pathId).eq("user_id", userId).maybeSingle());
    },
    async updatePath(userId, pathId, patch) {
      return one<Path>(
        "updatePath",
        "Path",
        await db.from("paths").update(patch).eq("id", pathId).eq("user_id", userId).select().maybeSingle(),
      );
    },

    async listUserPaths(userId) {
      return many<UserPath>("listUserPaths", await db.from("user_paths").select().eq("user_id", userId));
    },
    async upsertUserPath(userId, pathId, patch) {
      if (!(await repo.getPath(userId, pathId))) throw new NotFoundError("Path");
      return one<UserPath>(
        "upsertUserPath",
        "Path",
        await db
          .from("user_paths")
          .upsert({ ...patch, user_id: userId, path_id: pathId }, { onConflict: "user_id,path_id" })
          .select()
          .single(),
      );
    },

    async createExperiment(userId, pathId, draft) {
      const startedAt = nowIso();
      const experiment = one<Experiment>(
        "createExperiment",
        "Experiment",
        await db
          .from("experiments")
          .insert({
            user_id: userId,
            path_id: pathId,
            title: draft.title,
            description: draft.objective,
            goal: draft.uncertainty_tested,
            duration_days: draft.duration_days,
            metadata: {
              uncertainty_tested: draft.uncertainty_tested,
              expected_evidence: draft.expected_evidence,
              reflection_prompt: draft.reflection_prompt,
            },
            started_at: startedAt,
          })
          .select()
          .single(),
      );
      many(
        "createTasks",
        await db
          .from("experiment_tasks")
          .insert(
            draft.tasks.map((task, i) => ({
              experiment_id: experiment.id,
              title: task.title,
              description: task.description,
              due_date: addDays(startedAt, task.day_offset),
              position: i,
            })),
          )
          .select("id"),
      );
      return experiment;
    },
    async getActiveExperiment(userId, pathId) {
      return maybe<Experiment>(
        "getActiveExperiment",
        await db
          .from("experiments")
          .select()
          .eq("user_id", userId)
          .eq("path_id", pathId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      );
    },
    async updateExperiment(userId, id, patch) {
      return one<Experiment>(
        "updateExperiment",
        "Experiment",
        await db.from("experiments").update(patch).eq("id", id).eq("user_id", userId).select().maybeSingle(),
      );
    },
    async listTasks(userId, experimentId) {
      const rows = many<ExperimentTask & { position: number; experiments: unknown }>(
        "listTasks",
        await db
          .from("experiment_tasks")
          .select("*, experiments!inner(user_id)")
          .eq("experiment_id", experimentId)
          .eq("experiments.user_id", userId)
          .order("position"),
      );
      return rows.map(({ position: _position, experiments: _experiments, ...task }) => task);
    },
    async updateTask(userId, taskId, completed) {
      // RLS only allows updating tasks of the user's own experiments; a foreign id matches no row.
      const task = maybe<ExperimentTask & { position?: number }>(
        "updateTask",
        await db
          .from("experiment_tasks")
          .update({ completed, completed_at: completed ? nowIso() : null })
          .eq("id", taskId)
          .select()
          .maybeSingle(),
      );
      if (!task) throw new NotFoundError("Task");
      const { position: _position, ...rest } = task;
      return rest;
    },

    async createRoadmap(userId, pathId, title, content) {
      const previous = many<{ version: number }>(
        "listRoadmapVersions",
        await db
          .from("roadmaps")
          .select("version")
          .eq("user_id", userId)
          .eq("path_id", pathId)
          .order("version", { ascending: false })
          .limit(1),
      );
      many(
        "deactivateRoadmaps",
        await db.from("roadmaps").update({ active: false }).eq("user_id", userId).eq("path_id", pathId).eq("active", true).select("id"),
      );
      return one<Roadmap>(
        "createRoadmap",
        "Roadmap",
        await db
          .from("roadmaps")
          .insert({
            user_id: userId,
            path_id: pathId,
            title,
            horizon: "30_days",
            content,
            version: (previous[0]?.version ?? 0) + 1,
            active: true,
          })
          .select()
          .single(),
      );
    },
    async getActiveRoadmap(userId, pathId) {
      return maybe<Roadmap>(
        "getActiveRoadmap",
        await db.from("roadmaps").select().eq("user_id", userId).eq("path_id", pathId).eq("active", true).maybeSingle(),
      );
    },

    async createCheckIn(userId, pathId, input) {
      return one<CheckIn>(
        "createCheckIn",
        "Check-in",
        await db
          .from("check_ins")
          .insert({ ...input, user_id: userId, path_id: pathId })
          .select()
          .single(),
      );
    },
    async updateCheckInAnalysis(userId, id, analysis) {
      return one<CheckIn>(
        "updateCheckInAnalysis",
        "Check-in",
        await db.from("check_ins").update({ analysis }).eq("id", id).eq("user_id", userId).select().maybeSingle(),
      );
    },
    async getCheckIn(userId, id) {
      return maybe<CheckIn>("getCheckIn", await db.from("check_ins").select().eq("id", id).eq("user_id", userId).maybeSingle());
    },
    async getLatestCheckIn(userId, pathId) {
      let query = db.from("check_ins").select().eq("user_id", userId);
      if (pathId) query = query.eq("path_id", pathId);
      return maybe<CheckIn>(
        "getLatestCheckIn",
        await query.order("created_at", { ascending: false }).limit(1).maybeSingle(),
      );
    },

    async createInsights(userId, items) {
      if (items.length === 0) return [];
      const createdAt = nowIso();
      const rows = many<Insight & { position: number }>(
        "createInsights",
        await db
          .from("insights")
          .insert(items.map((item, i) => ({ ...item, user_id: userId, position: i, created_at: createdAt })))
          .select()
          .order("position"),
      );
      return rows.map(({ position: _position, ...insight }) => insight);
    },
    async listInsights(userId) {
      const rows = many<Insight & { position: number }>(
        "listInsights",
        await db
          .from("insights")
          .select()
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .order("position"),
      );
      return rows.map(({ position: _position, ...insight }) => insight);
    },
  };
  return repo;
}
