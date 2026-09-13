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
 * In-memory repository for the mocked phase. Data lives for the lifetime of
 * the server process. Replaced by the Supabase repository in a later phase.
 */

interface Tables {
  profiles: Profile[];
  conversations: Conversation[];
  messages: Message[];
  paths: Path[];
  user_paths: UserPath[];
  experiments: Experiment[];
  experiment_tasks: ExperimentTask[];
  check_ins: CheckIn[];
  insights: Insight[];
  roadmaps: Roadmap[];
}

const emptyTables = (): Tables => ({
  profiles: [],
  conversations: [],
  messages: [],
  paths: [],
  user_paths: [],
  experiments: [],
  experiment_tasks: [],
  check_ins: [],
  insights: [],
  roadmaps: [],
});

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const clone = <T>(v: T): T => structuredClone(v);
const newestFirst = <T extends { created_at: string }>(a: T, b: T) => b.created_at.localeCompare(a.created_at);

export function createMemoryRepository(db: Tables = emptyTables()): Repository {
  const must = <T>(row: T | undefined, entity: string): T => {
    if (!row) throw new NotFoundError(entity);
    return row;
  };
  const ownConversation = (userId: string, conversationId: string) =>
    must(db.conversations.find((c) => c.id === conversationId && c.user_id === userId), "Conversation");
  const ownExperiment = (userId: string, experimentId: string) =>
    must(db.experiments.find((e) => e.id === experimentId && e.user_id === userId), "Experiment");

  return {
    async getProfile(userId) {
      return clone(db.profiles.find((p) => p.user_id === userId) ?? null);
    },
    async upsertProfile(userId, content) {
      const existing = db.profiles.find((p) => p.user_id === userId);
      if (existing) {
        Object.assign(existing, content, { updated_at: now() });
        return clone(existing);
      }
      const row: Profile = { ...content, id: id(), user_id: userId, created_at: now(), updated_at: now() };
      db.profiles.push(row);
      return clone(row);
    },

    async createConversation(userId) {
      const t = now();
      const row: Conversation = {
        id: id(),
        user_id: userId,
        status: "active",
        coverage: 0,
        ready_to_complete: false,
        started_at: t,
        completed_at: null,
        created_at: t,
        updated_at: t,
      };
      db.conversations.push(row);
      return clone(row);
    },
    async getConversation(userId, conversationId) {
      return clone(db.conversations.find((c) => c.id === conversationId && c.user_id === userId) ?? null);
    },
    async getLatestConversation(userId) {
      return clone(db.conversations.filter((c) => c.user_id === userId).sort(newestFirst)[0] ?? null);
    },
    async updateConversation(userId, conversationId, patch) {
      const row = ownConversation(userId, conversationId);
      Object.assign(row, patch, { updated_at: now() });
      return clone(row);
    },
    async addMessages(userId, conversationId, messages) {
      ownConversation(userId, conversationId);
      const base = Date.now();
      const rows = messages.map<Message>((m, i) => ({
        id: id(),
        conversation_id: conversationId,
        role: m.role,
        content: m.content,
        // Keep insertion order stable when timestamps collide.
        created_at: new Date(base + i).toISOString(),
      }));
      db.messages.push(...rows);
      return clone(rows);
    },
    async listMessages(userId, conversationId) {
      ownConversation(userId, conversationId);
      return clone(
        db.messages
          .filter((m) => m.conversation_id === conversationId)
          .sort((a, b) => a.created_at.localeCompare(b.created_at)),
      );
    },

    async createPaths(userId, conversationId, drafts) {
      ownConversation(userId, conversationId);
      const rows = drafts.map<Path>((d) => ({
        id: id(),
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
        created_at: now(),
      }));
      db.paths.push(...rows);
      for (const p of rows) {
        db.user_paths.push({
          id: id(),
          user_id: userId,
          path_id: p.id,
          status: "suggested",
          selected_at: null,
          exploration_score: p.metadata.initial_exploration_level,
          created_at: now(),
          updated_at: now(),
        });
      }
      return clone(rows);
    },
    async listPaths(userId, conversationId) {
      return clone(
        db.paths.filter((p) => p.user_id === userId && (!conversationId || p.conversation_id === conversationId)),
      );
    },
    async getPath(userId, pathId) {
      return clone(db.paths.find((p) => p.id === pathId && p.user_id === userId) ?? null);
    },
    async updatePath(userId, pathId, patch) {
      const row = must(db.paths.find((p) => p.id === pathId && p.user_id === userId), "Path");
      Object.assign(row, patch);
      return clone(row);
    },

    async listUserPaths(userId) {
      return clone(db.user_paths.filter((u) => u.user_id === userId));
    },
    async upsertUserPath(userId, pathId, patch) {
      must(db.paths.find((p) => p.id === pathId && p.user_id === userId), "Path");
      let row = db.user_paths.find((u) => u.path_id === pathId && u.user_id === userId);
      if (!row) {
        row = {
          id: id(),
          user_id: userId,
          path_id: pathId,
          status: "suggested",
          selected_at: null,
          exploration_score: 50,
          created_at: now(),
          updated_at: now(),
        };
        db.user_paths.push(row);
      }
      Object.assign(row, patch, { updated_at: now() });
      return clone(row);
    },

    async createExperiment(userId, pathId, draft) {
      const t = now();
      const row: Experiment = {
        id: id(),
        user_id: userId,
        path_id: pathId,
        title: draft.title,
        description: draft.objective,
        goal: draft.uncertainty_tested,
        duration_days: draft.duration_days,
        status: "active",
        metadata: {
          uncertainty_tested: draft.uncertainty_tested,
          expected_evidence: draft.expected_evidence,
          reflection_prompt: draft.reflection_prompt,
        },
        started_at: t,
        completed_at: null,
        created_at: t,
        updated_at: t,
      };
      db.experiments.push(row);
      db.experiment_tasks.push(
        ...draft.tasks.map<ExperimentTask>((task) => ({
          id: id(),
          experiment_id: row.id,
          title: task.title,
          description: task.description,
          completed: false,
          due_date: addDays(t, task.day_offset),
          completed_at: null,
          created_at: t,
        })),
      );
      return clone(row);
    },
    async getActiveExperiment(userId, pathId) {
      return clone(
        db.experiments
          .filter((e) => e.user_id === userId && e.path_id === pathId && e.status === "active")
          .sort(newestFirst)[0] ?? null,
      );
    },
    async updateExperiment(userId, experimentId, patch) {
      const row = ownExperiment(userId, experimentId);
      Object.assign(row, patch, { updated_at: now() });
      return clone(row);
    },
    async listTasks(userId, experimentId) {
      ownExperiment(userId, experimentId);
      return clone(db.experiment_tasks.filter((t) => t.experiment_id === experimentId));
    },
    async updateTask(userId, taskId, completed) {
      const task = must(db.experiment_tasks.find((t) => t.id === taskId), "Task");
      ownExperiment(userId, task.experiment_id);
      task.completed = completed;
      task.completed_at = completed ? now() : null;
      return clone(task);
    },

    async createRoadmap(userId, pathId, title, content) {
      const previous = db.roadmaps.filter((r) => r.user_id === userId && r.path_id === pathId);
      previous.forEach((r) => (r.active = false));
      const row: Roadmap = {
        id: id(),
        user_id: userId,
        path_id: pathId,
        title,
        horizon: "30_days",
        content,
        version: previous.length + 1,
        active: true,
        created_at: now(),
      };
      db.roadmaps.push(row);
      return clone(row);
    },
    async getActiveRoadmap(userId, pathId) {
      return clone(db.roadmaps.find((r) => r.user_id === userId && r.path_id === pathId && r.active) ?? null);
    },

    async createCheckIn(userId, pathId, input) {
      const row: CheckIn = { ...input, id: id(), user_id: userId, path_id: pathId, analysis: null, created_at: now() };
      db.check_ins.push(row);
      return clone(row);
    },
    async updateCheckInAnalysis(userId, checkInId, analysis) {
      const row = must(db.check_ins.find((c) => c.id === checkInId && c.user_id === userId), "Check-in");
      row.analysis = analysis;
      return clone(row);
    },
    async getLatestCheckIn(userId, pathId) {
      return clone(
        db.check_ins
          .filter((c) => c.user_id === userId && (!pathId || c.path_id === pathId))
          .sort(newestFirst)[0] ?? null,
      );
    },
    async getCheckIn(userId, checkInId) {
      return clone(db.check_ins.find((c) => c.id === checkInId && c.user_id === userId) ?? null);
    },

    async createInsights(userId, items) {
      const rows = items.map<Insight>((item) => ({ ...item, id: id(), user_id: userId, created_at: now() }));
      db.insights.push(...rows);
      return clone(rows);
    },
    async listInsights(userId) {
      return clone(db.insights.filter((i) => i.user_id === userId).sort(newestFirst));
    },
  };
}
