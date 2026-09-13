import { SendMessageInputSchema } from "@/domain/schemas";
import { parseBody, route } from "@/server/http";
import { sendMessage } from "@/server/services/exploration";

// AI generation can take a while; allow it to finish instead of timing out mid-request.
export const maxDuration = 60;

export const POST = route<{ id: string }>(async ({ ctx, userId, req, params }) => {
  const { content } = await parseBody(req, SendMessageInputSchema);
  return sendMessage(ctx, userId, params.id, content);
});
