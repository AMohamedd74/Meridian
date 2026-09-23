import { route } from "@/server/http";
import { analyzeCheckIn } from "@/server/services/direction";

// AI generation can take a while; allow it to finish instead of timing out mid-request.
export const maxDuration = 300;

export const POST = route<{ id: string }>(({ ctx, userId, params }) => analyzeCheckIn(ctx, userId, params.id), {
  limits: ["generation", "generation_daily"],
});
