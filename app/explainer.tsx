"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { explainCron, prevCronRun, CronError } from "@/lib/cron";
import { englishToCron, EnglishError, EXAMPLE_PHRASES } from "@/lib/english";

const EXAMPLE = "*/15 9-17 * * MON-FRI";

interface RunTime {
  iso: string;
  absolute: string;
  relative: string;
}

interface Result {
  description: string;
  runs: RunTime[];
  prevRun: RunTime | null;
}

/** Server-computed explanation passed in by the /e/[expr] permalink page. */
export interface ServerExplanation {
  description: string;
  nextIso: string[];
}

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

/** Returns [copied state, copy function]. */
function useCopyButton(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  function copy(text: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }
  return [copied, copy];
}

const noopSubscribe = () => () => {};

export default function Explainer({
  initialExpression,
  serverResult,
  serverError,
}: {
  /** Pre-fill the input (permalink page); defaults to the example. */
  initialExpression?: string;
  /** Server-rendered explanation so the permalink HTML already has results. */
  serverResult?: ServerExplanation | null;
  /** Server-rendered parse error for invalid permalink expressions. */
  serverError?: string | null;
}) {
  const [input, setInput] = useState(initialExpression ?? EXAMPLE);
  const [english, setEnglish] = useState("");
  // "local" = browser timezone; "UTC" = UTC
  const [tzMode, setTzMode] = useState<"local" | "UTC">("local");

  const [copiedCron, copyCron] = useCopyButton();
  const [copiedLink, copyLink] = useCopyButton();

  // Derive the generated cron for the English input (no side effects on cron input here)
  const englishResult = useMemo<{
    cron: string | null;
    error: string | null;
  }>(() => {
    if (!english.trim()) return { cron: null, error: null };
    try {
      return { cron: englishToCron(english), error: null };
    } catch (e) {
      return {
        cron: null,
        error:
          e instanceof EnglishError
            ? e.message
            : "Couldn't read that schedule. Try one of the examples below.",
      };
    }
  }, [english]);

  function onEnglishChange(value: string) {
    setEnglish(value);
    if (!value.trim()) return;
    try {
      setInput(englishToCron(value));
    } catch {
      // Not parseable: leave the cron input as-is, but the result region
      // will be suppressed below via englishBlocksResult.
    }
  }

  // Only run client-side (depends on browser tz and current time).
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  const { result, error, timezone, tzLabel } = useMemo<{
    result: Result | null;
    error: string | null;
    timezone: string; // IANA tz passed to cron-parser
    tzLabel: string; // display label in the header
  }>(() => {
    if (!hydrated) {
      if (serverError) {
        return {
          result: null,
          error: serverError,
          timezone: "UTC",
          tzLabel: "UTC",
        };
      }
      if (serverResult) {
        return {
          result: {
            description: serverResult.description,
            runs: serverResult.nextIso.map((iso) => ({
              iso,
              absolute: iso,
              relative: "",
            })),
            prevRun: null,
          },
          error: null,
          timezone: "UTC",
          tzLabel: "UTC",
        };
      }
      return { result: null, error: null, timezone: "UTC", tzLabel: "UTC" };
    }

    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezone = tzMode === "local" ? localTz : "UTC";
    const tzLabel = tzMode === "local" ? localTz : "UTC";

    try {
      const now = new Date();
      const { description, next } = explainCron(input, 5, now, timezone);

      // G: previous run (best-effort)
      let prevRun: RunTime | null = null;
      const prev = prevCronRun(input, now, timezone);
      if (prev) {
        prevRun = {
          iso: prev.toISOString(),
          absolute: formatAbsolute(prev, timezone),
          relative: formatRelative(prev, now),
        };
      }

      // Fix 4b: suppress duplicate relative hints — each run shows its own
      // offset string; if it would repeat a prior run's string, omit it.
      const seenRelative = new Set<string>();
      const runs = next.map((d) => {
        const rel = formatRelative(d, now);
        const relative = seenRelative.has(rel) ? "" : rel;
        seenRelative.add(rel);
        return {
          iso: d.toISOString(),
          absolute: formatAbsolute(d, timezone),
          relative,
        };
      });

      return {
        result: {
          description,
          runs,
          prevRun,
        },
        error: null,
        timezone,
        tzLabel,
      };
    } catch (e) {
      return {
        result: null,
        error:
          e instanceof CronError
            ? e.message
            : "That doesn't look like a valid cron expression — check the number of fields and value ranges.",
        timezone,
        tzLabel,
      };
    }
  }, [input, hydrated, serverResult, serverError, tzMode]);

  const trimmedInput = input.trim();
  const permalinkPath = `/e/${encodeURIComponent(trimmedInput)}`;
  const origin = hydrated ? window.location.origin : "";
  // Append ?tz= when UTC mode so the link is reproducible server-side
  const tzParam = tzMode === "UTC" ? "?tz=UTC" : "";
  const permalinkUrl = `${origin}${permalinkPath}${tzParam}`;

  // Fix 1: when the English field is non-empty and has a parse error, block
  // the result region entirely — a valid cron result must never coexist with
  // an English-parse error on screen.
  const englishBlocksResult = !!(english.trim() && englishResult.error);

  const isValid = !error && result !== null && !englishBlocksResult;

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-12 font-sans dark:bg-zinc-950 sm:py-20">
      <main className="w-full max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          <Link href="/">Cron Explainer</Link>
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Paste a cron expression and see what it means in plain English, plus
          its next 5 run times — or describe a schedule in English and get the
          cron expression generated for you.
        </p>

        {/* Cron expression input + B: copy button */}
        <label
          htmlFor="cron-input"
          className="mt-8 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Cron expression
        </label>
        <div className="relative mt-2">
          <input
            id="cron-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder={EXAMPLE}
            className={`w-full rounded-lg border bg-white px-4 py-3 pr-24 font-mono text-lg text-zinc-900 shadow-sm outline-none transition-colors focus:ring-2 dark:bg-zinc-900 dark:text-zinc-100 ${
              error
                ? "border-red-400 focus:ring-red-300 dark:border-red-600"
                : "border-zinc-300 focus:ring-blue-300 dark:border-zinc-700"
            }`}
          />
          {/* B: Copy cron button — only when valid; shows unmistakable ✓ Copied! for ~1.5s */}
          {isValid && (
            <button
              type="button"
              onClick={() => copyCron(trimmedInput)}
              title={copiedCron ? "Copied!" : "Copy cron expression"}
              aria-label={copiedCron ? "Copied!" : "Copy cron expression"}
              className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md border px-2 py-1.5 text-xs font-semibold shadow-sm transition-all ${
                copiedCron
                  ? "border-green-500 bg-green-100 text-green-800 ring-1 ring-green-400 dark:border-green-500 dark:bg-green-900 dark:text-green-200 dark:ring-green-500"
                  : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {copiedCron ? "✓ Copied!" : "Copy"}
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
          Standard 5-field cron (minute hour day-of-month month day-of-week)
          plus @hourly, @daily, @weekly, @monthly, @yearly.
        </p>

        {/* English-to-cron input */}
        <label
          htmlFor="english-input"
          className="mt-6 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Or describe a schedule in plain English
        </label>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
          Describe a schedule in plain English.
        </p>
        <input
          id="english-input"
          type="text"
          value={english}
          onChange={(e) => onEnglishChange(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          placeholder={EXAMPLE_PHRASES[0]}
          className={`mt-2 w-full rounded-lg border bg-white px-4 py-3 text-lg text-zinc-900 shadow-sm outline-none transition-colors focus:ring-2 dark:bg-zinc-900 dark:text-zinc-100 ${
            englishResult.error
              ? "border-amber-400 focus:ring-amber-300 dark:border-amber-600"
              : "border-zinc-300 focus:ring-blue-300 dark:border-zinc-700"
          }`}
        />

        {/* D: Clickable example chips */}
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLE_PHRASES.map((phrase) => (
            <button
              key={phrase}
              type="button"
              onClick={() => onEnglishChange(phrase)}
              className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-blue-500 dark:hover:bg-blue-950 dark:hover:text-blue-300"
            >
              {phrase}
            </button>
          ))}
        </div>

        {englishResult.cron && (
          <p
            data-testid="generated-cron"
            className="mt-2 text-sm text-zinc-600 dark:text-zinc-400"
          >
            Generated:{" "}
            <span className="font-mono text-zinc-900 dark:text-zinc-100">
              {englishResult.cron}
            </span>
          </p>
        )}
        {/* E: friendly English error with specific copy */}
        {englishResult.error && (
          <div
            role="status"
            data-testid="english-error"
            className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
          >
            {englishResult.error}
          </div>
        )}

        {/* E: Cron parse error (clears result below). Hidden when English error already blocks. */}
        {error && !englishBlocksResult && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          >
            {error}
          </div>
        )}

        {/* Results sections — only rendered when isValid (E: no stale result on error) */}
        {isValid && result && (
          <>
            <section className="mt-6 rounded-lg border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                In plain English
              </h2>
              <p className="mt-1 text-lg text-zinc-900 dark:text-zinc-100">
                {result.description}
              </p>
            </section>

            <section className="mt-4 rounded-lg border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              {/* C: Timezone selector in section header */}
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Next 5 runs &mdash;{" "}
                  <span className="font-normal normal-case">{tzLabel || "…"}</span>
                </h2>
                <div className="flex overflow-hidden rounded-md border border-zinc-300 text-xs dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setTzMode("local")}
                    className={`px-2.5 py-1 font-medium transition-colors ${
                      tzMode === "local"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    }`}
                  >
                    Local
                  </button>
                  <button
                    type="button"
                    onClick={() => setTzMode("UTC")}
                    className={`border-l border-zinc-300 px-2.5 py-1 font-medium transition-colors dark:border-zinc-700 ${
                      tzMode === "UTC"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    }`}
                  >
                    UTC
                  </button>
                </div>
              </div>

              {/* G: Previous run, muted, for incident triage */}
              {result.prevRun && (
                <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                  Previous run:{" "}
                  <span className="font-mono">{result.prevRun.absolute}</span>{" "}
                  ({result.prevRun.relative})
                </p>
              )}

              <ol className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
                {result.runs.map((run) => (
                  <li
                    key={run.iso}
                    className="flex items-baseline justify-between gap-4 py-2"
                  >
                    <span className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
                      {run.absolute}
                    </span>
                    <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                      {run.relative}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            {/* F: Always-visible permalink row when valid */}
            <section className="mt-4 rounded-lg border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Permalink
              </h2>
              <div className="mt-2 flex items-center gap-3">
                <a
                  href={permalinkPath + tzParam}
                  data-testid="permalink"
                  className="min-w-0 flex-1 truncate font-mono text-sm text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                >
                  {permalinkUrl}
                </a>
                {/* B: Copy link button with "Copied!" confirmation */}
                <button
                  type="button"
                  onClick={() => copyLink(permalinkUrl)}
                  className={`shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors ${
                    copiedLink
                      ? "border-green-400 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-950 dark:text-green-300"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {copiedLink ? "✓ Copied!" : "Copy link"}
                </button>
              </div>
            </section>
          </>
        )}

        {!error && !result && !englishBlocksResult && (
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
            Parsing…
          </p>
        )}

        {/* Fix 4a: API/Developers section — properly styled, not raw text */}
        <footer className="mt-10 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
            Developers
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            <a
              href={`/api/explain?expr=${encodeURIComponent(EXAMPLE)}`}
              className="font-mono text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
            >
              GET /api/explain?expr=&lt;url-encoded cron&gt;[&amp;tz=&lt;IANA&gt;]
            </a>{" "}
            — returns JSON with the description and next 5 run times (UTC ISO
            8601). Invalid or absent <code className="font-mono text-xs">tz</code>{" "}
            returns 400.
          </p>
        </footer>
      </main>
    </div>
  );
}
