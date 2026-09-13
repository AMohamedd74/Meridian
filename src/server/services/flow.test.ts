import { describe, expect, it } from "vitest";
import type { CheckInInput } from "@/domain/schemas";
import { createMockProvider } from "../ai/mock";
import { createAIService } from "../ai/service";
import type { AIProvider } from "../ai/types";
import type { AppContext } from "../context";
import { AppError } from "../errors";
import { createMemoryRepository } from "../repo/memory";
import { analyzeCheckIn, getDashboard, selectPath, setTaskCompleted, submitCheckIn } from "./direction";
import { completeConversation, listCurrentPaths, sendMessage, startConversation } from "./exploration";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

function makeCtx(provider: AIProvider = createMockProvider({ latencyMs: 0 })): AppContext {
  return { repo: createMemoryRepository(), ai: createAIService(provider) };
}

async function exploreToPaths(ctx: AppContext) {
  const start = await startConversation(ctx, USER, "I'm bored with my career");
  let view = start;
  for (const answer of ["Designing clothes", "Creating and the business", "My own brand", "Playing it safe", "Need stable income"]) {
    view = await sendMessage(ctx, USER, start.conversation.id, answer);
  }
  return { conversationId: start.conversation.id, view, paths: await completeConversation(ctx, USER, start.conversation.id) };
}

const checkIn: CheckInInput = {
  energy: 8,
  motivation: 7,
  enjoyment: 8,
  difficulty: 5,
  enjoyed_activities: ["Creating", "Researching"],
  disliked_activities: ["Planning"],
  continue_preference: "definitely",
  reflection: "Loved the design work, not the logistics.",
};

describe("core loop", () => {
  it("runs conversation → 3 directions → selection → tasks → check-in → updated direction", async () => {
    const ctx = makeCtx();
    const { view, paths } = await exploreToPaths(ctx);

    expect(view.messages.filter((m) => m.role === "user")).toHaveLength(6);
    expect(view.conversation.ready_to_complete).toBe(true);
    expect(paths).toHaveLength(3);
    expect(await ctx.repo.getProfile(USER)).not.toBeNull();

    const detail = await selectPath(ctx, USER, paths[1].id);
    expect(detail.path.user_path?.status).toBe("active");
    expect(detail.current?.tasks.length).toBeGreaterThan(1);
    expect(detail.roadmap?.content.current_focus.title).toBeTruthy();

    const task = detail.current!.tasks[0];
    await setTaskCompleted(ctx, USER, task.id, true);
    const dashboard = await getDashboard(ctx, USER);
    expect(dashboard.current?.tasks.find((t) => t.id === task.id)?.completed).toBe(true);

    const update = await submitCheckIn(ctx, USER, checkIn);
    const analysis = update.check_in.analysis!;
    expect(analysis.direction.explanation.length).toBeGreaterThan(0);
    expect(analysis.after.exploration_level).not.toBe(analysis.before.exploration_level);
    expect(update.current?.experiment.id).not.toBe(detail.current!.experiment.id);

    const roadmap = await ctx.repo.getActiveRoadmap(USER, paths[1].id);
    expect(roadmap?.version).toBe(2);
    expect((await ctx.repo.listInsights(USER)).some((i) => i.source_type === "check_in")).toBe(true);
  });

  it("does not complete a conversation before the coach has enough information", async () => {
    const ctx = makeCtx();
    const start = await startConversation(ctx, USER, "Hi");
    await expect(completeConversation(ctx, USER, start.conversation.id)).rejects.toMatchObject({ code: "conflict" });
  });

  it("ignores a coach that claims readiness after a single message", async () => {
    const base = createMockProvider({ latencyMs: 0 });
    const ctx = makeCtx({
      ...base,
      conversationTurn: async () => ({ reply: "I have enough!", coverage: 1, ready_to_complete: true }),
    });
    const start = await startConversation(ctx, USER, "My whole life story in one message");
    expect(start.conversation.ready_to_complete).toBe(false);
    await expect(completeConversation(ctx, USER, start.conversation.id)).rejects.toMatchObject({ code: "conflict" });

    await sendMessage(ctx, USER, start.conversation.id, "second");
    const third = await sendMessage(ctx, USER, start.conversation.id, "third");
    expect(third.conversation.ready_to_complete).toBe(true);
  });

  it("is idempotent when completion is requested twice concurrently", async () => {
    const ctx = makeCtx();
    const start = await startConversation(ctx, USER);
    for (const a of ["a", "b", "c", "d", "e"]) await sendMessage(ctx, USER, start.conversation.id, a);
    const [a, b] = await Promise.all([
      completeConversation(ctx, USER, start.conversation.id),
      completeConversation(ctx, USER, start.conversation.id),
    ]);
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
    expect(await listCurrentPaths(ctx, USER)).toHaveLength(3);
  });
});

describe("ownership", () => {
  it("prevents another user from reading or mutating data", async () => {
    const ctx = makeCtx();
    const { conversationId, paths } = await exploreToPaths(ctx);
    const detail = await selectPath(ctx, USER, paths[0].id);

    await expect(sendMessage(ctx, OTHER, conversationId, "hi")).rejects.toMatchObject({ code: "not_found" });
    await expect(selectPath(ctx, OTHER, paths[0].id)).rejects.toMatchObject({ code: "not_found" });
    await expect(setTaskCompleted(ctx, OTHER, detail.current!.tasks[0].id, true)).rejects.toThrow();
    expect(await listCurrentPaths(ctx, OTHER)).toEqual([]);
  });
});

describe("AI failures", () => {
  it("rejects malformed AI output and persists nothing", async () => {
    const base = createMockProvider({ latencyMs: 0 });
    const ctx = makeCtx({
      ...base,
      generatePaths: async () => ({ paths: [{ title: "Only one" }] }),
    });
    const start = await startConversation(ctx, USER);
    for (const a of ["a", "b", "c", "d", "e"]) await sendMessage(ctx, USER, start.conversation.id, a);

    await expect(completeConversation(ctx, USER, start.conversation.id)).rejects.toBeInstanceOf(AppError);
    expect(await ctx.repo.listPaths(USER)).toEqual([]);
    expect((await ctx.repo.getConversation(USER, start.conversation.id))?.status).toBe("active");
  });

  it("does not persist a user message when the reply fails", async () => {
    const base = createMockProvider({ latencyMs: 0 });
    let fail = false;
    const ctx = makeCtx({
      ...base,
      conversationTurn: async (input) => {
        if (fail) throw new Error("down");
        return base.conversationTurn(input);
      },
    });
    const start = await startConversation(ctx, USER);
    fail = true;
    await expect(sendMessage(ctx, USER, start.conversation.id, "hello")).rejects.toMatchObject({
      code: "ai_unavailable",
    });
    expect(await ctx.repo.listMessages(USER, start.conversation.id)).toHaveLength(1);
  });

  it("keeps a check-in when analysis fails and allows retry", async () => {
    const base = createMockProvider({ latencyMs: 0 });
    let fail = true;
    const ctx = makeCtx({
      ...base,
      analyzeCheckIn: async (input) => {
        if (fail) throw new Error("down");
        return base.analyzeCheckIn(input);
      },
    });
    const { paths } = await exploreToPaths(ctx);
    await selectPath(ctx, USER, paths[0].id);

    await expect(submitCheckIn(ctx, USER, checkIn)).rejects.toMatchObject({ code: "ai_unavailable" });
    const saved = await ctx.repo.getLatestCheckIn(USER);
    expect(saved?.analysis).toBeNull();

    fail = false;
    const retried = await analyzeCheckIn(ctx, USER, saved!.id);
    expect(retried.check_in.analysis).not.toBeNull();
  });
});
