import { cookies } from "next/headers";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createOpenAIClient } from "./ai/client";
import { createMockProvider } from "./ai/mock";
import { createOpenAIProvider } from "./ai/openai";
import { createAIService, type AIService } from "./ai/service";
import type { AIProvider } from "./ai/types";
import { AppError } from "./errors";
import { createMemoryRepository } from "./repo/memory";
import { createSupabaseRepository } from "./repo/supabase";
import type { Repository } from "./repo/types";

export interface AppContext {
  repo: Repository;
  ai: AIService;
}

export interface RequestContext {
  ctx: AppContext;
  userId: string;
}

/** Process-wide singletons. Stored on globalThis so dev hot-reloads keep them. */
const globals = globalThis as unknown as { __pathpalMemoryRepo?: Repository };

/**
 * AI_PROVIDER=openai|mock. Defaults to OpenAI when a key is present. The mock
 * is for local development and tests only and is refused in production.
 */
function createProvider(): AIProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  const choice = process.env.AI_PROVIDER ?? (apiKey ? "openai" : "mock");

  if (choice === "openai") {
    if (!apiKey) throw new Error("AI_PROVIDER=openai but OPENAI_API_KEY is not set.");
    const client = createOpenAIClient({
      apiKey,
      model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
      reasoningEffort: process.env.OPENAI_REASONING_EFFORT || undefined,
    });
    return createOpenAIProvider(client, {
      conversationTimeoutMs: Number(process.env.OPENAI_CONVERSATION_TIMEOUT_MS) || undefined,
      generationTimeoutMs: Number(process.env.OPENAI_GENERATION_TIMEOUT_MS) || undefined,
    });
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("The mock AI provider is not allowed in production. Set OPENAI_API_KEY.");
  }
  return createMockProvider({
    latencyMs: Number(process.env.MOCK_AI_LATENCY_MS ?? 900),
    failureRate: Number(process.env.MOCK_AI_FAILURE_RATE ?? 0),
  });
}

/**
 * Module-scoped on purpose, unlike the memory repo: a hot reload must pick up
 * prompt and schema changes. (A globalThis cache kept serving stale AI code.)
 */
let aiService: AIService | undefined;

function getAI(): AIService {
  aiService ??= createAIService(createProvider());
  return aiService;
}

/**
 * Resolves the authenticated user and a repository acting as them.
 * Ownership always comes from the verified session — never from the request body.
 */
export async function getRequestContext(): Promise<RequestContext> {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    // getUser() verifies the JWT with Supabase Auth (unlike getSession()).
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new AppError("unauthorized", "Please sign in to continue.");
    return { userId: data.user.id, ctx: { repo: createSupabaseRepository(supabase), ai: getAI() } };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  return { userId: await getLocalDevUserId(), ctx: { repo: (globals.__pathpalMemoryRepo ??= createMemoryRepository()), ai: getAI() } };
}

const DEV_USER_COOKIE = "pathpal_dev_uid";

/** Local development without Supabase only: an anonymous id in an httpOnly cookie. */
async function getLocalDevUserId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(DEV_USER_COOKIE)?.value;
  if (existing && z.uuid().safeParse(existing).success) return existing;
  const id = crypto.randomUUID();
  store.set(DEV_USER_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return id;
}
