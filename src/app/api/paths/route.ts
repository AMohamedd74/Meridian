import { route } from "@/server/http";
import { listCurrentPaths } from "@/server/services/exploration";

export const GET = route(({ ctx, userId }) => listCurrentPaths(ctx, userId));
