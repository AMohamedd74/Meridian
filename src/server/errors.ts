export type AppErrorCode = "bad_request" | "unauthorized" | "not_found" | "conflict" | "rate_limited" | "ai_unavailable";

const STATUS: Record<AppErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  ai_unavailable: 502,
};

/** An error that is safe to show to the user. */
export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: AppErrorCode,
    message: string,
    /** Seconds until the user may retry; sent as Retry-After for rate limits. */
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
  }
}
