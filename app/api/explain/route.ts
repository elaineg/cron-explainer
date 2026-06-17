import { NextRequest, NextResponse } from "next/server";
import { explainCron, CronError, Dialect } from "@/lib/cron";

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
  const dialectParam = request.nextUrl.searchParams.get("dialect");

  if (expr === null || expr.trim() === "") {
    return NextResponse.json(
      { error: "Missing required query parameter: expr" },
      { status: 400 }
    );
  }

  // If tz is present but not a valid IANA timezone, return 400.
  // Only default to UTC when tz is absent.
  if (tzParam !== null && !isValidIANATimezone(tzParam)) {
    return NextResponse.json(
      { error: `Unknown timezone: ${tzParam}` },
      { status: 400 }
    );
  }
  const tz = tzParam ?? "UTC";

  // Optional dialect override — must be one of the supported values
  let dialect: Dialect | "auto" = "auto";
  if (dialectParam !== null) {
    if (dialectParam === "unix" || dialectParam === "quartz" || dialectParam === "aws") {
      dialect = dialectParam;
    } else {
      return NextResponse.json(
        { error: `Unknown dialect: "${dialectParam}". Supported: unix, quartz, aws.` },
        { status: 400 }
      );
    }
  }

  try {
    const { expression, description, next, yearNote } = explainCron(
      expr,
      5,
      new Date(),
      tz,
      dialect
    );
    return NextResponse.json({
      expression,
      description,
      next: next.map((d) => d.toISOString()),
      ...(yearNote ? { yearNote } : {}),
    });
  } catch (e) {
    const message =
      e instanceof CronError ? e.message : "Not a valid cron expression.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
