import { describe, expect, it } from "vitest";
import { daysRemaining, nextExplorationLevel, taskProgress } from "./rules";

describe("rules", () => {
  it("bounds exploration level changes regardless of AI suggestion", () => {
    expect(nextExplorationLevel(64, 30)).toBe(79);
    expect(nextExplorationLevel(64, -30)).toBe(49);
    expect(nextExplorationLevel(92, 10)).toBe(95);
    expect(nextExplorationLevel(8, -10)).toBe(5);
  });

  it("computes task progress", () => {
    expect(taskProgress([])).toBe(0);
    expect(taskProgress([{ completed: true }, { completed: false }, { completed: false }])).toBe(33);
  });

  it("computes days remaining", () => {
    const start = "2026-01-01T00:00:00.000Z";
    expect(daysRemaining(start, 7, new Date("2026-01-03T00:00:00.000Z"))).toBe(5);
    expect(daysRemaining(start, 7, new Date("2026-02-01T00:00:00.000Z"))).toBe(0);
  });
});
