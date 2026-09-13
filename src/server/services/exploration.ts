import { isReadyToComplete } from "@/domain/rules";
import type { ConversationView, Path, PathWithStatus } from "@/domain/types";
import { track } from "../analytics";
import type { AppContext } from "../context";
import { AppError } from "../errors";
import { once, withAI } from "./shared";

const TURN_FAILED = "The coach couldn't respond just now. Your message wasn't lost — try sending it again.";

/** Starts a new exploration. AI runs first so a failure leaves nothing half-created. */
export async function startConversation(
  { repo, ai }: AppContext,
  userId: string,
  opening?: string,
): Promise<ConversationView> {
  const history = opening ? [{ role: "user" as const, content: opening }] : [];
  const turn = await withAI(
    opening ? TURN_FAILED : "The coach couldn't start the conversation just now. Please try again.",
    () => ai.conversationTurn({ messages: history }),
  );

  const conversation = await repo.createConversation(userId);
  await repo.addMessages(userId, conversation.id, [...history, { role: "assistant", content: turn.reply }]);
  const updated = await repo.updateConversation(userId, conversation.id, {
    coverage: turn.coverage,
    ready_to_complete: isReadyToComplete(turn.ready_to_complete, history.length),
  });
  track(userId, "conversation_started", { with_opening: Boolean(opening) });

  return { conversation: updated, messages: await repo.listMessages(userId, conversation.id) };
}

export async function getLatestConversation({ repo }: AppContext, userId: string): Promise<ConversationView | null> {
  const conversation = await repo.getLatestConversation(userId);
  if (!conversation) return null;
  return { conversation, messages: await repo.listMessages(userId, conversation.id) };
}

/** Adds a user message and the coach's reply. Both persist only if the AI succeeds. */
export async function sendMessage(
  { repo, ai }: AppContext,
  userId: string,
  conversationId: string,
  content: string,
): Promise<ConversationView> {
  const conversation = await repo.getConversation(userId, conversationId);
  if (!conversation) throw new AppError("not_found", "Conversation not found.");
  if (conversation.status !== "active") throw new AppError("conflict", "This conversation is already complete.");

  const history = await repo.listMessages(userId, conversationId);
  const turn = await withAI(TURN_FAILED, () =>
    ai.conversationTurn({ messages: [...history, { role: "user", content }] }),
  );

  await repo.addMessages(userId, conversationId, [
    { role: "user", content },
    { role: "assistant", content: turn.reply },
  ]);
  const userMessages = history.filter((m) => m.role === "user").length + 1;
  const updated = await repo.updateConversation(userId, conversationId, {
    coverage: turn.coverage,
    // Once ready, stay ready: extra messages after the coach offers directions shouldn't lock the user out.
    ready_to_complete: conversation.ready_to_complete || isReadyToComplete(turn.ready_to_complete, userMessages),
  });
  return { conversation: updated, messages: await repo.listMessages(userId, conversationId) };
}

/**
 * Generates the profile and exactly three directions. Idempotent: returns the
 * existing paths if this conversation already produced them.
 */
export function completeConversation(ctx: AppContext, userId: string, conversationId: string): Promise<Path[]> {
  return once(`complete:${userId}:${conversationId}`, async () => {
    const { repo, ai } = ctx;
    const conversation = await repo.getConversation(userId, conversationId);
    if (!conversation) throw new AppError("not_found", "Conversation not found.");

    const existing = await repo.listPaths(userId, conversationId);
    if (existing.length > 0) return existing;

    if (!conversation.ready_to_complete) {
      throw new AppError("conflict", "Let's talk a little more before suggesting directions.");
    }

    const messages = await repo.listMessages(userId, conversationId);
    const profile = await withAI("We couldn't finish building your profile. Please try again.", () =>
      ai.generateProfile({ messages }),
    );
    const candidates = await withAI("We couldn't generate your directions. Please try again.", () =>
      ai.generatePaths({ profile }),
    );

    await repo.upsertProfile(userId, profile);
    track(userId, "profile_generated");

    const paths = await repo.createPaths(userId, conversationId, candidates.paths);
    await repo.createInsights(
      userId,
      [...profile.motivations, ...profile.preferences].slice(0, 4).map((content) => ({
        path_id: null,
        content,
        headline: null,
        source_type: "conversation" as const,
      })),
    );
    await repo.updateConversation(userId, conversationId, {
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    track(userId, "conversation_completed", { messages: messages.length });
    track(userId, "paths_generated", { count: paths.length });
    return paths;
  });
}

/** The directions from the user's most recent completed exploration. */
export async function listCurrentPaths({ repo }: AppContext, userId: string): Promise<PathWithStatus[]> {
  const all = await repo.listPaths(userId);
  const latestConversationId = all.at(-1)?.conversation_id;
  if (!latestConversationId) return [];

  const userPaths = await repo.listUserPaths(userId);
  return all
    .filter((p) => p.conversation_id === latestConversationId)
    .map((p) => ({ ...p, user_path: userPaths.find((u) => u.path_id === p.id) ?? null }));
}
