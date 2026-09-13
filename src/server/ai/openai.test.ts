import { describe, expect, it, vi } from "vitest";
import {
  CandidatePathsSchema,
  CheckInEvidenceSchema,
  ConversationTurnSchema,
  DirectionDecisionSchema,
  PlanSchema,
  ProfileContentSchema,
} from "@/domain/schemas";
import { createOpenAIClient, toStrictJsonSchema } from "./client";
import { createMockProvider } from "./mock";
import { createOpenAIProvider, recentMessages } from "./openai";
import { PROMPTS } from "./prompts";
import { createAIService } from "./service";
import { AIError } from "./types";

const okResponse = (value: unknown) =>
  new Response(
    JSON.stringify({
      status: "completed",
      output: [
        { type: "reasoning", content: [] },
        { type: "message", content: [{ type: "output_text", text: typeof value === "string" ? value : JSON.stringify(value) }] },
      ],
    }),
    { status: 200 },
  );

function setup(fetchImpl: typeof fetch) {
  const fetchMock = vi.fn(fetchImpl);
  const client = createOpenAIClient({ apiKey: "sk-test", model: "test-model", fetch: fetchMock });
  const provider = createOpenAIProvider(client, { conversationTimeoutMs: 50, generationTimeoutMs: 50 });
  return { fetchMock, provider, ai: createAIService(provider) };
}

const turn = { reply: "Tell me more.", coverage: 0.2, ready_to_complete: false };

describe("strict JSON schemas", () => {
  const schemas = {
    ConversationTurnSchema,
    ProfileContentSchema,
    CandidatePathsSchema,
    PlanSchema,
    CheckInEvidenceSchema,
    DirectionDecisionSchema,
  };

  function assertStrict(node: unknown, path: string) {
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    // Strict decoding enforces maxLength by cutting text off mid-sentence.
    expect(obj, `${path} maxLength`).not.toHaveProperty("maxLength");
    if (obj.type === "object") {
      const keys = Object.keys((obj.properties as object) ?? {});
      expect(obj.additionalProperties, `${path} additionalProperties`).toBe(false);
      expect([...((obj.required as string[]) ?? [])].sort(), `${path} required`).toEqual(keys.sort());
    }
    for (const [key, value] of Object.entries(obj)) assertStrict(value, `${path}.${key}`);
  }

  for (const [name, schema] of Object.entries(schemas)) {
    it(`${name} is strict-mode compatible`, () => {
      const json = toStrictJsonSchema(schema);
      expect(json).not.toHaveProperty("$schema");
      expect(json.type).toBe("object");
      assertStrict(json, name);
    });
  }

  it("mock output satisfies every schema, so the two providers stay interchangeable", async () => {
    const ai = createAIService(createMockProvider({ latencyMs: 0 }));
    await expect(ai.generatePaths({ profile: await ai.generateProfile({ messages: [] }) })).resolves.toBeTruthy();
  });
});

describe("OpenAI client", () => {
  it("sends a strict structured-output request with the versioned prompt and no stored data", async () => {
    const { fetchMock, ai } = setup(async () => okResponse(turn));
    await expect(ai.conversationTurn({ messages: [{ role: "user", content: "hi" }] })).resolves.toEqual(turn);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
    const body = JSON.parse(init?.body as string);
    expect(body).toMatchObject({
      model: "test-model",
      store: false,
      instructions: PROMPTS.conversation.instructions,
      metadata: { prompt_version: PROMPTS.conversation.version },
      text: { format: { type: "json_schema", strict: true, name: "conversation_turn" } },
    });
    expect(body.input).toEqual([{ role: "user", content: "hi" }]);
  });

  it("retries once on malformed JSON, then fails recoverably", async () => {
    const { fetchMock, ai } = setup(async () => okResponse("{not json"));
    await expect(ai.conversationTurn({ messages: [] })).rejects.toBeInstanceOf(AIError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once when output fails validation and succeeds on the second attempt", async () => {
    let calls = 0;
    const { ai } = setup(async () => okResponse(calls++ === 0 ? { reply: "", coverage: 3 } : turn));
    await expect(ai.conversationTurn({ messages: [] })).resolves.toEqual(turn);
  });

  it("rejects paths output that doesn't contain exactly three directions", async () => {
    const { ai } = setup(async () => okResponse({ paths: [] }));
    await expect(ai.generatePaths({ profile: {} as never })).rejects.toBeInstanceOf(AIError);
  });

  it("does not retry a timeout", async () => {
    const { fetchMock, ai } = setup(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
        }),
    );
    await expect(ai.conversationTurn({ messages: [] })).rejects.toBeInstanceOf(AIError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries rate limits but not auth errors", async () => {
    const limited = setup(async () => new Response(JSON.stringify({ error: { code: "rate_limit" } }), { status: 429 }));
    await expect(limited.ai.conversationTurn({ messages: [] })).rejects.toBeInstanceOf(AIError);
    expect(limited.fetchMock).toHaveBeenCalledTimes(2);

    const unauthorized = setup(async () => new Response(JSON.stringify({ error: { code: "invalid_api_key" } }), { status: 401 }));
    await expect(unauthorized.ai.conversationTurn({ messages: [] })).rejects.toBeInstanceOf(AIError);
    expect(unauthorized.fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats refusals and incomplete responses as failures", async () => {
    const refusal = setup(
      async () =>
        new Response(JSON.stringify({ status: "completed", output: [{ type: "message", content: [{ type: "refusal", refusal: "no" }] }] })),
    );
    await expect(refusal.ai.conversationTurn({ messages: [] })).rejects.toBeInstanceOf(AIError);
    expect(refusal.fetchMock).toHaveBeenCalledTimes(1);

    const incomplete = setup(
      async () => new Response(JSON.stringify({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" } })),
    );
    await expect(incomplete.ai.conversationTurn({ messages: [] })).rejects.toBeInstanceOf(AIError);
  });

  it("passes only the check-in context each step needs", async () => {
    const { fetchMock, provider } = setup(async () => okResponse({}));
    await provider.analyzeCheckIn({
      profile: { summary: "s" } as never,
      path: {
        id: "path-id",
        user_id: "user-id",
        title: "T",
        category: "C",
        description: "D",
        why_it_fits: [],
        strengths: [],
        uncertainties: [],
        first_experiment: "E",
        experiment_duration: 7,
        metadata: { tags: [], path_type: "direct", success_criteria: [], thirty_day_direction: "x", signals: [], initial_exploration_level: 50 },
        conversation_id: "c",
        created_at: "",
      },
      experiment: null,
      tasks: [],
      checkIn: { energy: 5 } as never,
    });
    const input = JSON.parse(JSON.parse(fetchMock.mock.calls[0][1]?.body as string).input);
    expect(JSON.stringify(input)).not.toContain("user-id");
    expect(input.direction.title).toBe("T");
  });
});

describe("recentMessages", () => {
  it("keeps the most recent messages within the budget, in order", () => {
    const messages = [
      { role: "assistant" as const, content: "a".repeat(10) },
      { role: "user" as const, content: "b".repeat(10) },
      { role: "assistant" as const, content: "c".repeat(10) },
    ];
    expect(recentMessages(messages, 20).map((m) => m.content[0])).toEqual(["b", "c"]);
    expect(recentMessages(messages, 5)).toHaveLength(1);
  });
});
