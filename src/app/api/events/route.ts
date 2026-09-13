import { z } from "zod";
import { CLIENT_EVENTS, track } from "@/server/analytics";
import { parseBody, route } from "@/server/http";

const EventSchema = z.object({ event: z.enum(CLIENT_EVENTS) });

export const POST = route(async ({ userId, req }) => {
  const { event } = await parseBody(req, EventSchema);
  track(userId, event);
  return { ok: true };
});
