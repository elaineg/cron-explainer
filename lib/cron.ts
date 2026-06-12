import cronstrue from "cronstrue";
import { CronExpressionParser } from "cron-parser";

/** Error whose message is safe to show to the user. */
export class CronError extends Error {}

const MACROS: Record<string, string> = {
  "@hourly": "0 * * * *",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@weekly": "0 0 * * 0",
  "@monthly": "0 0 1 * *",
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
};

export interface CronExplanation {
  expression: string;
  description: string;
  next: Date[];
}

/**
 * Decode a cron expression that arrived as a URL path segment (e.g. from the
 * /e/[expr] route). Decodes percent-escapes exactly once; if the segment is
 * not valid percent-encoding (stray `%`), returns it unchanged so the parser
 * can produce the normal inline error instead of the page crashing.
 *
 * Safe even if the framework already decoded the segment: valid cron
 * expressions never contain `%`, so a second decode is the identity.
 */
export function decodeExpressionParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function reasonFrom(e: unknown): string {
  // cronstrue throws plain strings; cron-parser throws Errors.
  const raw = e instanceof Error ? e.message : String(e);
  return raw.replace(/^Error:\s*/i, "").trim();
}

/**
 * Explain a standard 5-field cron expression (or supported @macro) and compute
 * its next `count` run times. Throws CronError with a human-readable message
 * for anything invalid.
 */
export function explainCron(
  input: string,
  count = 5,
  from: Date = new Date()
): CronExplanation {
  const expression = input.trim();
  if (!expression) {
    throw new CronError("Enter a cron expression.");
  }

  let normalized = expression;

  if (expression.startsWith("@")) {
    const lower = expression.toLowerCase();
    if (lower === "@reboot") {
      throw new CronError(
        "@reboot is not supported: it runs once at system startup, so it has no schedule to explain or predict."
      );
    }
    const macro = MACROS[lower];
    if (!macro) {
      throw new CronError(
        `Not a valid cron expression: unknown special string "${expression}". Supported: ${Object.keys(
          MACROS
        ).join(", ")}.`
      );
    }
    normalized = macro;
  } else {
    const fields = expression.split(/\s+/);
    if (fields.length !== 5) {
      const hint =
        fields.length === 6
          ? " 6-field (seconds) syntax is not supported — use standard 5-field cron (minute hour day-of-month month day-of-week)."
          : " Expected 5 fields: minute hour day-of-month month day-of-week.";
      throw new CronError(
        `Not a valid cron expression: it has ${fields.length} field${
          fields.length === 1 ? "" : "s"
        }.${hint}`
      );
    }
  }

  let description: string;
  let next: Date[];
  try {
    description = cronstrue.toString(normalized);
    const interval = CronExpressionParser.parse(normalized, {
      currentDate: from,
    });
    next = [];
    for (let i = 0; i < count; i++) {
      next.push(interval.next().toDate());
    }
  } catch (e) {
    throw new CronError(`Not a valid cron expression: ${reasonFrom(e)}`);
  }

  // Make midnight explicit so "@daily" reads as a midnight schedule.
  description = description.replace(/^At 12:00 AM/, "At 12:00 AM (midnight)");

  return { expression, description, next };
}
