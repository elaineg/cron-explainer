import { describe, it, expect } from "vitest";
import { explainCron, decodeExpressionParam, CronError } from "@/lib/cron";

const FROM = new Date("2026-06-11T12:00:00.000Z");

describe("decodeExpressionParam — permalink path segments", () => {
  it("decodes a fully percent-encoded expression exactly once", () => {
    expect(decodeExpressionParam("%2A%2F10%20%2A%20%2A%20%2A%20%2A")).toBe(
      "*/10 * * * *"
    );
  });

  it("decodes encodeURIComponent output (the format the UI links to)", () => {
    expect(decodeExpressionParam(encodeURIComponent("0 9 * * MON-FRI"))).toBe(
      "0 9 * * MON-FRI"
    );
  });

  it("is the identity on already-decoded expressions (no double decode)", () => {
    expect(decodeExpressionParam("*/10 * * * *")).toBe("*/10 * * * *");
    expect(decodeExpressionParam("banana")).toBe("banana");
  });

  it("returns malformed percent sequences unchanged instead of throwing", () => {
    expect(decodeExpressionParam("%E0%A4%A")).toBe("%E0%A4%A");
    expect(decodeExpressionParam("100%")).toBe("100%");
  });

  it("round-trips with explainCron for a valid encoded expression", () => {
    const { description } = explainCron(
      decodeExpressionParam("%40daily"),
      5,
      FROM
    );
    expect(description.toLowerCase()).toContain("midnight");
  });
});

describe("explainCron — valid expressions", () => {
  it("explains */10 * * * * as every 10 minutes with 5 runs spaced 10 min apart", () => {
    const { description, next } = explainCron("*/10 * * * *", 5, FROM);
    expect(description.toLowerCase()).toContain("every 10 minutes");
    expect(next).toHaveLength(5);
    for (let i = 1; i < next.length; i++) {
      expect(next[i].getTime() - next[i - 1].getTime()).toBe(10 * 60 * 1000);
    }
  });

  it("explains 0 9 * * MON-FRI with weekday 9:00 runs", () => {
    // explainCron defaults to UTC; check UTC hour via ISO string
    const { description, next } = explainCron("0 9 * * MON-FRI", 5, FROM, "UTC");
    expect(description).toMatch(/09:00|9:00 AM/);
    expect(description).toContain("Monday through Friday");
    expect(next).toHaveLength(5);
    for (const d of next) {
      // ISO string shows UTC time; verify it fires at 09:00 UTC on a weekday
      const iso = d.toISOString();
      expect(iso).toMatch(/T09:00:00/);
      // Day-of-week in UTC
      const dowUtc = new Date(iso).getUTCDay();
      expect(dowUtc).toBeGreaterThanOrEqual(1);
      expect(dowUtc).toBeLessThanOrEqual(5);
    }
  });

  it("explains @daily as midnight with 5 consecutive daily runs", () => {
    const { description, next } = explainCron("@daily", 5, FROM);
    expect(description.toLowerCase()).toContain("midnight");
    expect(next).toHaveLength(5);
    for (let i = 1; i < next.length; i++) {
      expect(next[i].getTime() - next[i - 1].getTime()).toBe(24 * 3600 * 1000);
    }
  });

  it("supports all documented @macros", () => {
    for (const macro of [
      "@hourly",
      "@daily",
      "@midnight",
      "@weekly",
      "@monthly",
      "@yearly",
      "@annually",
    ]) {
      const { description, next } = explainCron(macro, 5, FROM);
      expect(description.length).toBeGreaterThan(0);
      expect(next).toHaveLength(5);
    }
  });

  it("supports ranges, lists, steps and names", () => {
    for (const expr of [
      "1-5 * * * *",
      "1,15 * * * *",
      "1-30/2 * * * *",
      "0 0 1 JAN *",
      "0 0 * * MON",
      "*/15 9-17 * * MON-FRI",
    ]) {
      const { description, next } = explainCron(expr, 5, FROM);
      expect(description.length).toBeGreaterThan(0);
      expect(next).toHaveLength(5);
    }
  });

  it("preserves the original (trimmed) expression in the result", () => {
    const { expression } = explainCron("  @daily  ", 5, FROM);
    expect(expression).toBe("@daily");
  });
});

describe("explainCron — invalid expressions", () => {
  it("rejects out-of-range minute (61 * * * *)", () => {
    expect(() => explainCron("61 * * * *", 5, FROM)).toThrow(CronError);
    expect(() => explainCron("61 * * * *", 5, FROM)).toThrow(
      /Not a valid cron expression/
    );
  });

  it("rejects garbage text", () => {
    expect(() => explainCron("banana", 5, FROM)).toThrow(CronError);
    expect(() => explainCron("not a cron", 5, FROM)).toThrow(
      /Not a valid cron expression/
    );
  });

  it("rejects empty input", () => {
    expect(() => explainCron("", 5, FROM)).toThrow(CronError);
    expect(() => explainCron("   ", 5, FROM)).toThrow(CronError);
  });

  it("rejects 6-field (seconds) syntax with an explanatory error", () => {
    expect(() => explainCron("0 */10 * * * *", 5, FROM)).toThrow(
      /6-field|seconds/i
    );
  });

  it("rejects @reboot with an explanatory error, not a misparse", () => {
    expect(() => explainCron("@reboot", 5, FROM)).toThrow(/@reboot/);
  });

  it("rejects unknown @macros", () => {
    expect(() => explainCron("@fortnightly", 5, FROM)).toThrow(CronError);
  });

  it("rejects wrong field counts", () => {
    expect(() => explainCron("* * *", 5, FROM)).toThrow(/3 fields/);
    expect(() => explainCron("* * * * * * *", 5, FROM)).toThrow(CronError);
  });
});
