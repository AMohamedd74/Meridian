import { CheckInInputSchema } from "@/domain/schemas";
import { parseBody, route } from "@/server/http";
import { submitCheckIn } from "@/server/services/direction";

// AI generation can take a while; allow it to finish instead of timing out mid-request.
export const maxDuration = 300;

export const POST = route(async ({ ctx, userId, req }) => {
  const input = await parseBody(req, CheckInInputSchema);
  return submitCheckIn(ctx, userId, input);
});
