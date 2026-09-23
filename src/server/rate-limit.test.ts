import { describe, expect, it } from "vitest";
import { AppError } from "./errors";
import { createMemoryRateLimiter, enforceLimits, LIMITS, type RateLimiter } from "./rate-limit";

describe("rate limiting", () => {
  it("allows requests up to the limit, then blocks until the window rolls over", async () => {
    let now = 1_000_000;
    const limiter = createMemoryRateLimiter(() => now);

    for (let i = 0; i < 3; i++) {
      expect((await limiter.consume("b", 3, 60)).allowed, `request ${i + 1}`).toBe(true);
    }
    const blocked = await limiter.consume("b", 3, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);

    now += 60_000;
    expect((await limiter.consume("b", 3, 60)).allowed).toBe(true);
  });

  it("counts buckets separately", async () => {
    const limiter = createMemoryRateLimiter();
    expect((await limiter.consume("one", 1, 60)).allowed).toBe(true);
    expect((await limiter.consume("one", 1, 60)).allowed).toBe(false);
    expect((await limiter.consume("two", 1, 60)).allowed).toBe(true);
  });

  it("raises a user-safe 429 with a wait time once a limit is exceeded", async () => {
    const limiter = createMemoryRateLimiter();
    const spend = async () => {
      for (let i = 0; i <= LIMITS.generation.max; i++) await enforceLimits(limiter, ["generation"]);
    };
    await expect(spend()).rejects.toMatchObject({ code: "rate_limited", status: 429 });

    const error = await enforceLimits(limiter, ["generation"]).catch((e: unknown) => e as AppError);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).message).toMatch(/try again/i);
    expect((error as AppError).retryAfter).toBeGreaterThan(0);
  });

  it("charges every listed limit, so a daily cap still applies", async () => {
    const charged: string[] = [];
    const limiter: RateLimiter = {
      async consume(bucket) {
        charged.push(bucket);
        return { allowed: true, retryAfter: 0 };
      },
    };
    await enforceLimits(limiter, ["generation", "generation_daily"]);
    expect(charged).toEqual(["generation", "generation_daily"]);
  });

  it("fails open when the limiter itself errors, rather than locking users out", async () => {
    const limiter: RateLimiter = {
      consume: async () => ({ allowed: true, retryAfter: 0 }),
    };
    await expect(enforceLimits(limiter, ["conversation"])).resolves.toBeUndefined();
  });
});
