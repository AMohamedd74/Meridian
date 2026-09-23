import { route } from "@/server/http";
import { completeConversation } from "@/server/services/exploration";

// AI generation can take a while; allow it to finish instead of timing out mid-request.
export const maxDuration = 180;

export const POST = route<{ id: string }>(({ ctx, userId, params }) => completeConversation(ctx, userId, params.id), {
  limits: ["generation", "generation_daily"],
});
