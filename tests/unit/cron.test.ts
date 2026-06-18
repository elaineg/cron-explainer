import { describe, it, expect } from "vitest";
import { explainCron, decodeExpressionParam, detectDialect, translateCron, parseYearConstraint, CronError } from "@/lib/cron";

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

  it("REGRESSION: 6-field is now VALID Quartz (not rejected) — 0 */10 * * * * is Quartz every-10-min", () => {
    // 6-field is now Quartz: sec=0, min=*/10, hour=*, dom=*, month=*, dow=*
    const { description, dialect } = explainCron("0 */10 * * * *", 5, FROM);
    expect(dialect).toBe("quartz");
    expect(description.toLowerCase()).toContain("every 10 minutes");
  });

  it("rejects @reboot with an explanatory error, not a misparse", () => {
    expect(() => explainCron("@reboot", 5, FROM)).toThrow(/@reboot/);
  });

  it("rejects unknown @macros", () => {
    expect(() => explainCron("@fortnightly", 5, FROM)).toThrow(CronError);
  });

  it("rejects wrong field counts", () => {
    expect(() => explainCron("* * *", 5, FROM)).toThrow(/3 fields/);
    // 8-field is not supported
    expect(() => explainCron("* * * * * * * *", 5, FROM)).toThrow(CronError);
    // 4-field is not supported
    expect(() => explainCron("* * * *", 5, FROM)).toThrow(/4 fields/);
  });

  it("REGRESSION: truly invalid multi-field garbage still rejected", () => {
    expect(() => explainCron("a b c d e f g h", 5, FROM)).toThrow(CronError);
  });
});

// ─── REGRESSION: 5-field byte-identical behavior ──────────────────────────────
describe("REGRESSION: 5-field Unix behavior byte-identical", () => {
  it("5-field is detected as unix", () => {
    const { dialect } = explainCron("*/15 9-17 * * MON-FRI", 5, FROM);
    expect(dialect).toBe("unix");
  });

  it("5-field explanation text identical to old behavior", () => {
    const { description } = explainCron("0 9 * * MON-FRI", 5, FROM, "UTC");
    expect(description).toMatch(/09:00|9:00 AM/);
    expect(description).toContain("Monday through Friday");
  });

  it("5-field next-5 identical spacing for */10 * * * *", () => {
    const { next } = explainCron("*/10 * * * *", 5, FROM);
    for (let i = 1; i < next.length; i++) {
      expect(next[i].getTime() - next[i - 1].getTime()).toBe(600_000);
    }
  });

  it("5-field inline error for 61 * * * * still shows 'Not a valid cron expression'", () => {
    expect(() => explainCron("61 * * * *", 5, FROM)).toThrow(/Not a valid cron expression/);
  });

  it("5-field banana still gets 'Not a valid cron expression'", () => {
    expect(() => explainCron("banana", 5, FROM)).toThrow(/Not a valid cron expression/);
  });
});

// ─── Dialect: Quartz ──────────────────────────────────────────────────────────
describe("Quartz dialect — 6-field with leading seconds", () => {
  it("detects 0 0 9 ? * MON-FRI as Quartz", () => {
    const { dialect } = detectDialect("0 0 9 ? * MON-FRI".split(/\s+/));
    expect(dialect).toBe("quartz");
  });

  it("explains 0 0 9 ? * MON-FRI as 9 AM weekdays", () => {
    const { description, dialect, next } = explainCron("0 0 9 ? * MON-FRI", 5, FROM, "UTC");
    expect(dialect).toBe("quartz");
    expect(description).toMatch(/09:00|9:00 AM/);
    expect(description).toContain("Monday through Friday");
    expect(next).toHaveLength(5);
    for (const d of next) {
      expect(d.toISOString()).toMatch(/T09:00:00/);
      const dow = d.getUTCDay();
      expect(dow).toBeGreaterThanOrEqual(1);
      expect(dow).toBeLessThanOrEqual(5);
    }
  });

  it("honors seconds field: */30 * * * * * yields next-5 runs 30s apart", () => {
    const { next, dialect } = explainCron("*/30 * * * * *", 5, FROM, "UTC");
    expect(dialect).toBe("quartz");
    expect(next).toHaveLength(5);
    for (let i = 1; i < next.length; i++) {
      expect(next[i].getTime() - next[i - 1].getTime()).toBe(30_000);
    }
  });

  it("accepts Quartz 7-field with year: 0 0 12 ? * MON 2027 — all next runs in 2027", () => {
    // FROM = 2026-06-11, so 2027 is in the future — we expect up to 5 runs, all in 2027
    const { dialect, description, next } = explainCron("0 0 12 ? * MON 2027", 5, FROM, "UTC");
    expect(dialect).toBe("quartz");
    expect(description.toLowerCase()).toMatch(/12:00|noon/i);
    // All returned runs must be in year 2027
    expect(next.length).toBeGreaterThan(0);
    for (const d of next) {
      expect(d.getUTCFullYear()).toBe(2027);
    }
  });

  it("detects 7-field as Quartz", () => {
    const { dialect } = detectDialect("0 0 12 ? * MON 2027".split(/\s+/));
    expect(dialect).toBe("quartz");
  });
});

// ─── Dialect: AWS EventBridge ─────────────────────────────────────────────────
describe("AWS EventBridge dialect", () => {
  it("detects 0 9 ? * MON-FRI * as AWS (? in dom + year-like last field)", () => {
    // AWS layout: min hour dom month dow year — '?' in dom (field[2]), last='*' (year wildcard)
    const { dialect } = detectDialect("0 9 ? * MON-FRI *".split(/\s+/));
    expect(dialect).toBe("aws");
  });

  it("detects 6-field with 4-digit year as AWS", () => {
    const { dialect } = detectDialect("0 9 ? * MON-FRI 2027".split(/\s+/));
    expect(dialect).toBe("aws");
  });

  it("explains AWS 6-field with year 2027 forced as AWS dialect", () => {
    const { dialect, description, next } = explainCron("0 9 ? * MON-FRI 2027", 5, FROM, "UTC", "aws");
    expect(dialect).toBe("aws");
    expect(description).toMatch(/09:00|9:00 AM/);
    expect(next).toHaveLength(5);
  });

  it("accepts cron() wrapper as AWS", () => {
    const { dialect, description } = explainCron("cron(0 10 * * ? *)", 5, FROM, "UTC", "auto");
    expect(dialect).toBe("aws");
    expect(description).toMatch(/10:00|10:00 AM/);
  });

  it("explains 0 9 ? * MON-FRI * forced as AWS: weekday 9am", () => {
    const { dialect, description, next } = explainCron("0 9 ? * MON-FRI *", 5, FROM, "UTC", "aws");
    expect(dialect).toBe("aws");
    expect(description).toMatch(/09:00|9:00 AM/);
    expect(next).toHaveLength(5);
    for (const d of next) {
      expect(d.toISOString()).toMatch(/T09:00:00/);
    }
  });
});

// ─── Dialect: auto-detect + manual override ───────────────────────────────────
describe("Auto-detect and manual dialect override", () => {
  it("ambiguous 6-field without year defaults to Quartz", () => {
    const { dialect } = explainCron("0 0 9 * * MON-FRI", 5, FROM, "UTC");
    expect(dialect).toBe("quartz");
  });

  it("can force unix on a 5-field expression", () => {
    const { dialect } = explainCron("0 9 * * MON-FRI", 5, FROM, "UTC", "unix");
    expect(dialect).toBe("unix");
  });

  it("can force quartz on a 6-field expression", () => {
    const { dialect } = explainCron("0 0 9 ? * MON-FRI", 5, FROM, "UTC", "quartz");
    expect(dialect).toBe("quartz");
  });

  it("can force aws on a 6-field expression with year", () => {
    const { dialect } = explainCron("0 9 ? * MON-FRI *", 5, FROM, "UTC", "aws");
    expect(dialect).toBe("aws");
  });
});

// ─── Translate ────────────────────────────────────────────────────────────────
describe("translateCron — Unix → Quartz", () => {
  it("translates 0 9 * * 1-5 to Quartz 0 0 9 ? * MON-FRI", () => {
    const { expression, warning } = translateCron("0 9 * * 1-5", "unix", "quartz");
    expect(warning).toBeNull();
    expect(expression).not.toBeNull();
    // The translated expression should explain as weekday 9am in Quartz
    const { description, dialect } = explainCron(expression!, 5, FROM, "UTC", "quartz");
    expect(dialect).toBe("quartz");
    expect(description).toMatch(/09:00|9:00 AM/);
    expect(description).toContain("Monday through Friday");
  });

  it("translates 0 9 * * MON-FRI to Quartz", () => {
    const { expression, warning } = translateCron("0 9 * * MON-FRI", "unix", "quartz");
    expect(warning).toBeNull();
    expect(expression).toBeTruthy();
  });
});

describe("translateCron — Unix → AWS", () => {
  it("translates 0 9 * * 1-5 to AWS 6-field", () => {
    const { expression, warning } = translateCron("0 9 * * 1-5", "unix", "aws");
    expect(warning).toBeNull();
    expect(expression).not.toBeNull();
    const fields = expression!.split(/\s+/);
    expect(fields).toHaveLength(6); // AWS has year field
  });
});

describe("translateCron — Quartz → Unix", () => {
  it("can't translate sub-minute seconds to Unix", () => {
    const { expression, warning } = translateCron("*/30 * * * * *", "quartz", "unix");
    expect(expression).toBeNull();
    expect(warning).toMatch(/sub-minute|seconds/i);
  });

  it("translates 0 0 9 ? * MON-FRI to Unix 5-field", () => {
    const { expression, warning } = translateCron("0 0 9 ? * MON-FRI", "quartz", "unix");
    expect(warning).toBeNull();
    expect(expression).not.toBeNull();
    const { description } = explainCron(expression!, 5, FROM, "UTC", "unix");
    expect(description).toMatch(/09:00|9:00 AM/);
    expect(description).toContain("Monday through Friday");
  });

  it("can't translate L/W/# tokens to Unix", () => {
    const { expression, warning } = translateCron("0 0 9 L * ?", "quartz", "unix");
    expect(expression).toBeNull();
    expect(warning).toMatch(/L.*W.*#|can't be represented/i);
  });
});

describe("translateCron — Quartz → AWS", () => {
  it("translates 0 0 9 ? * MON-FRI to AWS", () => {
    const { expression, warning } = translateCron("0 0 9 ? * MON-FRI", "quartz", "aws");
    expect(warning).toBeNull();
    expect(expression).not.toBeNull();
  });

  it("can't translate sub-minute seconds to AWS", () => {
    const { expression, warning } = translateCron("*/30 * * * * *", "quartz", "aws");
    expect(expression).toBeNull();
    expect(warning).toMatch(/sub-minute|seconds/i);
  });
});

describe("translateCron — AWS → Unix", () => {
  it("translates 0 9 ? * MON-FRI * to Unix", () => {
    const { expression, warning } = translateCron("0 9 ? * MON-FRI *", "aws", "unix");
    expect(warning).toBeNull();
    expect(expression).not.toBeNull();
    const { description } = explainCron(expression!, 5, FROM, "UTC", "unix");
    expect(description).toMatch(/09:00|9:00 AM/);
  });
});

describe("translateCron — AWS → Quartz", () => {
  it("translates 0 9 ? * MON-FRI * to Quartz", () => {
    const { expression, warning } = translateCron("0 9 ? * MON-FRI *", "aws", "quartz");
    expect(warning).toBeNull();
    expect(expression).not.toBeNull();
    const { description, dialect } = explainCron(expression!, 5, FROM, "UTC", "quartz");
    expect(dialect).toBe("quartz");
    expect(description).toMatch(/09:00|9:00 AM/);
  });
});

// ─── P0 FIX REGRESSION TESTS ──────────────────────────────────────────────────
// These tests guard against the two P0 bugs found in validation:
//   P0-1: 0 9 ? * MON-FRI * auto-detects as Quartz (wrong) instead of AWS
//   P0-2: Year field ignored in next-run computation

describe("parseYearConstraint", () => {
  it("returns null for wildcard *", () => {
    expect(parseYearConstraint("*")).toBeNull();
  });

  it("returns null for wildcard ?", () => {
    expect(parseYearConstraint("?")).toBeNull();
  });

  it("parses single year", () => {
    expect(parseYearConstraint("2027")).toEqual([2027]);
  });

  it("parses comma-separated years", () => {
    expect(parseYearConstraint("2027,2028")).toEqual([2027, 2028]);
  });

  it("parses year range", () => {
    expect(parseYearConstraint("2027-2030")).toEqual([2027, 2028, 2029, 2030]);
  });
});

describe("P0-1 — AWS auto-detect for 0 9 ? * MON-FRI *", () => {
  it("detectDialect: 0 9 ? * MON-FRI * → aws", () => {
    expect(detectDialect("0 9 ? * MON-FRI *".split(/\s+/)).dialect).toBe("aws");
  });

  it("detectDialect: 0 0 9 ? * MON-FRI → quartz (last=DOW token)", () => {
    expect(detectDialect("0 0 9 ? * MON-FRI".split(/\s+/)).dialect).toBe("quartz");
  });

  it("detectDialect: */30 * * * * * → quartz (no ? anywhere)", () => {
    expect(detectDialect("*/30 * * * * *".split(/\s+/)).dialect).toBe("quartz");
  });

  it("detectDialect: generic no-? 6-field → quartz (default)", () => {
    expect(detectDialect("0 0 9 * * MON-FRI".split(/\s+/)).dialect).toBe("quartz");
  });

  it("0 9 ? * MON-FRI * auto-detect → AWS, next runs at weekday 09:00", () => {
    const { dialect, description, next } = explainCron("0 9 ? * MON-FRI *", 5, FROM, "UTC");
    expect(dialect).toBe("aws");
    expect(description).toMatch(/09:00|9:00 AM/);
    expect(next).toHaveLength(5);
    for (const d of next) {
      // Must fire at 09:00 UTC
      expect(d.toISOString()).toMatch(/T09:00:00/);
      // Must be a weekday (Mon=1 … Fri=5)
      const dow = d.getUTCDay();
      expect(dow).toBeGreaterThanOrEqual(1);
      expect(dow).toBeLessThanOrEqual(5);
    }
  });

  it("description and run-times agree: not hourly, not 12:09 AM", () => {
    const { description, next } = explainCron("0 9 ? * MON-FRI *", 5, FROM, "UTC");
    // Description must mention hour 9
    expect(description).toMatch(/9:00|09:00/);
    // All runs must be at hour 9 UTC (not the wrong Quartz-parsed 00:09)
    for (const d of next) {
      expect(d.getUTCHours()).toBe(9);
      expect(d.getUTCMinutes()).toBe(0);
    }
  });
});

// Use a far-future year so these tests are time-invariant (won't expire before 2090).
const FUTURE_FROM = new Date("2026-01-01T00:00:00.000Z");

describe("P0-2 — Year field honored in next-run computation", () => {
  it("Quartz 7-field 0 0 12 ? * MON 2090 — all next runs in 2090", () => {
    const { next, yearNote } = explainCron("0 0 12 ? * MON 2090", 5, FUTURE_FROM, "UTC");
    expect(yearNote).toBeUndefined();
    expect(next.length).toBeGreaterThan(0);
    for (const d of next) {
      expect(d.getUTCFullYear()).toBe(2090);
      expect(d.getUTCHours()).toBe(12);
      expect(d.getUTCMinutes()).toBe(0);
      // Monday
      expect(d.getUTCDay()).toBe(1);
    }
  });

  it("Quartz 7-field 0 0 12 1 1 ? 2088 — all next runs in Jan 1 2088 at 12:00 UTC", () => {
    const { next, yearNote } = explainCron("0 0 12 1 1 ? 2088", 5, FUTURE_FROM, "UTC");
    expect(yearNote).toBeUndefined();
    // Jan 1 2088 at 12:00 — only 1 occurrence per year, so max 1 result for a single year
    expect(next.length).toBeGreaterThan(0);
    for (const d of next) {
      expect(d.getUTCFullYear()).toBe(2088);
      expect(d.getUTCMonth()).toBe(0); // January
      expect(d.getUTCDate()).toBe(1);
      expect(d.getUTCHours()).toBe(12);
    }
  });

  it("Past year → yearNote set, next is empty", () => {
    const { next, yearNote } = explainCron("0 0 12 ? * MON 2020", 5, FUTURE_FROM, "UTC");
    expect(next).toHaveLength(0);
    expect(yearNote).toMatch(/2020/);
    expect(yearNote).toMatch(/past/i);
  });

  it("AWS 6-field with concrete year 2091: all runs in 2091", () => {
    // AWS: min=0 hour=9 dom=? month=* dow=MON-FRI year=2091
    const { next, yearNote } = explainCron("0 9 ? * MON-FRI 2091", 5, FUTURE_FROM, "UTC", "aws");
    expect(yearNote).toBeUndefined();
    expect(next.length).toBeGreaterThan(0);
    for (const d of next) {
      expect(d.getUTCFullYear()).toBe(2091);
      expect(d.getUTCHours()).toBe(9);
    }
  });
});

// ─── BLOCKER 2 — 6-field Quartz `?` in dow (last field) must NOT be AWS ──────
describe("BLOCKER-2 regression: 6-field Quartz with trailing ? correctly classified", () => {
  it("detectDialect: 0 0 12 * * ? → quartz (? at index 5=last, not an AWS day position)", () => {
    // 0=sec 1=min 2=hour 3=dom 4=month 5=dow(?)
    // '?' is only at index 5 (the last/dow field in Quartz layout), NOT at index 2 or 4
    // which are the AWS day positions. Must be Quartz.
    expect(detectDialect("0 0 12 * * ?".split(/\s+/)).dialect).toBe("quartz");
  });

  it("0 0 12 * * ? auto-detect → quartz, not aws (noon description, not 12:00 AM day 12)", () => {
    const { dialect, description } = explainCron("0 0 12 * * ?", 5, FROM, "UTC", "auto");
    expect(dialect).toBe("quartz");
    // cronstrue for Quartz "0 0 12 * * ?" → noon description, NOT "12:00 AM, on day 12"
    expect(description).toMatch(/12:00 PM|noon/i);
    expect(description).not.toMatch(/day 12/i);
  });

  it("detectDialect: 0 9 ? * MON-FRI * still → aws (? at index 2=dom, last=* year-like)", () => {
    // AWS: min(0)=0 hour(1)=9 dom(2)=? month(3)=* dow(4)=MON-FRI year(5)=*
    // '?' at index 2 = AWS dom position → AWS
    expect(detectDialect("0 9 ? * MON-FRI *".split(/\s+/)).dialect).toBe("aws");
  });

  it("detectDialect: 0 0 9 ? * MON-FRI still → quartz (last=MON-FRI is DOW token)", () => {
    // Quartz: sec(0)=0 min(1)=0 hour(2)=9 dom(3)=? month(4)=* dow(5)=MON-FRI
    // '?' at index 3=dom, but last field is a DOW token → Quartz
    expect(detectDialect("0 0 9 ? * MON-FRI".split(/\s+/)).dialect).toBe("quartz");
  });

  it("detectDialect: */30 * * * * * → quartz (no ?)", () => {
    expect(detectDialect("*/30 * * * * *".split(/\s+/)).dialect).toBe("quartz");
  });
});

// ─── BLOCKER 1 — UTC/Local toggle: same instants, different display TZs ──────
// The UI always evaluates in local TZ. The regression here tests the library level:
// for a given cron + a fixed eval-tz, the UTC instant should be stable, and
// displaying it in two different tz should produce times that differ by the offset.
describe("BLOCKER-1 regression: UTC/Local toggle produces same instants displayed in two zones", () => {
  // Use America/New_York (UTC-4 in summer) as the eval timezone.
  // cron "0 6 * * *" evaluated in America/New_York → instants at 10:00:00Z.
  it("0 6 * * * in America/New_York: instants are at 10:00Z (UTC offset by +4)", () => {
    // FROM is 2026-06-11T12:00:00Z, well into the day, next 6 AM NY is next day
    const { next } = explainCron("0 6 * * *", 5, FROM, "America/New_York", "auto");
    for (const d of next) {
      // 06:00 EDT = 10:00 UTC
      expect(d.toISOString()).toMatch(/T10:00:00/);
    }
  });

  it("same instants displayed in UTC show T10:00Z; displayed in NY show 06:00 AM", () => {
    const { next } = explainCron("0 6 * * *", 5, FROM, "America/New_York", "auto");
    // The instants are Date objects (UTC internally). Display in UTC:
    const utcDisplay = next[0].toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
    // Display in NY:
    const nyDisplay = next[0].toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/New_York" });
    // UTC view: 10:00, NY view: 06:00
    expect(utcDisplay).toMatch(/10:00/);
    expect(nyDisplay).toMatch(/06:00/);
    // They differ by exactly 4 hours (UTC-4 in summer)
    expect(next[0].getUTCHours()).toBe(10);
  });

  it("toggling display timezone does NOT change the underlying UTC instant (time-invariant, anchored to FROM)", () => {
    // Evaluate in UTC (as API default does)
    const { next: utcNext } = explainCron("0 6 * * *", 5, FROM, "UTC", "auto");
    // Evaluate in America/New_York
    const { next: nyNext } = explainCron("0 6 * * *", 5, FROM, "America/New_York", "auto");
    // UTC eval: instants at 06:00Z. NY eval: instants at 10:00Z. They are DIFFERENT instants.
    // This confirms that the tz parameter controls EVALUATION, not just display.
    // The UI fix ensures EVALUATION always uses local TZ; only formatAbsolute's tz changes.
    expect(utcNext[0].getUTCHours()).toBe(6);
    expect(nyNext[0].getUTCHours()).toBe(10);
    // Diff between same-day next-run times = 4 hours = 14400000ms
    expect(nyNext[0].getTime() - utcNext[0].getTime()).toBe(4 * 3600 * 1000);
  });
});

// ─── TIMEZONE: source vs display — DST correctness ───────────────────────────
describe("TIMEZONE: source tz DST correctness", () => {
  // America/New_York spring-forward 2026: DST begins 2026-03-08 at 02:00 AM
  // Before: UTC-5 (EST). After: UTC-4 (EDT).
  // "0 2 * * *" evaluated in America/New_York:
  //   On 2026-03-07 (day before spring-forward): 02:00 EST = 07:00 UTC
  //   On 2026-03-08 (spring-forward day):        02:00 AM is SKIPPED
  //     cron-parser advances to the next valid occurrence (03:00 EDT = 07:00 UTC)
  //   After: 02:00 EDT = 06:00 UTC
  //
  // We use a FROM just before the spring-forward to capture the transition.
  const SPRING_FROM = new Date("2026-03-07T10:00:00.000Z"); // after 02:00 EST on Mar 7

  it("0 2 * * * in America/New_York: instants around spring-forward have sane UTC offsets", () => {
    const { next } = explainCron("0 2 * * *", 10, SPRING_FROM, "America/New_York");
    expect(next.length).toBeGreaterThan(0);
    // All next-run instants must be at a valid UTC hour (06:00 or 07:00 UTC for 2:00 AM NY)
    // 07:00Z = 02:00 EST (before DST), 06:00Z = 02:00 EDT (after DST)
    // The spring-forward day (Mar 8) has NO 2:00 AM, so cron-parser either skips it
    // or produces 03:00 AM EDT = 07:00Z on that day.
    for (const d of next) {
      const utcHour = d.getUTCHours();
      // UTC hours must be 6 or 7 (the two valid representations of "2 AM NY" around DST)
      expect([6, 7]).toContain(utcHour);
      // Minutes and seconds must be 0
      expect(d.getUTCMinutes()).toBe(0);
      expect(d.getUTCSeconds()).toBe(0);
    }
  });

  it("0 2 * * * in America/New_York: none of the instants have a non-zero minute or second", () => {
    const { next } = explainCron("0 2 * * *", 10, SPRING_FROM, "America/New_York");
    for (const d of next) {
      expect(d.getUTCMinutes()).toBe(0);
      expect(d.getUTCSeconds()).toBe(0);
    }
  });

  it("source=UTC vs source=America/New_York produce DIFFERENT instants for 0 9 * * *", () => {
    const FROM_REF = new Date("2026-06-11T12:00:00.000Z");
    const { next: utcNext } = explainCron("0 9 * * *", 1, FROM_REF, "UTC");
    const { next: nyNext } = explainCron("0 9 * * *", 1, FROM_REF, "America/New_York");
    // 9:00 UTC = 09:00Z; 9:00 EDT = 13:00Z — they must differ
    expect(utcNext[0].getTime()).not.toBe(nyNext[0].getTime());
    // UTC next is at 09:00Z, NY is at 13:00Z (UTC-4 in summer)
    expect(utcNext[0].getUTCHours()).toBe(9);
    expect(nyNext[0].getUTCHours()).toBe(13);
  });

  it("display tz does not affect the UTC instant — same source, different display produces same ISO", () => {
    const FROM_REF = new Date("2026-06-11T12:00:00.000Z");
    const evalTz = "America/New_York";
    const { next: next1 } = explainCron("0 9 * * *", 1, FROM_REF, evalTz);
    // Display is just toLocaleString — same Date object regardless of how it's shown
    // Re-running with same tz confirms stable result
    const { next: next2 } = explainCron("0 9 * * *", 1, FROM_REF, evalTz);
    expect(next1[0].toISOString()).toBe(next2[0].toISOString());
    // Display in Tokyo (UTC+9) shows 22:00 the SAME day, UTC shows 13:00
    const tokyoDisplay = next1[0].toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Tokyo",
    });
    const utcDisplay = next1[0].toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
    expect(utcDisplay).toMatch(/13:00/);
    expect(tokyoDisplay).toMatch(/22:00/);
  });
});
