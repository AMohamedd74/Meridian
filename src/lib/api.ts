import type { CheckInInput } from "@/domain/schemas";
import type {
  ConversationView,
  DashboardView,
  DirectionUpdateView,
  ExperimentTask,
  Path,
  PathDetailView,
  PathWithStatus,
} from "@/domain/types";

/** Typed browser client for the app's API routes. Throws ApiError with a user-safe message. */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("You appear to be offline. Check your connection and try again.", 0, "network");
  }
  const json = await res.json().catch(() => null);
  if (res.status === 401 && typeof window !== "undefined") {
    // Session expired or missing: send the user to sign in, then back here.
    const next = window.location.pathname + window.location.search;
    window.location.assign(`/login?next=${encodeURIComponent(next)}`);
  }
  if (!res.ok) {
    throw new ApiError(json?.error?.message ?? "Something went wrong. Please try again.", res.status, json?.error?.code ?? "unknown");
  }
  return json.data as T;
}

export const api = {
  startConversation: (opening?: string) => request<ConversationView>("POST", "/api/conversations", { opening }),
  latestConversation: () => request<ConversationView | null>("GET", "/api/conversations/latest"),
  sendMessage: (conversationId: string, content: string) =>
    request<ConversationView>("POST", `/api/conversations/${conversationId}/messages`, { content }),
  completeConversation: (conversationId: string) =>
    request<Path[]>("POST", `/api/conversations/${conversationId}/complete`),

  paths: () => request<PathWithStatus[]>("GET", "/api/paths"),
  path: (id: string) => request<PathDetailView>("GET", `/api/paths/${id}`),
  selectPath: (id: string) => request<PathDetailView>("POST", `/api/paths/${id}/select`),

  setTask: (id: string, completed: boolean) => request<ExperimentTask>("PATCH", `/api/tasks/${id}`, { completed }),

  dashboard: () => request<DashboardView>("GET", "/api/dashboard"),

  submitCheckIn: (input: CheckInInput) => request<DirectionUpdateView>("POST", "/api/check-ins", input),
  retryCheckInAnalysis: (id: string) => request<DirectionUpdateView>("POST", `/api/check-ins/${id}/analyze`),
  latestDirectionUpdate: () => request<DirectionUpdateView | null>("GET", "/api/direction-updates/latest"),

  track: (event: "landing_viewed" | "check_in_started") =>
    request("POST", "/api/events", { event }).catch(() => undefined),
};

export const errorMessage = (e: unknown) =>
  e instanceof ApiError ? e.message : "Something went wrong. Please try again.";
