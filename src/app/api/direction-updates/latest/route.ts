import { route } from "@/server/http";
import { getLatestDirectionUpdate } from "@/server/services/direction";

export const GET = route(({ ctx, userId }) => getLatestDirectionUpdate(ctx, userId));
