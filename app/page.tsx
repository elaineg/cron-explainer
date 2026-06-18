import Explainer from "./explainer";
import { decodeExpressionParam } from "@/lib/cron";

type SearchParams = Promise<{ expr?: string; cron?: string; tz?: string; src?: string }>;

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const raw = sp.expr ?? sp.cron;
  const initialExpression = raw ? decodeExpressionParam(raw) : undefined;

  // ?tz= = display timezone (legacy "UTC" or any IANA; "local" = omitted)
  const initialDisplayTz = sp.tz ? sp.tz : undefined;
  // ?src= = source/execution timezone (any IANA; "local" = omitted)
  const initialSrcTz = sp.src ? sp.src : undefined;

  return (
    <Explainer
      initialExpression={initialExpression}
      initialDisplayTz={initialDisplayTz}
      initialSrcTz={initialSrcTz}
    />
  );
}
