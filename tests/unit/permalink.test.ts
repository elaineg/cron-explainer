import { describe, it, expect } from "vitest";
import { explainCron, decodeExpressionParam, CronError } from "@/lib/cron";

const FROM = new Date("2026-06-11T12:00:00.000Z");

/**
 * The permalink pipeline: the UI builds `/e/${encodeURIComponent(expr)}` and
 * the /e/[expr] page runs decodeExpressionParam + explainCron on the segment.
 * These tests exercise that exact encode -> decode -> explain round trip.
 */
describe("permalink pipeline: encodeURIComponent -> decodeExpressionParam -> explainCron", () => {
  const validExpressions = [
    "*/10 * * * *",
    "0 9 * * MON-FRI",
    "*/15 9-17 * * MON-FRI",
    "1,15 * * * *",
    "1-30/2 * * * *",
    "@daily",
    "@yearly",
  ];

  it.each(validExpressions)(
    "round-trips %s through the UI's permalink encoding",
    (expr) => {
      const segment = encodeURIComponent(expr);
      const decoded = decodeExpressionParam(segment);
      expect(decoded).toBe(expr);
      const { description, next } = explainCron(decoded, 5, FROM);
      expect(description.length).toBeGreaterThan(0);
      expect(next).toHaveLength(5);
    }
  );

  it("explains the spec's fully-encoded segment %2A%2F10%20%2A%20%2A%20%2A%20%2A as every 10 minutes", () => {
    const decoded = decodeExpressionParam("%2A%2F10%20%2A%20%2A%20%2A%20%2A");
    expect(decoded).toBe("*/10 * * * *");
    const { description, next } = explainCron(decoded, 5, FROM);
    expect(description.toLowerCase()).toContain("every 10 minutes");
    expect(next).toHaveLength(5);
  });

  it("is safe if the framework already decoded the segment (no double-decode corruption)", () => {
    // Valid cron expressions contain no '%', so decoding twice is identity.
    for (const expr of validExpressions) {
      expect(decodeExpressionParam(expr)).toBe(expr);
    }
  });

  it("decodes /e/banana to a string explainCron rejects with a CronError (not a crash)", () => {
    const decoded = decodeExpressionParam("banana");
    expect(decoded).toBe("banana");
    expect(() => explainCron(decoded, 5, FROM)).toThrow(CronError);
    expect(() => explainCron(decoded, 5, FROM)).toThrow(
      /Not a valid cron expression/
    );
  });

  it("handles garbage segments with malformed percent escapes without throwing", () => {
    const decoded = decodeExpressionParam("%zz%5");
    expect(typeof decoded).toBe("string");
    expect(() => explainCron(decoded, 5, FROM)).toThrow(CronError);
  });

  it("rejects an encoded @reboot permalink with the explanatory message", () => {
    const decoded = decodeExpressionParam(encodeURIComponent("@reboot"));
    expect(() => explainCron(decoded, 5, FROM)).toThrow(/@reboot/);
  });
});
