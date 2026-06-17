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

export type Dialect = "unix" | "quartz" | "aws";

export interface CronExplanation {
  expression: string;
  description: string;
  next: Date[];
  dialect: Dialect;
  /**
   * When the expression specifies a concrete year constraint and all occurrences
   * are in the past (or the year window is exhausted before 5 runs are found),
   * this note explains why `next` is empty or short.
   * e.g. "No upcoming runs — 2020 is in the past"
   */
  yearNote?: string;
}

/**
 * Parse a year field (from Quartz 7-field trailing year, or AWS 6-field last
 * field) into a concrete set of allowed years, or null if the field is a
 * wildcard ('*' or '?').
 * Supports: single year "2027", comma list "2027,2028", range "2027-2030".
 */
export function parseYearConstraint(yearField: string): number[] | null {
  if (yearField === "*" || yearField === "?") return null; // wildcard
  const years: number[] = [];
  for (const part of yearField.split(",")) {
    const rangeMatch = /^(\d{4})-(\d{4})$/.exec(part.trim());
    if (rangeMatch) {
      const from = parseInt(rangeMatch[1], 10);
      const to = parseInt(rangeMatch[2], 10);
      for (let y = from; y <= to; y++) years.push(y);
    } else if (/^\d{4}$/.test(part.trim())) {
      years.push(parseInt(part.trim(), 10));
    }
    // Ignore unrecognized parts — let the parser handle syntax errors
  }
  return years.length > 0 ? years : null;
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
 * Returns true if the last field looks like a 4-digit year (or * / ? used as a
 * year wildcard in the trailing position where AWS 6-field uses a year field).
 */
function looksLikeYear(field: string): boolean {
  return /^\d{4}$/.test(field) || field === "*" || field === "?";
}

/**
 * Returns true if the field looks like a day-of-week specifier (named days or
 * numeric dow 0-7). Used to distinguish Quartz 6-field (last=dow) from
 * AWS 6-field (last=year).
 * Examples: "MON-FRI", "1-5", "SUN", "7", "MON,WED,FRI", "step/2"
 * NOT DOW: "*", "?", "2027", "2025-2030"
 */
function looksLikeDow(field: string): boolean {
  // Contains named day abbreviations (SUN/MON/TUE/WED/THU/FRI/SAT)
  if (/\b(SUN|MON|TUE|WED|THU|FRI|SAT)\b/i.test(field)) return true;
  // Pure numeric (single digit 0-7, or range like 1-5, or list like 1,3,5, or step like */2)
  // but NOT a 4-digit year
  if (/^\d{4}$/.test(field)) return false;
  // Looks like numeric dow: digits 0-7 with optional range/list/step operators
  if (/^[0-7*?][0-7,\-/*]*$/.test(field) && field !== "*" && field !== "?") return true;
  return false;
}

/**
 * Auto-detect the cron dialect from a field array.
 * Rules:
 *  - 5 fields -> Unix
 *  - 7 fields -> Quartz (sec min hour dom month dow year)
 *  - 6 fields:
 *      - If cron() wrapper -> AWS
 *      - If last field is a 4-digit year -> AWS
 *      - If '?' appears in a day field AND last field is NOT a DOW token
 *        (i.e. last field is '*', '?', or year-like) -> AWS
 *        AWS layout: min hour dom month dow year
 *        Quartz layout: sec min hour dom month dow
 *        When AWS: field[2]=dom or field[4]=dow can have '?'; field[5]=year ('*'/'?'/YYYY)
 *        When Quartz: field[3]=dom or field[5]=dow can have '?'; field[5] being a DOW
 *        token (named days or 0-7 numeric) confirms Quartz.
 *      - Otherwise -> Quartz (default for ambiguous 6-field)
 *
 * Spec examples must classify as:
 *   "0 0 9 ? * MON-FRI"  → Quartz (last=MON-FRI is DOW token)
 *   "0 9 ? * MON-FRI *"  → AWS    (has '?' in dom pos, last='*' is year-like, not DOW)
 *   "step/30 * * * * *"  → Quartz (no '?', last='*' but no AWS indicator)
 *   "0 0 9 * * MON-FRI"  → Quartz (no '?', last=DOW token)
 */
export function detectDialect(
  fields: string[],
  awsWrapped = false
): { dialect: Dialect; reason: string } {
  const count = fields.length;

  if (count === 5) {
    return { dialect: "unix", reason: "5 fields — standard Unix cron" };
  }

  if (count === 7) {
    return {
      dialect: "quartz",
      reason: "7 fields with leading seconds and trailing year — Quartz/Spring",
    };
  }

  if (count === 6) {
    if (awsWrapped) {
      return {
        dialect: "aws",
        reason: "cron() wrapper detected — AWS EventBridge",
      };
    }

    const lastField = fields[5];

    // 4-digit year in last field → definitively AWS
    if (/^\d{4}$/.test(lastField)) {
      return {
        dialect: "aws",
        reason: "6 fields with trailing 4-digit year — AWS EventBridge",
      };
    }

    // '?' in an AWS day position + last field is year-like (not a DOW token) → AWS
    // AWS layout: min(0) hour(1) dom(2) month(3) dow(4) year(5)
    // '?' in AWS day positions: index 2 (dom) or index 4 (dow)
    // Quartz layout: sec(0) min(1) hour(2) dom(3) month(4) dow(5)
    // '?' in Quartz positions: index 3 (dom) or index 5 (dow=last field)
    //
    // Key insight: if '?' appears ONLY at index 5 (last field), it CANNOT be an
    // AWS day position (AWS day positions are index 2 and 4). It must be Quartz
    // dow (index 5). So only classify as AWS when '?' appears at index 2 or 4
    // AND the last field (index 5) is year-like (not a DOW token).
    const hasAwsDayQuestionMark = fields[2].includes("?") || fields[4].includes("?");
    if (hasAwsDayQuestionMark && !looksLikeDow(lastField) && looksLikeYear(lastField)) {
      return {
        dialect: "aws",
        reason:
          "6 fields with '?' in AWS day-of-month or day-of-week position and year-like trailing field — AWS EventBridge",
      };
    }

    // Default: Quartz (6-field with leading seconds)
    return {
      dialect: "quartz",
      reason:
        "6 fields with leading seconds field — read as Quartz/Spring (default for ambiguous 6-field)",
    };
  }

  // Fallback — will fail in parsing
  return { dialect: "unix", reason: `${count} fields — not a recognized format` };
}

/**
 * For Quartz dialect, normalize the expression for cronstrue and cron-parser.
 * Returns { cronstrueExpr, parserExpr, useSeconds, yearConstraint }.
 * For 7-field (with year), cronstrue supports 7 fields natively.
 * cron-parser doesn't support year, so we strip it for computation but
 * use the full string for display.
 */
function normalizeQuartz(fields: string[]): {
  cronstrueExpr: string;
  parserExpr: string;
  useSeconds: boolean;
  yearConstraint: number[] | null;
} {
  if (fields.length === 7) {
    // sec min hour dom month dow year
    // cronstrue supports 7-field Quartz
    const cronstrueExpr = fields.join(" ");
    // cron-parser: drop the year field (index 6), keep sec..dow
    const parserFields = fields.slice(0, 6);
    const yearConstraint = parseYearConstraint(fields[6]);
    return { cronstrueExpr, parserExpr: parserFields.join(" "), useSeconds: true, yearConstraint };
  }
  // 6-field Quartz: sec min hour dom month dow — no year field
  const expr = fields.join(" ");
  return { cronstrueExpr: expr, parserExpr: expr, useSeconds: true, yearConstraint: null };
}

/**
 * For AWS EventBridge dialect, normalize the expression.
 * AWS: min hour dom month dow year (6-field, or 5-field if year omitted).
 * Strip year for computation; for cronstrue use the 5-field version.
 */
function normalizeAws(fields: string[]): {
  cronstrueExpr: string;
  parserExpr: string;
  useSeconds: boolean;
  yearConstraint: number[] | null;
} {
  // AWS 6-field: min hour dom month dow year — drop year (last field)
  const withoutYear = fields.length === 6 ? fields.slice(0, 5) : fields;
  const expr = withoutYear.join(" ");
  const yearConstraint = fields.length === 6 ? parseYearConstraint(fields[5]) : null;
  return { cronstrueExpr: expr, parserExpr: expr, useSeconds: false, yearConstraint };
}

/**
 * Explain a cron expression in the given dialect and compute its next `count`
 * run times. Throws CronError with a human-readable message for anything
 * invalid.
 *
 * @param tz  IANA timezone string (e.g. "America/New_York"). Defaults to "UTC".
 *            Invalid/unknown values fall back to UTC silently.
 * @param dialect  Force a specific dialect. If "auto", detect automatically.
 */
export function explainCron(
  input: string,
  count = 5,
  from: Date = new Date(),
  tz = "UTC",
  dialect: Dialect | "auto" = "auto"
): CronExplanation {
  const expression = input.trim();
  if (!expression) {
    throw new CronError("Enter a cron expression.");
  }

  let normalized = expression;
  let resolvedDialect: Dialect = "unix";
  let useSeconds = false;
  let yearConstraint: number[] | null = null;

  // --- Handle @macros (always Unix) ---
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
    resolvedDialect = "unix";
    useSeconds = false;
  } else {
    // --- Strip AWS cron() wrapper if present ---
    let awsWrapped = false;
    let workingExpr = expression;
    const awsWrapperMatch = /^cron\((.+)\)$/i.exec(workingExpr.trim());
    if (awsWrapperMatch) {
      workingExpr = awsWrapperMatch[1].trim();
      awsWrapped = true;
    }

    const fields = workingExpr.split(/\s+/);
    const fieldCount = fields.length;

    // --- Reject clearly invalid field counts ---
    // Valid: 5 (Unix), 6 (Quartz or AWS), 7 (Quartz with year)
    if (fieldCount < 5 || fieldCount > 7) {
      const hint =
        fieldCount < 5
          ? ` Expected at least 5 fields: minute hour day-of-month month day-of-week.`
          : ` Maximum 7 fields supported (Quartz with year).`;
      throw new CronError(
        `Not a valid cron expression: it has ${fieldCount} field${
          fieldCount === 1 ? "" : "s"
        }.${hint}`
      );
    }

    // --- Determine the dialect ---
    if (dialect === "auto") {
      const { dialect: detected } = detectDialect(fields, awsWrapped);
      resolvedDialect = detected;
    } else {
      resolvedDialect = dialect;
    }

    // --- Normalize based on dialect ---
    if (resolvedDialect === "unix") {
      if (fieldCount !== 5) {
        // User forced Unix on a non-5-field expression — provide a helpful error
        const hint =
          fieldCount === 6
            ? " 6-field (seconds) syntax is not supported in Unix mode — use standard 5-field cron (minute hour day-of-month month day-of-week)."
            : ` Unix cron uses exactly 5 fields; this expression has ${fieldCount}.`;
        throw new CronError(
          `Not a valid cron expression: it has ${fieldCount} field${
            fieldCount === 1 ? "" : "s"
          }.${hint}`
        );
      }
      normalized = workingExpr;
      useSeconds = false;
    } else if (resolvedDialect === "quartz") {
      if (fieldCount < 6 || fieldCount > 7) {
        throw new CronError(
          `Not a valid Quartz expression: expected 6 or 7 fields (sec min hour dom month dow [year]), got ${fieldCount}.`
        );
      }
      const q = normalizeQuartz(fields);
      normalized = q.parserExpr;
      useSeconds = q.useSeconds;
      yearConstraint = q.yearConstraint;
      // Use cronstrueExpr for description (set below)
    } else if (resolvedDialect === "aws") {
      if (fieldCount !== 6) {
        throw new CronError(
          `Not a valid AWS EventBridge expression: expected 6 fields (min hour dom month dow year), got ${fieldCount}.`
        );
      }
      const a = normalizeAws(fields);
      normalized = a.parserExpr;
      useSeconds = a.useSeconds;
      yearConstraint = a.yearConstraint;
    }
  }

  // Validate the tz string; fall back to UTC if it's unrecognised.
  let resolvedTz = "UTC";
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    resolvedTz = tz;
  } catch {
    // invalid tz — silently fall back to UTC
  }

  let description: string;
  let next: Date[];
  let yearNote: string | undefined;
  try {
    // For cronstrue, use the original (pre-parser-normalization) form for Quartz 7-field
    let cronstrueInput = normalized;
    if (resolvedDialect === "quartz") {
      const fields =
        expression.startsWith("@")
          ? undefined
          : expression.split(/\s+/);
      if (fields && (fields.length === 6 || fields.length === 7)) {
        cronstrueInput = fields.join(" ");
      }
    } else if (resolvedDialect === "aws") {
      // Already normalized to 5-field for cronstrue
    }

    description = cronstrue.toString(cronstrueInput);

    const interval = CronExpressionParser.parse(normalized, {
      currentDate: from,
      tz: resolvedTz,
      ...(useSeconds ? { useSeconds: true } : {}),
    });

    if (yearConstraint && yearConstraint.length > 0) {
      // Walk forward collecting candidates that fall in the allowed year set.
      // Start cron-parser from whichever is later: `from` or just before Jan 1 of minYear.
      // This avoids iterating thousands of times to reach a far-future year.
      const yearSet = new Set(yearConstraint);
      const minYear = Math.min(...yearConstraint);
      const maxYear = Math.max(...yearConstraint);

      // If the min year is in the future relative to `from`, start just before Jan 1 of that year.
      const yearStart = new Date(Date.UTC(minYear, 0, 1, 0, 0, 0) - 1);
      const effectiveFrom = yearStart > from ? yearStart : from;

      // Re-parse from the effective start date
      const yearInterval = CronExpressionParser.parse(normalized, {
        currentDate: effectiveFrom,
        tz: resolvedTz,
        ...(useSeconds ? { useSeconds: true } : {}),
      });

      next = [];
      // Only need to walk within the year window; max ~366 iterations per year
      const maxIterations = (maxYear - minYear + 1) * 400;
      let iterations = 0;
      while (next.length < count && iterations < maxIterations) {
        iterations++;
        let candidate: Date;
        try {
          candidate = yearInterval.next().toDate();
        } catch {
          break; // cron-parser exhausted
        }
        const candidateYear = candidate.getUTCFullYear();
        if (candidateYear > maxYear) break; // past the year window
        if (yearSet.has(candidateYear)) {
          next.push(candidate);
        }
      }
      if (next.length === 0) {
        const yearLabel = yearConstraint.length === 1
          ? String(yearConstraint[0])
          : `${minYear}–${maxYear}`;
        yearNote = `No upcoming runs — ${yearLabel} is in the past`;
      }
    } else {
      next = [];
      for (let i = 0; i < count; i++) {
        next.push(interval.next().toDate());
      }
    }
  } catch (e) {
    throw new CronError(`Not a valid cron expression: ${reasonFrom(e)}`);
  }

  // Make midnight explicit so "@daily" reads as a midnight schedule.
  description = description.replace(/^At 12:00 AM/, "At 12:00 AM (midnight)");

  return { expression, description, next, dialect: resolvedDialect, yearNote };
}

/**
 * Return the most recent past run time for a cron expression, or null if it
 * cannot be determined. Best-effort; never throws.
 */
export function prevCronRun(
  input: string,
  from: Date = new Date(),
  tz = "UTC",
  dialect: Dialect | "auto" = "auto"
): Date | null {
  try {
    const expression = input.trim();
    let normalized = expression;
    let useSeconds = false;
    let resolvedDialect: Dialect = "unix";

    if (expression.startsWith("@")) {
      const macro = MACROS[expression.toLowerCase()];
      if (!macro) return null;
      normalized = macro;
    } else {
      let awsWrapped = false;
      let workingExpr = expression;
      const awsWrapperMatch = /^cron\((.+)\)$/i.exec(workingExpr.trim());
      if (awsWrapperMatch) {
        workingExpr = awsWrapperMatch[1].trim();
        awsWrapped = true;
      }
      const fields = workingExpr.split(/\s+/);
      const fieldCount = fields.length;
      if (fieldCount < 5 || fieldCount > 7) return null;

      if (dialect === "auto") {
        const { dialect: detected } = detectDialect(fields, awsWrapped);
        resolvedDialect = detected;
      } else {
        resolvedDialect = dialect;
      }

      if (resolvedDialect === "unix") {
        if (fieldCount !== 5) return null;
        normalized = workingExpr;
      } else if (resolvedDialect === "quartz") {
        if (fieldCount < 6 || fieldCount > 7) return null;
        const q = normalizeQuartz(fields);
        normalized = q.parserExpr;
        useSeconds = q.useSeconds;
      } else if (resolvedDialect === "aws") {
        if (fieldCount !== 6) return null;
        const a = normalizeAws(fields);
        normalized = a.parserExpr;
        useSeconds = a.useSeconds;
      }
    }

    let resolvedTz = "UTC";
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      resolvedTz = tz;
    } catch { /* invalid tz */ }

    const interval = CronExpressionParser.parse(normalized, {
      currentDate: from,
      tz: resolvedTz,
      ...(useSeconds ? { useSeconds: true } : {}),
    });
    return interval.prev().toDate();
  } catch {
    return null;
  }
}

/**
 * Returns true when the expression uses features that cannot be represented
 * in the target dialect, along with a human-readable reason.
 */
function hasSubMinuteSeconds(fields: string[], isQuartz: boolean): boolean {
  if (!isQuartz) return false;
  if (fields.length < 6) return false;
  // First field is seconds; if it's not "0", there are sub-minute runs
  const secondsField = fields[0];
  return secondsField !== "0";
}

function hasQuartzOnlyTokens(fields: string[]): boolean {
  // L, W, # can appear in Quartz/AWS but not Unix
  return fields.some((f) => /[LW#]/.test(f));
}

export interface TranslateResult {
  expression: string | null;
  /** null when translation is clean; a message when features can't map */
  warning: string | null;
}

/**
 * Translate a cron expression from one dialect to another.
 * Returns the translated expression, or a warning when translation is
 * impossible (e.g. sub-minute seconds -> Unix).
 */
export function translateCron(
  input: string,
  fromDialect: Dialect,
  toDialect: Dialect
): TranslateResult {
  if (fromDialect === toDialect) {
    return { expression: input.trim(), warning: null };
  }

  const expression = input.trim();

  // Strip AWS cron() wrapper
  let workingExpr = expression;
  const awsWrapperMatch = /^cron\((.+)\)$/i.exec(workingExpr);
  if (awsWrapperMatch) {
    workingExpr = awsWrapperMatch[1].trim();
  }

  // Handle @macros (always Unix) — expand before translating
  if (workingExpr.startsWith("@")) {
    const macro = MACROS[workingExpr.toLowerCase()];
    if (!macro) return { expression: null, warning: "Unknown @macro; cannot translate." };
    workingExpr = macro;
  }

  const fields = workingExpr.split(/\s+/);

  // --- Translate Unix -> Quartz ---
  if (fromDialect === "unix" && toDialect === "quartz") {
    if (fields.length !== 5) {
      return { expression: null, warning: "Cannot translate: unexpected field count for Unix expression." };
    }
    // Unix: min hour dom month dow
    // Quartz: sec(0) min hour dom month dow
    const [min, hour, dom, month, dow] = fields;
    // Replace numeric dow ranges with names for idiomatic Quartz
    const quartzDow = convertUnixDowToQuartz(dow);
    // If dom is *, use ? in dow position (Quartz requires one of dom/dow to be ?)
    let quartzDom = dom;
    let quartzDowField = quartzDow;
    if (dom === "*") {
      quartzDom = "?";
    } else if (dow === "*") {
      quartzDowField = "?";
    }
    return {
      expression: `0 ${min} ${hour} ${quartzDom} ${month} ${quartzDowField}`,
      warning: null,
    };
  }

  // --- Translate Unix -> AWS ---
  if (fromDialect === "unix" && toDialect === "aws") {
    if (fields.length !== 5) {
      return { expression: null, warning: "Cannot translate: unexpected field count for Unix expression." };
    }
    const [min, hour, dom, month, dow] = fields;
    const awsDow = convertUnixDowToQuartz(dow); // AWS uses same DOW names as Quartz
    let awsDom = dom;
    let awsDowField = awsDow;
    if (dom === "*") {
      awsDom = "?";
    } else if (dow === "*") {
      awsDowField = "?";
    }
    return {
      expression: `${min} ${hour} ${awsDom} ${month} ${awsDowField} *`,
      warning: null,
    };
  }

  // --- Translate Quartz -> Unix ---
  if (fromDialect === "quartz" && toDialect === "unix") {
    if (fields.length < 6) {
      return { expression: null, warning: "Cannot translate: unexpected field count for Quartz expression." };
    }
    const [sec, min, hour, dom, month, dow] = fields;
    // Sub-minute seconds cannot be represented in Unix
    if (hasSubMinuteSeconds(fields, true)) {
      return {
        expression: null,
        warning: "Sub-minute seconds can't be represented in Unix 5-field cron.",
      };
    }
    if (hasQuartzOnlyTokens([dom, month, dow])) {
      return {
        expression: null,
        warning: "L, W, or # tokens can't be represented in Unix 5-field cron.",
      };
    }
    void sec;
    // Replace ? with * in dom/dow
    const unixDom = dom === "?" ? "*" : dom;
    const unixDow = dow === "?" ? "*" : convertQuartzDowToUnix(dow);
    return { expression: `${min} ${hour} ${unixDom} ${month} ${unixDow}`, warning: null };
  }

  // --- Translate Quartz -> AWS ---
  if (fromDialect === "quartz" && toDialect === "aws") {
    if (fields.length < 6) {
      return { expression: null, warning: "Cannot translate: unexpected field count for Quartz expression." };
    }
    if (hasSubMinuteSeconds(fields, true)) {
      return {
        expression: null,
        warning: "Sub-minute seconds can't be represented in AWS EventBridge cron (minimum resolution: 1 minute).",
      };
    }
    const [_sec, min, hour, dom, month, dow] = fields;
    void _sec;
    return {
      expression: `${min} ${hour} ${dom} ${month} ${dow} *`,
      warning: null,
    };
  }

  // --- Translate AWS -> Unix ---
  if (fromDialect === "aws" && toDialect === "unix") {
    if (fields.length !== 6) {
      return { expression: null, warning: "Cannot translate: unexpected field count for AWS expression." };
    }
    const [min, hour, dom, month, dow] = fields; // drop year (index 5)
    if (hasQuartzOnlyTokens([dom, month, dow])) {
      return {
        expression: null,
        warning: "L, W, or # tokens can't be represented in Unix 5-field cron.",
      };
    }
    const unixDom = dom === "?" ? "*" : dom;
    const unixDow = dow === "?" ? "*" : convertQuartzDowToUnix(dow);
    return { expression: `${min} ${hour} ${unixDom} ${month} ${unixDow}`, warning: null };
  }

  // --- Translate AWS -> Quartz ---
  if (fromDialect === "aws" && toDialect === "quartz") {
    if (fields.length !== 6) {
      return { expression: null, warning: "Cannot translate: unexpected field count for AWS expression." };
    }
    const [min, hour, dom, month, dow] = fields; // drop year (index 5)
    return {
      expression: `0 ${min} ${hour} ${dom} ${month} ${dow}`,
      warning: null,
    };
  }

  return { expression: null, warning: "Translation between these dialects is not supported." };
}

/** Convert Unix numeric day-of-week to Quartz/AWS named form (e.g. "1-5" -> "MON-FRI"). */
function convertUnixDowToQuartz(dow: string): string {
  if (dow === "*") return "*";
  if (dow === "?") return "?";
  const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  // Replace numeric ranges like 1-5 -> MON-FRI
  return dow.replace(/\b([0-6])(?:-([0-6]))?\b/g, (_match, a, b) => {
    const nameA = DAY_NAMES[parseInt(a, 10)];
    if (b !== undefined) {
      const nameB = DAY_NAMES[parseInt(b, 10)];
      return `${nameA}-${nameB}`;
    }
    return nameA;
  });
}

/** Convert Quartz/AWS named day-of-week back to numeric (e.g. "MON-FRI" -> "1-5"). */
function convertQuartzDowToUnix(dow: string): string {
  if (dow === "*") return "*";
  if (dow === "?") return "*";
  const NAME_TO_NUM: Record<string, string> = {
    SUN: "0", MON: "1", TUE: "2", WED: "3", THU: "4", FRI: "5", SAT: "6",
  };
  return dow.replace(/\b(SUN|MON|TUE|WED|THU|FRI|SAT)\b/gi, (m) => {
    return NAME_TO_NUM[m.toUpperCase()] ?? m;
  });
}
