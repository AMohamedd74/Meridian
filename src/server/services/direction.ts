import type { CheckInInput, ProfileContent } from "@/domain/schemas";
import { nextExplorationLevel } from "@/domain/rules";
import type {
  DashboardView,
  DirectionUpdateView,
  ExperimentView,
  PathDetailView,
  UserPath,
} from "@/domain/types";
import { track } from "../analytics";
import type { AppContext } from "../context";
import { AppError } from "../errors";
import { once, withAI } from "./shared";

async function requireProfile({ repo }: AppContext, userId: string): Promise<ProfileContent> {
  const profile = await repo.getProfile(userId);
  if (!profile) throw new AppError("conflict", "Complete your exploration conversation first.");
  return profile;
}

async function activeUserPath({ repo }: AppContext, userId: string): Promise<UserPath | null> {
  const userPaths = await repo.listUserPaths(userId);
  return (
    userPaths
      .filter((u) => u.status === "active")
      .sort((a, b) => (b.selected_at ?? "").localeCompare(a.selected_at ?? ""))[0] ?? null
  );
}

async function experimentView({ repo }: AppContext, userId: string, pathId: string): Promise<ExperimentView | null> {
  const experiment = await repo.getActiveExperiment(userId, pathId);
  if (!experiment) return null;
  return { experiment, tasks: await repo.listTasks(userId, experiment.id) };
}

export async function getPathDetail(ctx: AppContext, userId: string, pathId: string): Promise<PathDetailView> {
  const { repo } = ctx;
  const path = await repo.getPath(userId, pathId);
  if (!path) throw new AppError("not_found", "Direction not found.");
  const userPath = (await repo.listUserPaths(userId)).find((u) => u.path_id === pathId) ?? null;
  return {
    path: { ...path, user_path: userPath },
    roadmap: await repo.getActiveRoadmap(userId, pathId),
    current: await experimentView(ctx, userId, pathId),
  };
}

/**
 * Selects a direction and generates its first experiment + roadmap.
 * Idempotent for an already-active path. Any previously active path is paused.
 */
export function selectPath(ctx: AppContext, userId: string, pathId: string): Promise<PathDetailView> {
  return once(`select:${userId}:${pathId}`, async () => {
    const { repo, ai } = ctx;
    const path = await repo.getPath(userId, pathId);
    if (!path) throw new AppError("not_found", "Direction not found.");

    const current = await activeUserPath(ctx, userId);
    if (current?.path_id === pathId && (await repo.getActiveExperiment(userId, pathId))) {
      return getPathDetail(ctx, userId, pathId);
    }

    const profile = await requireProfile(ctx, userId);
    const plan = await withAI("We couldn't build your experiment plan. Please try again.", () =>
      ai.generateRoadmap({ profile, path }),
    );

    if (current && current.path_id !== pathId) {
      await repo.upsertUserPath(userId, current.path_id, { status: "paused" });
    }
    await repo.upsertUserPath(userId, pathId, { status: "active", selected_at: new Date().toISOString() });
    await repo.createExperiment(userId, pathId, plan.experiment);
    await repo.createRoadmap(userId, pathId, path.title, plan.roadmap);

    track(userId, "path_selected", { path_type: path.metadata.path_type });
    track(userId, "experiment_started", { duration_days: plan.experiment.duration_days });
    return getPathDetail(ctx, userId, pathId);
  });
}

export async function setTaskCompleted({ repo }: AppContext, userId: string, taskId: string, completed: boolean) {
  const task = await repo.updateTask(userId, taskId, completed);
  if (completed) track(userId, "task_completed");
  return task;
}

/** Persists the check-in first, so a failed analysis can be retried without re-entering answers. */
export async function submitCheckIn(ctx: AppContext, userId: string, input: CheckInInput): Promise<DirectionUpdateView> {
  const active = await activeUserPath(ctx, userId);
  if (!active) throw new AppError("conflict", "Choose a direction before checking in.");

  const checkIn = await ctx.repo.createCheckIn(userId, active.path_id, input);
  return analyzeCheckIn(ctx, userId, checkIn.id);
}

/**
 * Analyses a check-in and applies the update: exploration level, insights,
 * a new experiment and roadmap version, and (with explanation) the direction.
 * Idempotent: an already-analysed check-in is returned as-is.
 */
export function analyzeCheckIn(ctx: AppContext, userId: string, checkInId: string): Promise<DirectionUpdateView> {
  return once(`analyze:${userId}:${checkInId}`, async () => {
    const { repo, ai } = ctx;
    const checkIn = await repo.getCheckIn(userId, checkInId);
    if (!checkIn) throw new AppError("not_found", "Check-in not found.");

    const path = await repo.getPath(userId, checkIn.path_id);
    if (!path) throw new AppError("not_found", "Direction not found.");
    if (checkIn.analysis) {
      return { check_in: checkIn, path, current: await experimentView(ctx, userId, path.id) };
    }

    const profile = await requireProfile(ctx, userId);
    const userPath = await repo.upsertUserPath(userId, path.id, {});
    const current = await experimentView(ctx, userId, path.id);

    const checkInContext = {
      profile,
      path,
      experiment: current?.experiment ?? null,
      tasks: current?.tasks ?? [],
      checkIn,
    };
    const retryMessage = "We saved your check-in, but couldn't analyse it yet. Please try again.";

    // Separate steps: evidence → decision → next plan. Nothing persists until all three validate.
    const evidence = await withAI(retryMessage, () => ai.analyzeCheckIn(checkInContext));
    const decision = await withAI(retryMessage, () =>
      ai.updateDirection({ ...checkInContext, explorationLevel: userPath.exploration_score, evidence }),
    );

    // Never change the direction silently: a new title requires `changed` + explanation (schema-enforced).
    const changed = decision.changed && decision.title.trim() !== path.title;
    const before = { title: path.title, exploration_level: userPath.exploration_score };
    const after = {
      title: changed ? decision.title.trim() : path.title,
      exploration_level: nextExplorationLevel(userPath.exploration_score, decision.exploration_delta),
    };

    const updatedPath = { ...path, title: after.title };
    const previousRoadmap = await repo.getActiveRoadmap(userId, path.id);
    const plan = await withAI("We saved your check-in, but couldn't update your plan yet. Please try again.", () =>
      ai.generateRoadmap({
        profile,
        path: updatedPath,
        replan: { checkIn, evidence, decision: { ...decision, changed }, previousRoadmap: previousRoadmap?.content ?? null },
      }),
    );
    const analysis = { ...evidence, direction: decision };

    // All AI output validated — persist.
    if (changed) await repo.updatePath(userId, path.id, { title: after.title });
    await repo.upsertUserPath(userId, path.id, { exploration_score: after.exploration_level });
    if (current) {
      await repo.updateExperiment(userId, current.experiment.id, {
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      track(userId, "experiment_completed", {
        tasks_done: current.tasks.filter((t) => t.completed).length,
        tasks_total: current.tasks.length,
      });
    }
    await repo.createExperiment(userId, path.id, plan.experiment);
    await repo.createRoadmap(userId, path.id, after.title, plan.roadmap);
    await repo.createInsights(userId, [
      { path_id: path.id, headline: analysis.insight.headline, content: analysis.insight.content, source_type: "check_in" },
      ...analysis.learned.map((content) => ({
        path_id: path.id,
        headline: null,
        content,
        source_type: "check_in" as const,
      })),
    ]);
    const saved = await repo.updateCheckInAnalysis(userId, checkIn.id, {
      ...analysis,
      direction: { ...analysis.direction, changed },
      before,
      after,
    });

    track(userId, "check_in_completed", { continue: checkIn.continue_preference });
    track(userId, "direction_updated", { changed, delta: after.exploration_level - before.exploration_level });

    return {
      check_in: saved,
      path: (await repo.getPath(userId, path.id)) ?? updatedPath,
      current: await experimentView(ctx, userId, path.id),
    };
  });
}

export async function getLatestDirectionUpdate(ctx: AppContext, userId: string): Promise<DirectionUpdateView | null> {
  const checkIn = await ctx.repo.getLatestCheckIn(userId);
  if (!checkIn) return null;
  const path = await ctx.repo.getPath(userId, checkIn.path_id);
  if (!path) return null;
  return { check_in: checkIn, path, current: await experimentView(ctx, userId, path.id) };
}

export async function getDashboard(ctx: AppContext, userId: string): Promise<DashboardView> {
  const { repo } = ctx;
  const [conversation, allPaths, active, insights] = await Promise.all([
    repo.getLatestConversation(userId),
    repo.listPaths(userId),
    activeUserPath(ctx, userId),
    repo.listInsights(userId),
  ]);

  const path = active ? await repo.getPath(userId, active.path_id) : null;
  return {
    path,
    user_path: active,
    roadmap: path ? await repo.getActiveRoadmap(userId, path.id) : null,
    current: path ? await experimentView(ctx, userId, path.id) : null,
    insights,
    latest_check_in: path ? await repo.getLatestCheckIn(userId, path.id) : null,
    has_conversation: Boolean(conversation),
    has_paths: allPaths.length > 0,
  };
}
