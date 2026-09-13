export type AppErrorCode = "bad_request" | "unauthorized" | "not_found" | "conflict" | "ai_unavailable";

const STATUS: Record<AppErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  not_found: 404,
  conflict: 409,
  ai_unavailable: 502,
};

/** An error that is safe to show to the user. */
export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
  }
}
