/**
 * Unit tests: crontab-file engine-reuse parity + real computed semantics.
 *
 * These tests assert ACTUAL computed next-run instants (not just description strings)
 * for expressions extracted via classifyCrontab. They prove the same explainCron
 * engine is used in file-mode as in single-mode, and that the line classifier
 * extracts job expressions faithfully for all documented edge formats.
 *
 * Coverage gaps addressed (per verifier task):
 *   - Real next-run instants for file-mode job expressions (time-invariant checks)
 *   - minute 61 out-of-range rejected as INVALID (not silently explained)
 *   - @daily / @weekly macros produce correct semantics
 *   - CRLF line endings in full crontab text
 *   - Trailing newline doesn't introduce spurious blank/extra row
 *   - Leading-whitespace job line: expr extracted correctly
 *   - env value containing '=' is correctly split on FIRST '='
 *   - Engine reuse: classifyCrontab jobExpr → explainCron == direct explainCron call
 */

import { describe, it, expect } from "vitest";
import { classifyLine, classifyCrontab, SAMPLE_CRONTAB } from "@/app/crontab-file-mode";
import { explainCron, CronError } from "@/lib/cron";

// Fixed reference point for time-invariant assertions.
const FROM = new Date("2026-06-11T12:00:00.000Z");

// ─── Engine reuse: expressions extracted from file mode → explainCron ──────────

describe("Engine reuse — jobExpr extracted by classifyCrontab feeds explainCron identically", () => {
  it("0 2 * * * /backup.sh: jobExpr=0 2 * * *, next-5 at 02:00 UTC", () => {
    const row = classifyLine("0 2 * * * /usr/local/bin/backup.sh");
    expect(row.kind).toBe("job");
    expect(row.jobExpr).toBe("0 2 * * *");

    // Verify SAME result as calling explainCron("0 2 * * *") directly
    const direct = explainCron("0 2 * * *", 5, FROM, "UTC");
    const fromFile = explainCron(row.jobExpr!, 5, FROM, "UTC");

    expect(fromFile.description).toBe(direct.description);
    expect(fromFile.next).toHaveLength(5);
    // All next runs must be at 02:00 UTC (time-invariant property)
    for (const d of fromFile.next) {
      expect(d.getUTCHours()).toBe(2);
      expect(d.getUTCMinutes()).toBe(0);
      expect(d.getUTCSeconds()).toBe(0);
    }
    // Consecutive runs are exactly 24 hours apart
    for (let i = 1; i < fromFile.next.length; i++) {
      expect(fromFile.next[i].getTime() - fromFile.next[i - 1].getTime()).toBe(24 * 3600 * 1000);
    }
  });

  it("*/15 9-17 * * MON-FRI /poll.sh: jobExpr fires every 15 min on weekday business hours", () => {
    const row = classifyLine("*/15 9-17 * * MON-FRI /usr/local/bin/poll.sh");
    expect(row.kind).toBe("job");
    expect(row.jobExpr).toMatch(/^\*\/15 9-17 \* \* MON-FRI$/);

    const result = explainCron(row.jobExpr!, 5, FROM, "UTC");
    expect(result.description).toMatch(/Monday through Friday/i);
    expect(result.description).toMatch(/every 15 minutes/i);
    expect(result.next).toHaveLength(5);

    // Verify parity with direct call
    const direct = explainCron("*/15 9-17 * * MON-FRI", 5, FROM, "UTC");
    expect(result.description).toBe(direct.description);
    for (let i = 0; i < result.next.length; i++) {
      expect(result.next[i].getTime()).toBe(direct.next[i].getTime());
    }
  });

  it("@daily /rotate-logs.sh: jobExpr=@daily, next-5 at midnight UTC", () => {
    const row = classifyLine("@daily /usr/local/bin/rotate-logs.sh");
    expect(row.kind).toBe("job");
    expect(row.jobExpr).toBe("@daily");

    const result = explainCron(row.jobExpr!, 5, FROM, "UTC");
    expect(result.description.toLowerCase()).toContain("midnight");
    expect(result.next).toHaveLength(5);
    // All at midnight UTC
    for (const d of result.next) {
      expect(d.getUTCHours()).toBe(0);
      expect(d.getUTCMinutes()).toBe(0);
    }
    // Exactly 24 hours apart
    for (let i = 1; i < result.next.length; i++) {
      expect(result.next[i].getTime() - result.next[i - 1].getTime()).toBe(24 * 3600 * 1000);
    }
  });

  it("@weekly /run.sh: jobExpr=@weekly, next-5 runs 7 days apart", () => {
    const row = classifyLine("@weekly /run.sh");
    expect(row.kind).toBe("job");
    expect(row.jobExpr).toBe("@weekly");

    const result = explainCron(row.jobExpr!, 5, FROM, "UTC");
    expect(result.next).toHaveLength(5);
    // Weekly spacing: exactly 7 days apart
    for (let i = 1; i < result.next.length; i++) {
      expect(result.next[i].getTime() - result.next[i - 1].getTime()).toBe(7 * 24 * 3600 * 1000);
    }
  });

  it("0 9 1 * * /send-invoices.sh: fires on day 1 of month at 09:00 UTC", () => {
    const row = classifyLine("0 9 1 * * /usr/local/bin/send-invoices.sh");
    expect(row.kind).toBe("job");
    expect(row.jobExpr).toBe("0 9 1 * *");

    const result = explainCron(row.jobExpr!, 5, FROM, "UTC");
    expect(result.next).toHaveLength(5);
    for (const d of result.next) {
      expect(d.getUTCDate()).toBe(1);
      expect(d.getUTCHours()).toBe(9);
      expect(d.getUTCMinutes()).toBe(0);
    }
  });
});

// ─── INVALID: minute 61 out-of-range is REJECTED, not silently explained ──────

describe("INVALID job detection via explainCron — out-of-range fields throw CronError", () => {
  it("61 * * * * /broken.sh: classifyLine=job, but explainCron throws CronError", () => {
    const row = classifyLine("61 * * * * /usr/local/bin/broken.sh");
    expect(row.kind).toBe("job");
    expect(row.jobExpr).toBe("61 * * * *");

    // The line classifier marks it as 'job'; the runtime rejects it as INVALID
    expect(() => explainCron(row.jobExpr!, 5, FROM)).toThrow(CronError);
    expect(() => explainCron(row.jobExpr!, 5, FROM)).toThrow(
      /Not a valid cron expression/
    );
  });

  it("hour 25 out-of-range also throws CronError", () => {
    const row = classifyLine("0 25 * * * /cmd");
    expect(row.kind).toBe("job");
    expect(row.jobExpr).toBe("0 25 * * *");
    expect(() => explainCron(row.jobExpr!, 5, FROM)).toThrow(CronError);
  });

  it("day-of-month 32 out-of-range also throws CronError", () => {
    const row = classifyLine("0 0 32 * * /cmd");
    expect(row.kind).toBe("job");
    expect(row.jobExpr).toBe("0 0 32 * *");
    expect(() => explainCron(row.jobExpr!, 5, FROM)).toThrow(CronError);
  });
});

// ─── Format variety: edge cases the spec promises ──────────────────────────────

describe("Format variety — all documented input forms", () => {
  it("step syntax */15 extracts correctly", () => {
    const r = classifyLine("*/15 * * * * /cmd");
    expect(r.kind).toBe("job");
    expect(r.jobExpr).toBe("*/15 * * * *");
    const { next } = explainCron(r.jobExpr!, 5, FROM, "UTC");
    // Every 15 minutes → consecutive runs are 15 min = 900s apart
    for (let i = 1; i < next.length; i++) {
      expect(next[i].getTime() - next[i - 1].getTime()).toBe(15 * 60 * 1000);
    }
  });

  it("range MON-FRI in dow field is handled by explainCron from file-mode expr", () => {
    const r = classifyLine("0 9 * * MON-FRI /cmd");
    expect(r.kind).toBe("job");
    const { next } = explainCron(r.jobExpr!, 5, FROM, "UTC");
    // All next runs must be weekdays (Mon=1..Fri=5 in UTC)
    for (const d of next) {
      const dow = d.getUTCDay();
      expect(dow).toBeGreaterThanOrEqual(1);
      expect(dow).toBeLessThanOrEqual(5);
    }
  });

  it("leading whitespace on a job line: expr extracted correctly", () => {
    const r = classifyLine("  0 9 * * * /cmd");
    expect(r.kind).toBe("job");
    expect(r.jobExpr).toBe("0 9 * * *");
    // Verify it's explainable
    const { next } = explainCron(r.jobExpr!, 5, FROM, "UTC");
    expect(next).toHaveLength(5);
  });

  it("env value containing '=': split on FIRST '=' only", () => {
    const r = classifyLine("TOKEN=abc=def=ghi");
    expect(r.kind).toBe("env");
    expect(r.envKey).toBe("TOKEN");
    expect(r.envValue).toBe("abc=def=ghi");
  });
});

// ─── CRLF + trailing newline full-crontab edge cases ──────────────────────────

describe("classifyCrontab — CRLF and trailing newline edge cases", () => {
  it("CRLF line endings (Windows) parsed identically to LF", () => {
    const lfText = "# comment\nMAILTO=x\n0 9 * * * /cmd\n";
    const crlfText = "# comment\r\nMAILTO=x\r\n0 9 * * * /cmd\r\n";

    const lfRows = classifyCrontab(lfText);
    const crlfRows = classifyCrontab(crlfText);

    // Both should yield same kinds (trailing newline → blank at end, same for both)
    expect(crlfRows.map((r) => r.kind)).toEqual(lfRows.map((r) => r.kind));
    // comment row
    expect(crlfRows[0].kind).toBe("comment");
    // env row
    expect(crlfRows[1].kind).toBe("env");
    expect(crlfRows[1].envKey).toBe("MAILTO");
    // job row
    expect(crlfRows[2].kind).toBe("job");
    expect(crlfRows[2].jobExpr).toBe("0 9 * * *");
  });

  it("trailing newline produces a blank entry at the end (not undefined)", () => {
    const text = "0 9 * * * /cmd\n";
    const rows = classifyCrontab(text);
    // "0 9 * * * /cmd\n".split("\n") → ["0 9 * * * /cmd", ""]
    expect(rows).toHaveLength(2);
    expect(rows[0].kind).toBe("job");
    expect(rows[1].kind).toBe("blank");
  });

  it("no trailing newline: single line produces single row", () => {
    const text = "0 9 * * * /cmd";
    const rows = classifyCrontab(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("job");
  });

  it("multiple blank lines collapse to multiple blank rows (order preserved)", () => {
    const text = "# a\n\n\n0 9 * * * /cmd\n";
    const rows = classifyCrontab(text);
    expect(rows[0].kind).toBe("comment");
    expect(rows[1].kind).toBe("blank");
    expect(rows[2].kind).toBe("blank");
    expect(rows[3].kind).toBe("job");
    expect(rows[4].kind).toBe("blank"); // trailing newline
  });
});

// ─── Sample crontab counts (spec asserts exact values) ─────────────────────────

describe("SAMPLE_CRONTAB — spec-exact summary counts", () => {
  it("sample has 8 rows (comment, env, 4 job lines, blank, invalid — in file order)", () => {
    // SAMPLE_CRONTAB has no trailing newline, so split on \n gives exactly 8 tokens
    const rows = classifyCrontab(SAMPLE_CRONTAB);
    expect(rows).toHaveLength(8);
  });

  it("resolved counts: 4 valid jobs, 1 env, 1 comment, 1 blank, 1 invalid", () => {
    const rows = classifyCrontab(SAMPLE_CRONTAB);

    // Simulate what the UI component does: try explainCron on each 'job' row
    let validJobs = 0;
    let invalidJobs = 0;
    let envs = 0;
    let comments = 0;
    let blanks = 0;

    for (const row of rows) {
      if (row.kind === "blank") {
        blanks++;
      } else if (row.kind === "comment") {
        comments++;
      } else if (row.kind === "env") {
        envs++;
      } else if (row.kind === "job") {
        try {
          explainCron(row.jobExpr!, 5, FROM);
          validJobs++;
        } catch {
          invalidJobs++;
        }
      }
    }

    // Spec: "4 jobs · 1 environment variable · 1 comment · 1 invalid line"
    expect(validJobs).toBe(4);
    expect(envs).toBe(1);
    expect(comments).toBe(1);
    expect(invalidJobs).toBe(1);
    // Blank is present but not in the summary label
    expect(blanks).toBe(1);
  });

  it("the 4 valid jobs are: 0 2 * * *, */15 9-17 * * MON-FRI, @daily, 0 9 1 * *", () => {
    const rows = classifyCrontab(SAMPLE_CRONTAB);
    const validExprs: string[] = [];

    for (const row of rows) {
      if (row.kind === "job") {
        try {
          explainCron(row.jobExpr!, 5, FROM);
          validExprs.push(row.jobExpr!);
        } catch {
          // skip invalid
        }
      }
    }

    expect(validExprs).toContain("0 2 * * *");
    expect(validExprs).toContain("*/15 9-17 * * MON-FRI");
    expect(validExprs).toContain("@daily");
    expect(validExprs).toContain("0 9 1 * *");
  });
});
