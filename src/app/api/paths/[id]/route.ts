import { route } from "@/server/http";
import { getPathDetail } from "@/server/services/direction";

export const GET = route<{ id: string }>(({ ctx, userId, params }) => getPathDetail(ctx, userId, params.id));
