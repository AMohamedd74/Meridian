import { StartConversationInputSchema } from "@/domain/schemas";
import { parseBody, route } from "@/server/http";
import { startConversation } from "@/server/services/exploration";

// AI generation can take a while; allow it to finish instead of timing out mid-request.
export const maxDuration = 60;

export const POST = route(async ({ ctx, userId, req }) => {
  const { opening } = await parseBody(req, StartConversationInputSchema);
  return startConversation(ctx, userId, opening);
});
