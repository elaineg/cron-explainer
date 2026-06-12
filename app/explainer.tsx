"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { explainCron, CronError } from "@/lib/cron";

const EXAMPLE = "*/15 9-17 * * MON-FRI";

interface RunTime {
  iso: string;
  absolute: string;
  relative: string;
}

interface Result {
  description: string;
  runs: RunTime[];
}

/** Server-computed explanation passed in by the /e/[expr] permalink page. */
export interface ServerExplanation {
  description: string;
  nextIso: string[];
}

function formatAbsolute(d: Date): string {
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
  const [copied, setCopied] = useState(false);

  // Parsing depends on the current time and the browser locale/timezone, so
  // it must only run client-side. This is false during SSR and the initial
  // hydration render, then true (it re-renders immediately after hydration).
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  const { result, error, timezone } = useMemo<{
    result: Result | null;
    error: string | null;
    timezone: string;
  }>(() => {
    if (!hydrated) {
      // SSR + initial hydration render: show the server-computed explanation
      // (UTC ISO times) if the permalink page provided one. After hydration
      // this is replaced by the locally-computed, local-timezone version.
      if (serverError) {
        return { result: null, error: serverError, timezone: "" };
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
          },
          error: null,
          timezone: "UTC",
        };
      }
      return { result: null, error: null, timezone: "" };
    }
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      const now = new Date();
      const { description, next } = explainCron(input, 5, now);
      return {
        result: {
          description,
          runs: next.map((d) => ({
            iso: d.toISOString(),
            absolute: formatAbsolute(d),
            relative: formatRelative(d, now),
          })),
        },
        error: null,
        timezone,
      };
    } catch (e) {
      return {
        result: null,
        error:
          e instanceof CronError ? e.message : "Not a valid cron expression.",
        timezone,
      };
    }
  }, [input, hydrated, serverResult, serverError]);

  const permalinkPath = `/e/${encodeURIComponent(input.trim())}`;
  // window.location is only available client-side; before hydration the
  // permalink renders as a path (the copy button always copies the full URL).
  const origin = hydrated ? window.location.origin : "";
  const permalinkUrl = `${origin}${permalinkPath}`;

  function copyPermalink() {
    const absolute = `${window.location.origin}${permalinkPath}`;
    navigator.clipboard
      .writeText(absolute)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        // Clipboard unavailable (permissions); leave the link selectable.
      });
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-12 font-sans dark:bg-zinc-950 sm:py-20">
      <main className="w-full max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          <Link href="/">Cron Explainer</Link>
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Paste a cron expression and see what it means in plain English, plus
          its next 5 run times.
        </p>

        <label
          htmlFor="cron-input"
          className="mt-8 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Cron expression
        </label>
        <input
          id="cron-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          placeholder={EXAMPLE}
          className={`mt-2 w-full rounded-lg border bg-white px-4 py-3 font-mono text-lg text-zinc-900 shadow-sm outline-none transition-colors focus:ring-2 dark:bg-zinc-900 dark:text-zinc-100 ${
            error
              ? "border-red-400 focus:ring-red-300 dark:border-red-600"
              : "border-zinc-300 focus:ring-blue-300 dark:border-zinc-700"
          }`}
        />
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
          Standard 5-field cron (minute hour day-of-month month day-of-week)
          plus @hourly, @daily, @weekly, @monthly, @yearly.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          >
            {error}
          </div>
        )}

        {!error && result && (
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
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Next 5 runs{" "}
                <span className="font-normal normal-case">
                  (your timezone: {timezone || "…"})
                </span>
              </h2>
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

            <section className="mt-4 rounded-lg border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Share this expression
              </h2>
              <div className="mt-2 flex items-center gap-3">
                <a
                  href={permalinkPath}
                  data-testid="permalink"
                  className="min-w-0 flex-1 truncate font-mono text-sm text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                >
                  {permalinkUrl}
                </a>
                <button
                  type="button"
                  onClick={copyPermalink}
                  className="shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
            </section>
          </>
        )}

        {!error && !result && (
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
            Parsing…
          </p>
        )}

        <p className="mt-10 border-t border-zinc-200 pt-4 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          API:{" "}
          <a
            href={`/api/explain?expr=${encodeURIComponent(EXAMPLE)}`}
            className="font-mono text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
          >
            GET /api/explain?expr=&lt;url-encoded cron&gt;
          </a>{" "}
          returns JSON with the description and next 5 run times (UTC ISO
          8601).
        </p>
      </main>
    </div>
  );
}
