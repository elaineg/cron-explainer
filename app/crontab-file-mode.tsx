"use client";

import { useMemo, useState, useCallback } from "react";
import { explainCron, CronError, Dialect } from "@/lib/cron";

// ---------- line classifier ----------

export type LineKind = "blank" | "comment" | "env" | "job" | "invalid";

export interface ClassifiedLine {
  kind: LineKind;
  raw: string;
  /** ENV only */
  envKey?: string;
  envValue?: string;
  /** JOB + INVALID: the cron expression extracted (for job = the whole line minus trailing command) */
  jobExpr?: string;
  /** COMMENT: text after '#' */
  commentText?: string;
}

/**
 * Classify a single crontab line.
 * Rules (per APP_SPEC binding):
 *   blank/whitespace-only → BLANK
 *   first non-whitespace char '#' → COMMENT
 *   matches ^\s*[A-Za-z_][A-Za-z0-9_]*\s*= → ENV
 *   else → JOB (fed verbatim to explainCron; on error → INVALID)
 * The "JOB expr" is the first whitespace-delimited token cluster that looks like a cron
 * expression (up to 5–7 fields), with any trailing command words stripped.
 * Handles CRLF, leading/trailing whitespace, @macros, env values with '=' in them.
 */
export function classifyLine(raw: string): ClassifiedLine {
  // Normalize CRLF
  const line = raw.replace(/\r$/, "");

  // BLANK
  if (/^\s*$/.test(line)) {
    return { kind: "blank", raw: line };
  }

  // COMMENT: first non-whitespace char is '#'
  if (/^\s*#/.test(line)) {
    const commentText = line.replace(/^\s*#\s?/, "");
    return { kind: "comment", raw: line, commentText };
  }

  // ENV: ^\s*[A-Za-z_][A-Za-z0-9_]*\s*=
  const envMatch = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
  if (envMatch) {
    return {
      kind: "env",
      raw: line,
      envKey: envMatch[1],
      envValue: envMatch[2],
    };
  }

  // JOB (or INVALID): extract the cron expression from the front of the line.
  // Standard crontab: <expression> <command>. Expression is 5-7 whitespace-separated
  // fields. The rest is a command (starts with / or a word). @macros are a single token.
  //
  // Strategy: take EXACTLY 5 fields for Unix (most common), or 6/7 if it looks like
  // Quartz/AWS. The heuristic: take 5 fields; if the 6th field starts with '*', '?',
  // a digit, or a DOW/month name token (not a path/command), try 6 and maybe 7.
  // If fewer than 5 tokens total, take all (will error gracefully).
  const trimmed = line.trimStart();
  let jobExpr: string;

  if (trimmed.startsWith("@")) {
    // @macro — take just the first token
    jobExpr = trimmed.split(/\s+/)[0];
  } else {
    const tokens = trimmed.split(/\s+/);
    if (tokens.length < 5) {
      // Take all tokens — will fail validation
      jobExpr = tokens.join(" ");
    } else {
      // Start with 5 fields (standard Unix cron)
      let fieldCount = 5;
      // Greedily extend to 6 or 7 if the next tokens look like cron fields (not a command)
      const CRON_FIELD_RE = /^(\*|[*?0-9]|[0-9]{4}|SUN|MON|TUE|WED|THU|FRI|SAT|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i;
      if (tokens.length >= 6 && CRON_FIELD_RE.test(tokens[5])) {
        fieldCount = 6;
        if (tokens.length >= 7 && CRON_FIELD_RE.test(tokens[6])) {
          fieldCount = 7;
        }
      }
      jobExpr = tokens.slice(0, fieldCount).join(" ");
    }
  }

  return { kind: "job", raw: line, jobExpr };
}

/**
 * Parse a full crontab text into classified lines.
 */
export function classifyCrontab(text: string): ClassifiedLine[] {
  return text.split("\n").map(classifyLine);
}

// ---------- sample crontab (exact per spec) ----------

export const SAMPLE_CRONTAB = `# Backup database every night
MAILTO=ops@example.com
0 2 * * * /usr/local/bin/backup.sh
*/15 9-17 * * MON-FRI /usr/local/bin/poll.sh

@daily /usr/local/bin/rotate-logs.sh
0 9 1 * * /usr/local/bin/send-invoices.sh
61 * * * * /usr/local/bin/broken.sh`;

// ---------- annotated export ----------

export interface AnnotatedExportRow {
  /** The original crontab line (verbatim, CRLF-normalized) */
  original: string;
  /** Only for JOB rows that explain successfully: the annotation comment */
  annotation?: string;
}

/**
 * Build the paste-ready annotated crontab text.
 *
 * Format: original lines are preserved verbatim; after each valid JOB line
 * a `# → <description> (next: <first-run>)` comment is inserted.
 *
 * Example output (3 lines from a 2-job file):
 *   0 2 * * * /usr/local/bin/backup.sh
 *   # → Every day at 2:00 AM (next: Mon, Jun 16, 2026, 02:00 AM)
 *   @daily /usr/local/bin/rotate-logs.sh
 *   # → Every day at midnight (next: Tue, Jun 17, 2026, 12:00 AM)
 *
 * Blank/comment/env/invalid lines pass through unchanged with no annotation added.
 * Separator between adjacent annotation lines and the following original line is a
 * single newline (no double-spacing) so the file looks like an in-place annotation.
 */
export function buildAnnotatedExport(
  text: string,
  evalTz: string,
  displayTz: string
): string {
  const now = new Date();
  const classified = classifyCrontab(text);
  const outputLines: string[] = [];

  for (const line of classified) {
    // Always emit the original line verbatim (CRLF already stripped by classifyLine)
    outputLines.push(line.raw.replace(/\r$/, ""));

    // Only annotate valid JOB lines
    if (line.kind === "job" && line.jobExpr) {
      try {
        const expl = explainCron(line.jobExpr, 1, now, evalTz, "auto");
        const firstRun = expl.next[0];
        const firstRunStr = firstRun
          ? firstRun.toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: displayTz,
            })
          : "unknown";
        // Separator: single space between "→" and description; explicit space between
        // description and "(next:..." to prevent word-run-together bugs
        outputLines.push(
          `# → ${expl.description} (next: ${firstRunStr})`
        );
      } catch {
        // Invalid lines: no annotation appended (they stay as-is)
      }
    }
  }

  // Join with LF newlines — clean for any paste target
  return outputLines.join("\n");
}

// ---------- count summary ----------

interface FileSummary {
  jobs: number;
  envVars: number;
  comments: number;
  invalid: number;
}

// ---------- result types ----------

interface JobResult {
  description: string;
  runs: { iso: string; absolute: string; relative: string }[];
  dialect: Dialect;
}

interface RowResult {
  line: ClassifiedLine;
  /** JOB: success */
  jobResult?: JobResult;
  /** INVALID or JOB that threw */
  error?: string;
  /** The actual kind after trying explainCron (job vs invalid) */
  resolvedKind: LineKind;
}

// ---------- formatting helpers (duplicated from explainer.tsx to stay client-side) ----------

function formatAbsolute(d: Date, tz: string): string {
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });
}

function formatRelative(d: Date, now: Date): string {
  const diffSec = Math.round((d.getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "always" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  if (abs < 86400 * 365)
    return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
  return rtf.format(Math.round(diffSec / (86400 * 365)), "year");
}

// ---------- copy hook ----------

/**
 * Returns [state, copy] where state is "idle" | "copied" | "blocked".
 * Explicit "blocked" state so the UI can show a failure message.
 */
function useCopyButton(): ["idle" | "copied" | "blocked", (text: string) => void] {
  const [state, setState] = useState<"idle" | "copied" | "blocked">("idle");
  const copy = useCallback((text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setState("copied");
        window.setTimeout(() => setState("idle"), 1500);
      })
      .catch(() => {
        setState("blocked");
        window.setTimeout(() => setState("idle"), 2000);
      });
  }, []);
  return [state, copy];
}

// ---------- props ----------

interface CrontabFileModeProps {
  /** Raw crontab text */
  text: string;
  /** Resolved IANA source tz (e.g. "America/New_York") */
  evalTz: string;
  /** Resolved IANA display tz */
  displayTz: string;
  /** Whether the component has hydrated (client-side) */
  hydrated: boolean;
}

// ---------- component ----------

export default function CrontabFileMode({
  text,
  evalTz,
  displayTz,
  hydrated,
}: CrontabFileModeProps) {
  const [wholeFileCopyState, copyWholeFile] = useCopyButton();

  const { rows, summary } = useMemo<{
    rows: RowResult[];
    summary: FileSummary;
  }>(() => {
    if (!hydrated || !text.trim()) {
      return { rows: [], summary: { jobs: 0, envVars: 0, comments: 0, invalid: 0 } };
    }

    const now = new Date();
    const classified = classifyCrontab(text);
    const rows: RowResult[] = classified.map((line) => {
      if (line.kind !== "job") {
        return { line, resolvedKind: line.kind };
      }

      // Attempt to explain the job line
      try {
        const expl = explainCron(line.jobExpr ?? "", 5, now, evalTz, "auto");
        const seenRelative = new Set<string>();
        const runs = expl.next.map((d) => {
          const rel = formatRelative(d, now);
          const relative = seenRelative.has(rel) ? "" : rel;
          seenRelative.add(rel);
          return {
            iso: d.toISOString(),
            absolute: formatAbsolute(d, displayTz),
            relative,
          };
        });
        return {
          line,
          resolvedKind: "job",
          jobResult: {
            description: expl.description,
            runs,
            dialect: expl.dialect,
          },
        };
      } catch (e) {
        const errMsg =
          e instanceof CronError
            ? e.message
            : "Not a valid cron expression: unknown error";
        return {
          line,
          resolvedKind: "invalid",
          error: errMsg,
        };
      }
    });

    const summary: FileSummary = { jobs: 0, envVars: 0, comments: 0, invalid: 0 };
    for (const r of rows) {
      if (r.resolvedKind === "job") summary.jobs++;
      else if (r.resolvedKind === "invalid") summary.invalid++;
      else if (r.resolvedKind === "env") summary.envVars++;
      else if (r.resolvedKind === "comment") summary.comments++;
    }

    return { rows, summary };
  }, [text, evalTz, displayTz, hydrated]);

  const hasResults = hydrated && text.trim().length > 0 && rows.length > 0;

  if (!hydrated) {
    return (
      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
    );
  }

  if (!text.trim()) {
    return (
      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        Paste a crontab above or click &ldquo;Load a sample crontab&rdquo; to see it
        explained line by line.
      </p>
    );
  }

  // Summary label
  const summaryParts: string[] = [];
  if (summary.jobs > 0)
    summaryParts.push(`${summary.jobs} job${summary.jobs !== 1 ? "s" : ""}`);
  if (summary.envVars > 0)
    summaryParts.push(
      `${summary.envVars} environment variable${summary.envVars !== 1 ? "s" : ""}`
    );
  if (summary.comments > 0)
    summaryParts.push(
      `${summary.comments} comment${summary.comments !== 1 ? "s" : ""}`
    );
  if (summary.invalid > 0)
    summaryParts.push(
      `${summary.invalid} invalid line${summary.invalid !== 1 ? "s" : ""}`
    );
  const summaryText = summaryParts.join(" · ");

  return (
    <div className="mt-6" data-testid="crontab-results">
      {/* Summary line + whole-file copy button — only when results exist */}
      <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
        {summaryText && (
          <p
            data-testid="crontab-summary"
            className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
          >
            {summaryText}
          </p>
        )}

        {/* Whole-file copy — only when there are results */}
        {hasResults && (
          <button
            type="button"
            data-testid="copy-annotated-btn"
            aria-label={
              wholeFileCopyState === "copied"
                ? "Copied!"
                : wholeFileCopyState === "blocked"
                ? "Copy blocked"
                : "Copy explained crontab"
            }
            onClick={() =>
              copyWholeFile(buildAnnotatedExport(text, evalTz, displayTz))
            }
            className={`shrink-0 border px-3 py-1.5 text-xs font-semibold transition-all ${
              wholeFileCopyState === "copied"
                ? "border-green-500 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-950 dark:text-green-300"
                : wholeFileCopyState === "blocked"
                ? "border-red-400 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-950 dark:text-red-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-50 hover:bg-zinc-700 dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            }`}
          >
            {wholeFileCopyState === "copied"
              ? "✓ Copied!"
              : wholeFileCopyState === "blocked"
              ? "Copy blocked"
              : "Copy explained crontab"}
          </button>
        )}
      </div>

      {/* Whole-file copy status — visually visible (not sr-only), assertable by e2e */}
      {wholeFileCopyState !== "idle" && (
        <p
          role="status"
          data-testid="copy-annotated-status"
          className={`mb-2 text-xs font-medium ${
            wholeFileCopyState === "copied"
              ? "text-green-700 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {wholeFileCopyState === "copied"
            ? "Annotated crontab copied to clipboard"
            : "Clipboard write was blocked"}
        </p>
      )}

      {/* Rows */}
      <div className="divide-y divide-zinc-200 border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {rows.map((row, idx) => (
          <CrontabRow key={idx} row={row} idx={idx} />
        ))}
      </div>
    </div>
  );
}

const DIALECT_SHORT: Record<Dialect, string> = {
  unix: "Unix",
  quartz: "Quartz",
  aws: "AWS",
};

function CrontabRow({ row, idx }: { row: RowResult; idx: number }) {
  const { line, resolvedKind } = row;
  const [rowCopyState, copyRow] = useCopyButton();

  // BLANK: thin spacer
  if (resolvedKind === "blank") {
    return (
      <div
        key={idx}
        data-testid={`crontab-row-blank-${idx}`}
        className="h-3 bg-zinc-50 dark:bg-zinc-900"
      />
    );
  }

  // COMMENT — visibly dimmed: text-zinc-400 (not zinc-500 or zinc-900)
  if (resolvedKind === "comment") {
    return (
      <div
        data-testid={`crontab-row-comment-${idx}`}
        className="flex items-start gap-3 px-4 py-3"
      >
        <span className="mt-0.5 shrink-0 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 w-14 text-right">
          COMMENT
        </span>
        {/* Craft fix: use text-zinc-400 (dim) so comment rows are visibly lighter than JOB rows */}
        <span className="font-mono text-sm text-zinc-400 dark:text-zinc-600">
          # {line.commentText}
        </span>
      </div>
    );
  }

  // ENV — visibly dimmed: text-zinc-400 on value, key slightly brighter
  if (resolvedKind === "env") {
    return (
      <div
        data-testid={`crontab-row-env-${idx}`}
        className="flex items-start gap-3 px-4 py-3"
      >
        <span className="mt-0.5 shrink-0 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 w-14 text-right">
          ENV
        </span>
        {/* Craft fix: use text-zinc-400 so ENV rows are visibly dimmer than JOB rows */}
        <span className="font-mono text-sm text-zinc-400 dark:text-zinc-600">
          <span className="font-medium text-zinc-500 dark:text-zinc-500">
            {line.envKey}
          </span>
          ={line.envValue}
        </span>
      </div>
    );
  }

  // INVALID
  if (resolvedKind === "invalid") {
    return (
      <div
        data-testid={`crontab-row-invalid-${idx}`}
        className="flex items-start gap-3 px-4 py-3"
      >
        <span className="mt-0.5 shrink-0 text-[10px] font-bold uppercase tracking-widest text-red-500 dark:text-red-500 w-14 text-right">
          INVALID
        </span>
        <div className="min-w-0 flex-1">
          <span className="block font-mono text-sm text-zinc-700 dark:text-zinc-300">
            {line.raw.trim()}
          </span>
          <span
            role="alert"
            className="mt-1 block text-sm text-red-600 dark:text-red-400"
          >
            {row.error ?? "Not a valid cron expression"}
          </span>
        </div>
      </div>
    );
  }

  // JOB (valid)
  const job = row.jobResult!;
  const rowDescription = job.description;

  return (
    <div
      data-testid={`crontab-row-job-${idx}`}
      className="flex items-start gap-3 px-4 py-3"
    >
      <span className="mt-0.5 shrink-0 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 w-14 text-right">
        JOB
      </span>
      <div className="min-w-0 flex-1">
        {/* Raw expression + dialect badge + per-row copy */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {line.jobExpr}
          </span>
          <span className="border border-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-500">
            {DIALECT_SHORT[job.dialect]}
          </span>
          {/* Per-row copy button */}
          <button
            type="button"
            data-testid={`copy-row-btn-${idx}`}
            aria-label={
              rowCopyState === "copied"
                ? "Copied!"
                : rowCopyState === "blocked"
                ? "Copy blocked"
                : "Copy explanation"
            }
            onClick={() => copyRow(rowDescription)}
            className={`ml-auto border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-all ${
              rowCopyState === "copied"
                ? "border-green-500 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-950 dark:text-green-300"
                : rowCopyState === "blocked"
                ? "border-red-400 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-950 dark:text-red-300"
                : "border-zinc-400 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {rowCopyState === "copied"
              ? "✓ Copied"
              : rowCopyState === "blocked"
              ? "Blocked"
              : "Copy"}
          </button>
        </div>
        {/* English description */}
        <p
          data-testid={`crontab-row-description-${idx}`}
          className="mt-1 text-sm text-zinc-700 dark:text-zinc-300"
        >
          {rowDescription}
        </p>
        {/* Per-row copy status (assertable, visually sr-only) */}
        {rowCopyState !== "idle" && (
          <span
            role="status"
            data-testid={`copy-row-status-${idx}`}
            className="sr-only"
          >
            {rowCopyState === "copied" ? "Explanation copied" : "Clipboard write was blocked"}
          </span>
        )}
        {/* Next 5 runs */}
        <ol className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
          {job.runs.map((run) => (
            <li
              key={run.iso}
              className="flex items-baseline justify-between gap-4 py-1"
            >
              <span className="font-mono text-xs text-zinc-800 dark:text-zinc-200">
                {run.absolute}
              </span>
              {run.relative && (
                <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                  {run.relative}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
