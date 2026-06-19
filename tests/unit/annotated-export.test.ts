/**
 * Unit tests for buildAnnotatedExport() — the paste-ready annotated crontab export.
 *
 * Coverage:
 *   - Job lines get a following `# →` annotation comment with description + next run
 *   - Blank/comment/env/invalid lines pass through unchanged (no annotation appended)
 *   - Line order is preserved exactly
 *   - No word-run-together in the annotation (explicit separator between description and next-run)
 *   - Invalid job lines produce no annotation (silently skipped)
 *   - Full sample crontab produces correct structure
 */

import { describe, it, expect } from "vitest";
import { buildAnnotatedExport, SAMPLE_CRONTAB } from "@/app/crontab-file-mode";

// Fixed reference: UTC means times are deterministic regardless of test runner tz
const EVAL_TZ = "UTC";
const DISPLAY_TZ = "UTC";

// We cannot assert exact dates (they vary with NOW), but we CAN assert:
// 1. annotation lines start with "# → "
// 2. annotation lines contain "(next: " and ")"
// 3. no two words are run together (check for a space before "(" )
// 4. original lines are preserved verbatim
// 5. annotations follow their job line immediately (no blank between them)
// 6. blank/comment/env/invalid lines have NO following annotation

describe("buildAnnotatedExport — line ordering + passthrough", () => {
  it("preserves the original lines in order", () => {
    const text = "# comment\nMAILTO=ops@example.com\n0 2 * * * /backup.sh\n";
    const output = buildAnnotatedExport(text, EVAL_TZ, DISPLAY_TZ);
    const lines = output.split("\n");

    expect(lines[0]).toBe("# comment");
    expect(lines[1]).toBe("MAILTO=ops@example.com");
    expect(lines[2]).toBe("0 2 * * * /backup.sh");
    // Line 3 is the annotation for the job line
    expect(lines[3]).toMatch(/^# → /);
    // Line 4 is the trailing blank from the final "\n"
    expect(lines[4]).toBe("");
  });

  it("blank lines pass through unchanged — no annotation appended", () => {
    const text = "\n0 2 * * * /cmd\n\n@daily /cmd2\n";
    const output = buildAnnotatedExport(text, EVAL_TZ, DISPLAY_TZ);
    const lines = output.split("\n");

    // line 0: blank (original empty line)
    expect(lines[0]).toBe("");
    // line 1: job "0 2 * * * /cmd"
    expect(lines[1]).toBe("0 2 * * * /cmd");
    // line 2: annotation for it
    expect(lines[2]).toMatch(/^# → /);
    // line 3: blank (original empty line)
    expect(lines[3]).toBe("");
    // line 4: job "@daily /cmd2"
    expect(lines[4]).toBe("@daily /cmd2");
    // line 5: annotation for @daily
    expect(lines[5]).toMatch(/^# → /);
  });

  it("comment lines pass through with no annotation", () => {
    const text = "# my comment\n0 9 * * * /cmd";
    const output = buildAnnotatedExport(text, EVAL_TZ, DISPLAY_TZ);
    const lines = output.split("\n");

    expect(lines[0]).toBe("# my comment");
    expect(lines[1]).toBe("0 9 * * * /cmd");
    expect(lines[2]).toMatch(/^# → /);
    // Only 3 lines total (no extra annotation for the comment)
    expect(lines.length).toBe(3);
  });

  it("env lines pass through with no annotation", () => {
    const text = "MAILTO=ops@example.com\n0 9 * * * /cmd";
    const output = buildAnnotatedExport(text, EVAL_TZ, DISPLAY_TZ);
    const lines = output.split("\n");

    expect(lines[0]).toBe("MAILTO=ops@example.com");
    expect(lines[1]).toBe("0 9 * * * /cmd");
    expect(lines[2]).toMatch(/^# → /);
    expect(lines.length).toBe(3);
  });

  it("invalid job lines (out-of-range) produce no annotation — line preserved verbatim", () => {
    const text = "61 * * * * /broken.sh\n0 9 * * * /cmd";
    const output = buildAnnotatedExport(text, EVAL_TZ, DISPLAY_TZ);
    const lines = output.split("\n");

    // First line: the invalid cron, verbatim
    expect(lines[0]).toBe("61 * * * * /broken.sh");
    // Second line: the valid job (NO annotation inserted for the invalid above)
    expect(lines[1]).toBe("0 9 * * * /cmd");
    // Third line: annotation for the valid job
    expect(lines[2]).toMatch(/^# → /);
    expect(lines.length).toBe(3);
  });
});

describe("buildAnnotatedExport — annotation format", () => {
  it("annotation starts with '# → ' followed by the description", () => {
    const text = "0 2 * * * /backup.sh";
    const output = buildAnnotatedExport(text, EVAL_TZ, DISPLAY_TZ);
    const lines = output.split("\n");

    // line[0]: original job
    // line[1]: annotation
    const annotation = lines[1];
    expect(annotation).toMatch(/^# → .+ \(next: .+\)$/);
  });

  it("annotation contains '(next: ' — no word run-together before the paren", () => {
    const text = "0 9 * * * /cmd";
    const output = buildAnnotatedExport(text, EVAL_TZ, DISPLAY_TZ);
    const annotation = output.split("\n")[1];

    // Space before "(next:" — prevents "description(next:..." word-run-together
    expect(annotation).toContain(" (next: ");
  });

  it("annotation for @daily mentions midnight", () => {
    const text = "@daily /rotate-logs.sh";
    const output = buildAnnotatedExport(text, EVAL_TZ, DISPLAY_TZ);
    const annotation = output.split("\n")[1];

    expect(annotation).toMatch(/# → .*(midnight|every day)/i);
  });

  it("annotation for 0 9 * * MON-FRI mentions Monday", () => {
    const text = "0 9 * * MON-FRI /cmd";
    const output = buildAnnotatedExport(text, EVAL_TZ, DISPLAY_TZ);
    const annotation = output.split("\n")[1];

    // Description should reference Mon-Fri
    expect(annotation).toMatch(/Monday/i);
  });

  it("next-run in annotation is formatted with a time (HH:MM pattern)", () => {
    const text = "0 2 * * * /backup.sh";
    const output = buildAnnotatedExport(text, EVAL_TZ, DISPLAY_TZ);
    const annotation = output.split("\n")[1];

    // The formatted date must contain a time component like "2:00 AM" or "02:00"
    expect(annotation).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe("buildAnnotatedExport — full sample crontab", () => {
  it("sample produces the correct number of output lines", () => {
    // SAMPLE_CRONTAB has 8 lines (no trailing newline):
    // comment, env, job, job, blank, job, job, invalid_job
    // 4 valid jobs → 4 annotations → 8 + 4 = 12 output lines
    const output = buildAnnotatedExport(SAMPLE_CRONTAB, EVAL_TZ, DISPLAY_TZ);
    const lines = output.split("\n");
    expect(lines.length).toBe(12);
  });

  it("sample: comment and env lines are unchanged", () => {
    const output = buildAnnotatedExport(SAMPLE_CRONTAB, EVAL_TZ, DISPLAY_TZ);
    const lines = output.split("\n");

    // Line 0: comment (verbatim)
    expect(lines[0]).toBe("# Backup database every night");
    // Line 1: env (verbatim)
    expect(lines[1]).toBe("MAILTO=ops@example.com");
  });

  it("sample: valid job at line index 2 gets annotation at index 3", () => {
    const output = buildAnnotatedExport(SAMPLE_CRONTAB, EVAL_TZ, DISPLAY_TZ);
    const lines = output.split("\n");

    // Line 2: job "0 2 * * * ..."
    expect(lines[2]).toMatch(/^0 2 \* \* \*/);
    // Line 3: annotation
    expect(lines[3]).toMatch(/^# → /);
    expect(lines[3]).toContain("2:00");
  });

  it("sample: blank line preserved, followed immediately by next job and its annotation", () => {
    const output = buildAnnotatedExport(SAMPLE_CRONTAB, EVAL_TZ, DISPLAY_TZ);
    const lines = output.split("\n");

    // After the two jobs (0 2 + */15) and their annotations:
    // Line 0: comment
    // Line 1: env
    // Line 2: "0 2 * * *..."  job
    // Line 3: annotation
    // Line 4: "*/15 9-17..." job
    // Line 5: annotation
    // Line 6: blank
    // Line 7: "@daily..." job
    // Line 8: annotation
    expect(lines[6]).toBe("");
    expect(lines[7]).toMatch(/^@daily/);
    expect(lines[8]).toMatch(/^# → /);
  });

  it("sample: invalid job (61 * * * *) is preserved verbatim with NO annotation", () => {
    const output = buildAnnotatedExport(SAMPLE_CRONTAB, EVAL_TZ, DISPLAY_TZ);
    const lines = output.split("\n");

    // Last line should be the invalid job, no annotation after it
    const lastLine = lines[lines.length - 1];
    expect(lastLine).toMatch(/^61 \* \* \* \*/);
  });

  it("sample: no annotation line immediately follows the invalid job", () => {
    const output = buildAnnotatedExport(SAMPLE_CRONTAB, EVAL_TZ, DISPLAY_TZ);
    const lines = output.split("\n");

    const invalidIdx = lines.findIndex((l) => l.startsWith("61 "));
    expect(invalidIdx).toBeGreaterThan(0);
    // There must be no line after invalid (it's the last original line, no trailing newline)
    expect(lines.length).toBe(invalidIdx + 1);
  });
});

describe("buildAnnotatedExport — explicit space separators (no word-run-together)", () => {
  it("no two annotation words are glued together (space before every '(' and after '→')", () => {
    const cases = [
      "0 2 * * * /backup.sh",
      "@daily /rotate.sh",
      "*/15 9-17 * * MON-FRI /poll.sh",
      "0 9 1 * * /invoices.sh",
    ];
    for (const line of cases) {
      const output = buildAnnotatedExport(line, EVAL_TZ, DISPLAY_TZ);
      const annotation = output.split("\n")[1];
      // "→ " must be followed by a space (already in "# → description")
      expect(annotation).toMatch(/^# → \S/);
      // "(next:" must be preceded by a space
      expect(annotation).toContain(" (next: ");
    }
  });
});
