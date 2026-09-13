import { route } from "@/server/http";
import { getLatestConversation } from "@/server/services/exploration";

export const GET = route(({ ctx, userId }) => getLatestConversation(ctx, userId));
