/**
 * Deterministic, rule-based English → cron generator. No LLM, no network, no
 * dependencies — just an anchored grammar. Anything outside the grammar throws
 * EnglishError so the UI can show a friendly "couldn't understand" message;
 * we NEVER fall back to a silent guess.
 *
 * Grammar (case-insensitive, whitespace-tolerant, trailing punctuation ok):
 *   every minute [on <days>]
 *   every N minutes [on <days>]            N in 1–59
 *   every hour [on <days>]
 *   every N hours [on <days>]              N in 1–23
 *   every day at <time>
 *   every weekday at <time>
 *   every weekend at <time>
 *   every <weekday names> at <time>        e.g. "every monday at 9am"
 *   <weekday names> at <time>              e.g. "9am every monday" (weekday-first)
 *   on <days> at <time>                    e.g. "on mon and fri at 17:00"
 *   at <time> on <days>
 *   on the Nth at <time> / at <time> on the Nth   N in 1–31 (day of month)
 *   first of the month at <time>
 *   last of the month at <time>
 *   at <time> [on the first/last of the month]
 *   at <time>                              (daily)
 *   quarterly at <time>                    (0 0 1 1,4,7,10 *)
 *
 * <days>  = "weekdays" | "weekends" | weekday names joined by "and"/","
 * <time>  = H | H:MM | Ham/pm | H:MMam/pm | "noon" | "midnight"
 *           (H without am/pm is read as a 24-hour clock hour, 0–23)
 */

/** Error whose message is safe to show to the user. */
export class EnglishError extends Error {}

/** Phrases shown as clickable example chips. */
export const EXAMPLE_PHRASES = [
  "every weekday at 9am",
  "noon every day",
  "first of the month at 9am",
  "every 30 minutes",
  "9am every monday",
] as const;

const CANT_UNDERSTAND =
  "Couldn't read that schedule. Try one of the examples below.";

function fail(message: string = CANT_UNDERSTAND): never {
  throw new EnglishError(message);
}

const DOW: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  weds: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

interface Time {
  h: number;
  m: number;
}

function parseTime(raw: string): Time {
  const s = raw.trim();
  if (s === "noon") return { h: 12, m: 0 };
  if (s === "midnight") return { h: 0, m: 0 };
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(s);
  if (!m) {
    fail(`"${raw}" doesn't look like a time. Try "9am", "17:00", or "6:30pm".`);
  }
  let h = parseInt(m[1], 10);
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = m[3];
  if (minutes > 59) {
    fail(`"${raw}" is not a valid time: minutes must be 00–59.`);
  }
  if (meridiem) {
    if (h < 1 || h > 12) {
      fail(`"${raw}" is not a valid time: use hours 1–12 with am/pm.`);
    }
    h = h % 12;
    if (meridiem === "pm") h += 12;
  } else if (h > 23) {
    fail(`"${raw}" is not a valid time: hours must be 0–23.`);
  }
  return { h, m: minutes };
}

/**
 * Parse a day qualifier ("weekdays", "weekends", or weekday names joined by
 * "and"/commas) into a cron day-of-week field.
 */
function parseDays(raw: string): string {
  const s = raw.trim();
  if (s === "weekends" || s === "weekend" || s === "the weekend") return "0,6";
  if (s === "weekdays" || s === "week days") return "1-5";
  const parts = s
    .split(/\s*(?:,|\band\b)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) fail();
  const nums = new Set<number>();
  for (const part of parts) {
    let n = DOW[part];
    // Accept plurals like "mondays".
    if (n === undefined && part.endsWith("s")) n = DOW[part.slice(0, -1)];
    if (n === undefined) {
      fail(`"${part}" is not a day of the week I recognize.`);
    }
    nums.add(n);
  }
  return [...nums].sort((a, b) => a - b).join(",");
}

function parseDayOfMonth(raw: string): number {
  const n = parseInt(raw, 10);
  if (n < 1 || n > 31) {
    fail(`"the ${raw}" is not a day of the month (use 1–31).`);
  }
  return n;
}

/**
 * Convert a plain-English schedule to a 5-field cron expression.
 * Throws EnglishError (message safe to show) for anything outside the grammar.
 */
export function englishToCron(input: string): string {
  const s = input
    .toLowerCase()
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) fail("Type a schedule in plain English.");

  let m: RegExpExecArray | null;

  // every minute / every N minutes [on <days>]
  if ((m = /^every (?:(\d+) )?minutes?(?: on (.+))?$/.exec(s))) {
    const n = m[1] ? parseInt(m[1], 10) : 1;
    if (n < 1 || n > 59) {
      fail(`"every ${m[1]} minutes" doesn't fit cron's minute field (1–59).`);
    }
    const dow = m[2] ? parseDays(m[2]) : "*";
    return `${n === 1 ? "*" : `*/${n}`} * * * ${dow}`;
  }

  // every hour / every N hours [on <days>]
  if ((m = /^every (?:(\d+) )?hours?(?: on (.+))?$/.exec(s))) {
    const n = m[1] ? parseInt(m[1], 10) : 1;
    if (n < 1 || n > 23) {
      fail(`"every ${m[1]} hours" doesn't fit cron's hour field (1–23).`);
    }
    const dow = m[2] ? parseDays(m[2]) : "*";
    return `0 ${n === 1 ? "*" : `*/${n}`} * * ${dow}`;
  }

  // quarterly [at <time>]
  if ((m = /^quarterly(?: at (.+))?$/.exec(s))) {
    const t = m[1] ? parseTime(m[1]) : { h: 0, m: 0 };
    return `${t.m} ${t.h} 1 1,4,7,10 *`;
  }

  // first of the month [at <time>]
  if (
    (m =
      /^(?:first of (?:the )?month|on the first of (?:the )?month)(?: at (.+))?$/.exec(
        s
      ))
  ) {
    const t = m[1] ? parseTime(m[1]) : fail();
    return `${t.m} ${t.h} 1 * *`;
  }

  // last of the month [at <time>]
  if (
    (m =
      /^(?:last of (?:the )?month|on the last of (?:the )?month)(?: at (.+))?$/.exec(
        s
      ))
  ) {
    const t = m[1] ? parseTime(m[1]) : fail();
    return `${t.m} ${t.h} 28-31 * *`;
  }

  // every day at <time>
  if ((m = /^every day at (.+)$/.exec(s))) {
    const t = parseTime(m[1]);
    return `${t.m} ${t.h} * * *`;
  }

  // every weekday at <time>
  if ((m = /^every weekday at (.+)$/.exec(s))) {
    const t = parseTime(m[1]);
    return `${t.m} ${t.h} * * 1-5`;
  }

  // every weekend (day) at <time>
  if ((m = /^every weekend(?: day)? at (.+)$/.exec(s))) {
    const t = parseTime(m[1]);
    return `${t.m} ${t.h} * * 0,6`;
  }

  // <time> every <days> — weekday-first ordering e.g. "9am every monday"
  // Must come before "every <weekday> at <time>" to handle "9am every monday"
  if ((m = /^(\S+)\s+every\s+(.+)$/.exec(s))) {
    // Try to parse m[1] as a time and m[2] as a day/days spec
    try {
      const t = parseTime(m[1]);
      // m[2] could be "monday", "weekday", "weekdays", "weekend", etc.
      const dayStr = m[2];
      let dow: string;
      if (dayStr === "day") {
        dow = "*";
      } else if (dayStr === "weekday" || dayStr === "weekdays") {
        dow = "1-5";
      } else if (
        dayStr === "weekend" ||
        dayStr === "weekends" ||
        dayStr === "the weekend"
      ) {
        dow = "0,6";
      } else {
        dow = parseDays(dayStr);
      }
      return `${t.m} ${t.h} * * ${dow}`;
    } catch {
      // not a time-first phrase — fall through
    }
  }

  // noon/midnight every <days> — e.g. "noon every day"
  if ((m = /^(noon|midnight) every (.+)$/.exec(s))) {
    const t = parseTime(m[1]);
    const dayStr = m[2];
    let dow: string;
    if (dayStr === "day") {
      dow = "*";
    } else if (dayStr === "weekday" || dayStr === "weekdays") {
      dow = "1-5";
    } else if (
      dayStr === "weekend" ||
      dayStr === "weekends" ||
      dayStr === "the weekend"
    ) {
      dow = "0,6";
    } else {
      dow = parseDays(dayStr);
    }
    return `${t.m} ${t.h} * * ${dow}`;
  }

  // every <weekday names> at <time>   e.g. "every monday at 9am"
  if ((m = /^every (.+?) at (.+)$/.exec(s))) {
    const dow = parseDays(m[1]);
    const t = parseTime(m[2]);
    return `${t.m} ${t.h} * * ${dow}`;
  }

  // on the Nth at <time>  (day of month)
  if ((m = /^on the (\d+)(?:st|nd|rd|th)? at (.+)$/.exec(s))) {
    const dom = parseDayOfMonth(m[1]);
    const t = parseTime(m[2]);
    return `${t.m} ${t.h} ${dom} * *`;
  }

  // at <time> on the Nth  (day of month)
  if ((m = /^at (.+) on the (\d+)(?:st|nd|rd|th)?$/.exec(s))) {
    const t = parseTime(m[1]);
    const dom = parseDayOfMonth(m[2]);
    return `${t.m} ${t.h} ${dom} * *`;
  }

  // at <time> on the first/last of the month
  if ((m = /^at (.+) on the first of (?:the )?month$/.exec(s))) {
    const t = parseTime(m[1]);
    return `${t.m} ${t.h} 1 * *`;
  }
  if ((m = /^at (.+) on the last of (?:the )?month$/.exec(s))) {
    const t = parseTime(m[1]);
    return `${t.m} ${t.h} 28-31 * *`;
  }

  // on <days> at <time>   e.g. "on mon and fri at 17:00"
  if ((m = /^on (.+) at (.+)$/.exec(s))) {
    const dow = parseDays(m[1]);
    const t = parseTime(m[2]);
    return `${t.m} ${t.h} * * ${dow}`;
  }

  // at <time> on <days>   e.g. "at 9am on weekdays"
  if ((m = /^at (.+) on (.+)$/.exec(s))) {
    const t = parseTime(m[1]);
    const dow = parseDays(m[2]);
    return `${t.m} ${t.h} * * ${dow}`;
  }

  // at <time>   (every day)
  if ((m = /^at (.+)$/.exec(s))) {
    const t = parseTime(m[1]);
    return `${t.m} ${t.h} * * *`;
  }

  fail();
}
