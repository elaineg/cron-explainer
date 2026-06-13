import { NextRequest, NextResponse } from "next/server";
import { explainCron, CronError } from "@/lib/cron";

export const dynamic = "force-dynamic";

function isValidIANATimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function GET(request: NextRequest) {
  const expr = request.nextUrl.searchParams.get("expr");
  const tzParam = request.nextUrl.searchParams.get("tz");

  if (expr === null || expr.trim() === "") {
    return NextResponse.json(
      { error: "Missing required query parameter: expr" },
      { status: 400 }
    );
  }

  // Fix 3: if tz is present but not a valid IANA timezone, return 400.
  // Only default to UTC when tz is absent.
  if (tzParam !== null && !isValidIANATimezone(tzParam)) {
    return NextResponse.json(
      { error: `Unknown timezone: ${tzParam}` },
      { status: 400 }
    );
  }
  const tz = tzParam ?? "UTC";

  try {
    const { expression, description, next } = explainCron(
      expr,
      5,
      new Date(),
      tz
    );
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
