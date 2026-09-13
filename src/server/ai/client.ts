import { z } from "zod";
import type { Prompt } from "./prompts";
import { AIError, type ChatMessage } from "./types";

/**
 * Minimal server-side OpenAI Responses API client for structured JSON output.
 * The API key never leaves the server. Requests use `store: false` so the
 * provider doesn't retain conversations beyond what it needs to respond.
 */

export interface OpenAIClientOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  /** Optional reasoning effort for reasoning models (e.g. "low"). Omitted when unset. */
  reasoningEffort?: string;
  fetch?: typeof fetch;
}

export interface StructuredRequest {
  prompt: Prompt;
  schema: z.ZodType;
  /** A JSON context string, or a chat transcript. */
  input: string | ChatMessage[];
  timeoutMs: number;
}

interface ResponsesPayload {
  status?: string;
  incomplete_details?: { reason?: string } | null;
  error?: { code?: string; message?: string } | null;
  output?: { type: string; content?: { type: string; text?: string; refusal?: string }[] }[];
}

const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);

/** Removes `maxLength` at every level of a JSON Schema. */
function withoutMaxLength(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(withoutMaxLength);
  if (!node || typeof node !== "object") return node;
  return Object.fromEntries(
    Object.entries(node)
      .filter(([key]) => key !== "maxLength")
      .map(([key, value]) => [key, withoutMaxLength(value)]),
  );
}

/**
 * JSON Schema for strict structured outputs, derived from the same Zod schema
 * used for validation. `maxLength` is stripped: strict decoding enforces it by
 * cutting the text off mid-sentence. Length is guided by the prompts instead,
 * and Zod still enforces the (generous) safety caps afterwards.
 */
export function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _ignored, ...json } = z.toJSONSchema(schema, { io: "output", unrepresentable: "any" }) as Record<
    string,
    unknown
  >;
  return withoutMaxLength(json) as Record<string, unknown>;
}

export function createOpenAIClient({
  apiKey,
  model,
  baseUrl = "https://api.openai.com/v1",
  reasoningEffort,
  fetch: fetchImpl = fetch,
}: OpenAIClientOptions) {
  return {
    async structured({ prompt, schema, input, timeoutMs }: StructuredRequest): Promise<unknown> {
      const op = prompt.id;
      let res: Response;
      try {
        res = await fetchImpl(`${baseUrl}/responses`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
          body: JSON.stringify({
            model,
            instructions: prompt.instructions,
            input,
            store: false,
            metadata: { prompt_version: prompt.version },
            ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
            text: {
              format: { type: "json_schema", name: prompt.id, strict: true, schema: toStrictJsonSchema(schema) },
            },
          }),
        });
      } catch (error) {
        const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
        // A timeout is unlikely to succeed on an immediate retry and would double the user's wait.
        throw new AIError(timedOut ? `${op} timed out after ${timeoutMs}ms` : `${op} network error`, op, !timedOut, error);
      }

      const payload = (await res.json().catch(() => null)) as ResponsesPayload | null;
      if (!res.ok) {
        // Log-safe: status and provider error code only, never the request content.
        const code = payload?.error?.code ?? "unknown";
        throw new AIError(`${op} provider error ${res.status} (${code})`, op, RETRYABLE_STATUS.has(res.status));
      }
      if (!payload) throw new AIError(`${op} unreadable provider response`, op);

      if (payload.status === "incomplete") {
        throw new AIError(`${op} incomplete response (${payload.incomplete_details?.reason ?? "unknown"})`, op);
      }

      const parts = (payload.output ?? []).filter((item) => item.type === "message").flatMap((item) => item.content ?? []);
      if (parts.some((part) => part.type === "refusal")) {
        throw new AIError(`${op} refused`, op, false);
      }
      const text = parts.find((part) => part.type === "output_text")?.text;
      if (!text) throw new AIError(`${op} empty response`, op);

      try {
        return JSON.parse(text);
      } catch (error) {
        throw new AIError(`${op} returned malformed JSON`, op, true, error);
      }
    },
  };
}

export type OpenAIClient = ReturnType<typeof createOpenAIClient>;
