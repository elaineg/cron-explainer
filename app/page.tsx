import Explainer from "./explainer";
import { decodeExpressionParam } from "@/lib/cron";

type SearchParams = Promise<{ expr?: string; cron?: string }>;

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const raw = sp.expr ?? sp.cron;
  const initialExpression = raw ? decodeExpressionParam(raw) : undefined;
  return <Explainer initialExpression={initialExpression} />;
}
