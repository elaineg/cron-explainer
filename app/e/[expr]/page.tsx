import type { Metadata } from "next";
import Explainer, { type ServerExplanation } from "@/app/explainer";
import { explainCron, decodeExpressionParam, CronError } from "@/lib/cron";

// Next run times depend on the request time, so this page must be rendered
// per request, never statically cached.
export const dynamic = "force-dynamic";

type Params = Promise<{ expr: string }>;
type SearchParams = Promise<{ tz?: string; src?: string }>;

function explain(raw: string): {
  expression: string;
  serverResult: ServerExplanation | null;
  serverError: string | null;
} {
  const expression = decodeExpressionParam(raw);
  try {
    const { description, next } = explainCron(expression, 5, new Date());
    return {
      expression,
      serverResult: {
        description,
        nextIso: next.map((d) => d.toISOString()),
      },
      serverError: null,
    };
  } catch (e) {
    return {
      expression,
      serverResult: null,
      serverError:
        e instanceof CronError ? e.message : "Not a valid cron expression.",
    };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { expr } = await params;
  const expression = decodeExpressionParam(expr);
  return { title: `${expression} — Cron Explainer` };
}

export default async function PermalinkPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { expr } = await params;
  const sp = await searchParams;
  const { expression, serverResult, serverError } = explain(expr);

  // ?tz= = display timezone (legacy "UTC" or any IANA; omitted = local)
  const initialDisplayTz = sp.tz ? sp.tz : undefined;
  // ?src= = source/execution timezone (any IANA; omitted = local)
  const initialSrcTz = sp.src ? sp.src : undefined;

  return (
    <Explainer
      initialExpression={expression}
      serverResult={serverResult}
      serverError={serverError}
      initialDisplayTz={initialDisplayTz}
      initialSrcTz={initialSrcTz}
    />
  );
}
