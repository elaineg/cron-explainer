import { describe, it, expect } from "vitest";
import { explainCron, CronError } from "@/lib/cron";

const FROM = new Date("2026-06-11T12:00:00.000Z");

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
    const { description, next } = explainCron("0 9 * * MON-FRI", 5, FROM);
    expect(description).toMatch(/09:00|9:00 AM/);
    expect(description).toContain("Monday through Friday");
    expect(next).toHaveLength(5);
    for (const d of next) {
      const dow = d.getDay(); // local time; runner local tz applies
      expect(dow).toBeGreaterThanOrEqual(1);
      expect(dow).toBeLessThanOrEqual(5);
      expect(d.getHours()).toBe(9);
      expect(d.getMinutes()).toBe(0);
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
