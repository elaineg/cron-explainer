import { describe, it, expect } from "vitest";
import { classifyLine, classifyCrontab, SAMPLE_CRONTAB } from "@/app/crontab-file-mode";

describe("classifyLine — blank lines", () => {
  it("empty string is blank", () => {
    expect(classifyLine("").kind).toBe("blank");
  });
  it("whitespace-only is blank", () => {
    expect(classifyLine("   ").kind).toBe("blank");
    expect(classifyLine("\t").kind).toBe("blank");
  });
  it("CRLF blank line", () => {
    expect(classifyLine("\r").kind).toBe("blank");
  });
});

describe("classifyLine — comment lines", () => {
  it("# comment is detected", () => {
    const r = classifyLine("# Backup database every night");
    expect(r.kind).toBe("comment");
    expect(r.commentText).toBe("Backup database every night");
  });
  it("leading whitespace before #", () => {
    const r = classifyLine("  # indented comment");
    expect(r.kind).toBe("comment");
  });
  it("bare # with no text", () => {
    const r = classifyLine("#");
    expect(r.kind).toBe("comment");
  });
});

describe("classifyLine — ENV lines", () => {
  it("KEY=VALUE is env", () => {
    const r = classifyLine("MAILTO=ops@example.com");
    expect(r.kind).toBe("env");
    expect(r.envKey).toBe("MAILTO");
    expect(r.envValue).toBe("ops@example.com");
  });
  it("env with = in value", () => {
    const r = classifyLine("FOO=bar=baz");
    expect(r.kind).toBe("env");
    expect(r.envKey).toBe("FOO");
    expect(r.envValue).toBe("bar=baz");
  });
  it("PATH=/usr/bin:/usr/local/bin", () => {
    const r = classifyLine("PATH=/usr/bin:/usr/local/bin");
    expect(r.kind).toBe("env");
    expect(r.envKey).toBe("PATH");
  });
  it("underscore in key", () => {
    const r = classifyLine("MY_VAR=hello");
    expect(r.kind).toBe("env");
    expect(r.envKey).toBe("MY_VAR");
  });
  it("leading whitespace", () => {
    const r = classifyLine("  MAILTO=ops@example.com");
    expect(r.kind).toBe("env");
  });
});

describe("classifyLine — JOB lines", () => {
  it("standard 5-field", () => {
    const r = classifyLine("0 2 * * * /usr/local/bin/backup.sh");
    expect(r.kind).toBe("job");
    expect(r.jobExpr).toBe("0 2 * * *");
  });
  it("@daily macro", () => {
    const r = classifyLine("@daily /usr/local/bin/rotate-logs.sh");
    expect(r.kind).toBe("job");
    expect(r.jobExpr).toBe("@daily");
  });
  it("step syntax */15", () => {
    const r = classifyLine("*/15 9-17 * * MON-FRI /usr/local/bin/poll.sh");
    expect(r.kind).toBe("job");
    expect(r.jobExpr).toMatch(/\*\/15/);
  });
  it("CRLF line ending handled", () => {
    const r = classifyLine("0 2 * * * /backup.sh\r");
    expect(r.kind).toBe("job");
    expect(r.jobExpr).toBe("0 2 * * *");
  });
});

describe("classifyCrontab — sample crontab", () => {
  it("classifies the exact sample correctly", () => {
    const rows = classifyCrontab(SAMPLE_CRONTAB);
    const kinds = rows.map((r) => r.kind);
    expect(kinds[0]).toBe("comment");   // # Backup database every night
    expect(kinds[1]).toBe("env");       // MAILTO=ops@example.com
    expect(kinds[2]).toBe("job");       // 0 2 * * *
    expect(kinds[3]).toBe("job");       // */15 9-17 * * MON-FRI
    expect(kinds[4]).toBe("blank");     // empty line
    expect(kinds[5]).toBe("job");       // @daily
    expect(kinds[6]).toBe("job");       // 0 9 1 * *
    expect(kinds[7]).toBe("job");       // 61 * * * * (invalid, but classified as job)
  });

  it("ENV row has correct key/value", () => {
    const rows = classifyCrontab(SAMPLE_CRONTAB);
    const envRow = rows[1];
    expect(envRow.kind).toBe("env");
    expect(envRow.envKey).toBe("MAILTO");
    expect(envRow.envValue).toBe("ops@example.com");
  });

  it("COMMENT row has correct text", () => {
    const rows = classifyCrontab(SAMPLE_CRONTAB);
    const commentRow = rows[0];
    expect(commentRow.kind).toBe("comment");
    expect(commentRow.commentText).toBe("Backup database every night");
  });

  it("job rows have jobExpr extracted", () => {
    const rows = classifyCrontab(SAMPLE_CRONTAB);
    // 0 2 * * *
    expect(rows[2].jobExpr).toBe("0 2 * * *");
    // @daily
    expect(rows[5].jobExpr).toBe("@daily");
    // 0 9 1 * *
    expect(rows[6].jobExpr).toBe("0 9 1 * *");
  });

  it("the 61 * * * * job is classified as a job (invalid detected later by explainCron)", () => {
    const rows = classifyCrontab(SAMPLE_CRONTAB);
    const invalidRow = rows[7];
    expect(invalidRow.kind).toBe("job");
    expect(invalidRow.jobExpr).toBe("61 * * * *");
  });
});

describe("classifyLine — edge cases", () => {
  it("number-starting line is a job", () => {
    const r = classifyLine("1 2 3 4 5 command");
    expect(r.kind).toBe("job");
  });
  it("cron line with no command is still a job", () => {
    const r = classifyLine("0 9 * * *");
    expect(r.kind).toBe("job");
    expect(r.jobExpr).toBe("0 9 * * *");
  });
  it("@weekly is a job", () => {
    const r = classifyLine("@weekly /run.sh");
    expect(r.kind).toBe("job");
    expect(r.jobExpr).toBe("@weekly");
  });
});
