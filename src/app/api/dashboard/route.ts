import { route } from "@/server/http";
import { getDashboard } from "@/server/services/direction";

export const GET = route(({ ctx, userId }) => getDashboard(ctx, userId));
