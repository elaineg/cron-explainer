import { NextRequest, NextResponse } from "next/server";
import { explainCron, CronError } from "@/lib/cron";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const expr = request.nextUrl.searchParams.get("expr");

  if (expr === null || expr.trim() === "") {
    return NextResponse.json(
      { error: "Missing required query parameter: expr" },
      { status: 400 }
    );
  }

  try {
    const { expression, description, next } = explainCron(expr);
    return NextResponse.json({
      expression,
      description,
      next: next.map((d) => d.toISOString()),
    });
  } catch (e) {
    const message =
      e instanceof CronError ? e.message : "Not a valid cron expression.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
