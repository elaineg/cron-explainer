import { describe, it, expect } from "vitest";
import { englishToCron, EnglishError, EXAMPLE_PHRASES } from "@/lib/english";
import { explainCron } from "@/lib/cron";

describe("englishToCron — intervals", () => {
  it("every minute", () => {
    expect(englishToCron("every minute")).toBe("* * * * *");
  });

  it("every N minutes", () => {
    expect(englishToCron("every 10 minutes")).toBe("*/10 * * * *");
    expect(englishToCron("every 5 minutes")).toBe("*/5 * * * *");
  });

  it("every 1 minute normalizes to * (no */1)", () => {
    expect(englishToCron("every 1 minute")).toBe("* * * * *");
  });

  it("every N minutes with day qualifiers", () => {
    expect(englishToCron("every 10 minutes on weekends")).toBe(
      "*/10 * * * 0,6"
    );
    expect(englishToCron("every 5 minutes on weekdays")).toBe("*/5 * * * 1-5");
    expect(englishToCron("every minute on weekdays")).toBe("* * * * 1-5");
  });

  it("every hour, with and without qualifiers", () => {
    expect(englishToCron("every hour")).toBe("0 * * * *");
    expect(englishToCron("every hour on weekends")).toBe("0 * * * 0,6");
  });

  it("every N hours, with and without qualifiers", () => {
    expect(englishToCron("every 2 hours")).toBe("0 */2 * * *");
    expect(englishToCron("every 6 hours on weekdays")).toBe("0 */6 * * 1-5");
  });
});

describe("englishToCron — daily and weekday times", () => {
  it("every day at H am/pm", () => {
    expect(englishToCron("every day at 9am")).toBe("0 9 * * *");
    expect(englishToCron("every day at 6:30pm")).toBe("30 18 * * *");
  });

  it("24-hour times", () => {
    expect(englishToCron("every day at 17:00")).toBe("0 17 * * *");
    expect(englishToCron("every day at 0:15")).toBe("15 0 * * *");
  });

  it("12am is midnight, 12pm is noon", () => {
    expect(englishToCron("every day at 12am")).toBe("0 0 * * *");
    expect(englishToCron("every day at 12pm")).toBe("0 12 * * *");
  });

  it("noon and midnight keywords", () => {
    expect(englishToCron("every day at noon")).toBe("0 12 * * *");
    expect(englishToCron("every day at midnight")).toBe("0 0 * * *");
  });

  it("every weekday at a time (spec success check)", () => {
    expect(englishToCron("every weekday at 9am")).toBe("0 9 * * 1-5");
  });

  it("every weekend at a time", () => {
    expect(englishToCron("every weekend at 10am")).toBe("0 10 * * 0,6");
  });

  it("bare 'at <time>' means daily", () => {
    expect(englishToCron("at 6:30pm")).toBe("30 18 * * *");
  });
});

describe("englishToCron — named weekdays", () => {
  it("every <day> at <time>", () => {
    expect(englishToCron("every monday at 9am")).toBe("0 9 * * 1");
    expect(englishToCron("every sunday at 8pm")).toBe("0 20 * * 0");
  });

  it("on <abbrev> and <abbrev> at 24h time (spec example)", () => {
    expect(englishToCron("on mon and fri at 17:00")).toBe("0 17 * * 1,5");
  });

  it("comma and 'and' separated lists, deduped and sorted", () => {
    expect(englishToCron("on monday, wednesday and friday at 8:15am")).toBe(
      "15 8 * * 1,3,5"
    );
    expect(englishToCron("on fri and mon and fri at 9am")).toBe(
      "0 9 * * 1,5"
    );
  });

  it("plural day names ('mondays')", () => {
    expect(englishToCron("every mondays at 9am")).toBe("0 9 * * 1");
  });

  it("'at <time> on <days>' order", () => {
    expect(englishToCron("at 9am on weekdays")).toBe("0 9 * * 1-5");
    expect(englishToCron("at 17:00 on sat and sun")).toBe("0 17 * * 0,6");
  });

  it("'on weekends at <time>'", () => {
    expect(englishToCron("on weekends at 9am")).toBe("0 9 * * 0,6");
  });
});

describe("englishToCron — day of month", () => {
  it("at <time> on the Nth (spec example)", () => {
    expect(englishToCron("at 6:30pm on the 1st")).toBe("30 18 1 * *");
    expect(englishToCron("at 9am on the 15th")).toBe("0 9 15 * *");
    expect(englishToCron("at 8am on the 22nd")).toBe("0 8 22 * *");
    expect(englishToCron("at 8am on the 3rd")).toBe("0 8 3 * *");
  });

  it("on the Nth at <time> (reversed order)", () => {
    expect(englishToCron("on the 1st at 6:30pm")).toBe("30 18 1 * *");
  });
});

describe("englishToCron — normalization", () => {
  it("is case-insensitive", () => {
    expect(englishToCron("Every Weekday At 9AM")).toBe("0 9 * * 1-5");
    expect(englishToCron("EVERY 10 MINUTES ON WEEKENDS")).toBe(
      "*/10 * * * 0,6"
    );
  });

  it("tolerates extra whitespace and trailing punctuation", () => {
    expect(englishToCron("  every   10   minutes  ")).toBe("*/10 * * * *");
    expect(englishToCron("every weekday at 9am.")).toBe("0 9 * * 1-5");
  });
});

describe("englishToCron — rejections (never a silent guess)", () => {
  const reject = (phrase: string) =>
    expect(() => englishToCron(phrase)).toThrow(EnglishError);

  it("rejects empty input", () => {
    reject("");
    reject("   ");
  });

  it("rejects phrases outside the grammar", () => {
    reject("whenever mercury is in retrograde");
    reject("banana");
    reject("every fortnight");
    reject("twice a day");
    reject("every 30 seconds");
  });

  it("rejects intervals that don't fit cron fields", () => {
    reject("every 0 minutes");
    reject("every 75 minutes");
    reject("every 0 hours");
    reject("every 25 hours");
  });

  it("rejects invalid times with a specific message", () => {
    reject("every day at 25:00");
    reject("every day at 13pm");
    reject("every day at 9:75");
    expect(() => englishToCron("every day at 25:00")).toThrow(/0–23/);
  });

  it("rejects unknown day names", () => {
    reject("every blursday at 9am");
    reject("on mon and funday at 9am");
  });

  it("rejects out-of-range days of the month", () => {
    reject("at 9am on the 32nd");
    reject("at 9am on the 0th");
  });

  it("rejects day phrases without a time (no midnight guess)", () => {
    reject("every monday");
    reject("every weekday");
    reject("on the 1st");
  });

  it("error messages are EnglishError instances with non-empty messages", () => {
    try {
      englishToCron("whenever mercury is in retrograde");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(EnglishError);
      expect((e as Error).message.length).toBeGreaterThan(0);
    }
  });
});

describe("englishToCron — output is always accepted by explainCron", () => {
  const FROM = new Date("2026-06-11T12:00:00.000Z");
  const phrases = [
    ...EXAMPLE_PHRASES,
    "every minute",
    "every 10 minutes",
    "every hour",
    "every 3 hours on weekends",
    "every day at 6:30pm",
    "every monday at 9am",
    "on mon and fri at 17:00",
    "at 9am on the 15th",
    "at noon",
  ];

  it.each(phrases)("'%s' round-trips through explainCron", (phrase) => {
    const cron = englishToCron(phrase);
    const { description, next } = explainCron(cron, 5, FROM);
    expect(description.length).toBeGreaterThan(0);
    expect(next).toHaveLength(5);
  });

  it("'every weekday at 9am' explanation mentions weekdays and 9:00", () => {
    const cron = englishToCron("every weekday at 9am");
    expect(cron).toBe("0 9 * * 1-5");
    const { description } = explainCron(cron, 5, FROM);
    expect(description).toMatch(/09:00|9:00 AM/);
    expect(description).toContain("Monday through Friday");
  });

  it("'every 10 minutes on weekends' explanation mentions every 10 minutes and Sat/Sun", () => {
    const cron = englishToCron("every 10 minutes on weekends");
    expect(cron).toBe("*/10 * * * 0,6");
    const { description } = explainCron(cron, 5, FROM);
    expect(description.toLowerCase()).toContain("every 10 minutes");
    expect(description).toMatch(/Sunday.*Saturday|Saturday.*Sunday/);
  });
});
