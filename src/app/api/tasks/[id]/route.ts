import { TaskUpdateInputSchema } from "@/domain/schemas";
import { parseBody, route } from "@/server/http";
import { setTaskCompleted } from "@/server/services/direction";

export const PATCH = route<{ id: string }>(async ({ ctx, userId, req, params }) => {
  const { completed } = await parseBody(req, TaskUpdateInputSchema);
  return setTaskCompleted(ctx, userId, params.id, completed);
});
