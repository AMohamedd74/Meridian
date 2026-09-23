import { NextResponse } from "next/server";
import type { z } from "zod";
import { getRequestContext, type AppContext } from "./context";
import { AppError } from "./errors";
import { reportError } from "./monitoring";
import { enforceLimits, type LimitName } from "./rate-limit";
import { NotFoundError } from "./repo/types";

type Handler<P> = (args: { ctx: AppContext; userId: string; req: Request; params: P }) => Promise<unknown>;

interface RouteOptions {
  /** Per-user limits to charge before running the handler. Order matters: the first exceeded wins. */
  limits?: readonly LimitName[];
}

/**
 * Wraps a route: resolves the authenticated user, enforces rate limits, runs
 * the handler, and maps errors to safe JSON responses.
 */
export function route<P = Record<string, never>>(handler: Handler<P>, options: RouteOptions = {}) {
  return async (req: Request, segment: { params: Promise<P> }) => {
    try {
      const { ctx, userId } = await getRequestContext();
      if (options.limits?.length) await enforceLimits(ctx.limiter, options.limits);
      const params = await segment.params;
      const data = await handler({ ctx, userId, req, params });
      return NextResponse.json({ data });
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json(
          { error: { code: error.code, message: error.message } },
          {
            status: error.status,
            headers: error.retryAfter ? { "Retry-After": String(error.retryAfter) } : undefined,
          },
        );
      }
      if (error instanceof NotFoundError) {
        return NextResponse.json({ error: { code: "not_found", message: error.message } }, { status: 404 });
      }
      reportError(error, { route: new URL(req.url).pathname, method: req.method });
      return NextResponse.json(
        { error: { code: "internal", message: "Something went wrong. Please try again." } },
        { status: 500 },
      );
    }
  };
}

export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  const json = await req.json().catch(() => {
    throw new AppError("bad_request", "Invalid request body.");
  });
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new AppError("bad_request", "Some answers look invalid. Please check and try again.");
  return parsed.data;
}
