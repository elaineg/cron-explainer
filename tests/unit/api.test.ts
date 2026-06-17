import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/explain/route";

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

function req(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/explain${query}`);
}

describe("GET /api/explain (route handler)", () => {
  it("returns 200 with expression, description and 5 ISO UTC timestamps", async () => {
    const res = GET(req("?expr=" + encodeURIComponent("*/10 * * * *")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.expression).toBe("*/10 * * * *");
    expect(body.description.toLowerCase()).toContain("every 10 minutes");
    expect(body.next).toHaveLength(5);
    for (const ts of body.next) expect(ts).toMatch(ISO_RE);
    for (let i = 1; i < body.next.length; i++) {
      expect(
        new Date(body.next[i]).getTime() - new Date(body.next[i - 1]).getTime()
      ).toBe(600_000);
    }
  });

  it("returns 400 with an error field for invalid input", async () => {
    const res = GET(req("?expr=banana"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
    expect(body.error).toMatch(/Not a valid cron expression/);
  });

  it("returns 400 for out-of-range values", async () => {
    const res = GET(req("?expr=" + encodeURIComponent("61 * * * *")));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
  });

  it("returns 400 when expr is missing", async () => {
    const res = GET(req(""));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/expr/);
  });

  it("handles @daily via the API", async () => {
    const res = GET(req("?expr=%40daily"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.description.toLowerCase()).toContain("midnight");
    expect(body.next).toHaveLength(5);
  });

  it("DIALECT — Quartz 6-field returns 200 (not 400): 0 0 9 ? * MON-FRI", async () => {
    const res = GET(req("?expr=" + encodeURIComponent("0 0 9 ? * MON-FRI")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.description).toMatch(/09:00|9:00 AM/i);
    expect(body.description).toContain("Monday through Friday");
    expect(body.next).toHaveLength(5);
    for (const ts of body.next) expect(ts).toMatch(ISO_RE);
  });

  it("DIALECT — Quartz seconds: */30 * * * * * returns 200 with 30s-apart timestamps", async () => {
    const res = GET(req("?expr=" + encodeURIComponent("*/30 * * * * *")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.next).toHaveLength(5);
    for (let i = 1; i < body.next.length; i++) {
      expect(
        new Date(body.next[i]).getTime() - new Date(body.next[i - 1]).getTime()
      ).toBe(30_000);
    }
  });

  it("DIALECT — AWS EventBridge cron() wrapper returns 200", async () => {
    const res = GET(req("?expr=" + encodeURIComponent("cron(0 10 * * ? *)")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.next).toHaveLength(5);
  });

  it("DIALECT — forced dialect=quartz param works", async () => {
    const res = GET(req("?expr=" + encodeURIComponent("0 0 9 ? * MON-FRI") + "&dialect=quartz"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.description).toMatch(/09:00|9:00 AM/);
  });

  it("DIALECT — forced dialect=aws param works", async () => {
    const res = GET(req("?expr=" + encodeURIComponent("0 9 ? * MON-FRI *") + "&dialect=aws"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.next).toHaveLength(5);
  });

  it("REGRESSION — 5-field still returns 200 and is unix by default", async () => {
    const res = GET(req("?expr=" + encodeURIComponent("*/10 * * * *")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.description.toLowerCase()).toContain("every 10 minutes");
    expect(body.next).toHaveLength(5);
    // 5-field should not be affected by dialect param
    expect(body.expression).toBe("*/10 * * * *");
  });

  it("returns 400 for an invalid IANA timezone (fix 3)", async () => {
    const res = GET(req("?expr=" + encodeURIComponent("*/10 * * * *") + "&tz=Not%2FA%2FTimezone"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Unknown timezone/);
  });

  it("defaults to UTC when tz is absent (fix 3 — no regression)", async () => {
    const res = GET(req("?expr=" + encodeURIComponent("0 12 * * *")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.next).toHaveLength(5);
    // All timestamps should be UTC noon (hour=12)
    for (const ts of body.next) {
      expect(new Date(ts).getUTCHours()).toBe(12);
    }
  });

  it("BLOCKER-2 — 0 0 12 * * ? auto-detects as Quartz and returns noon description (not '12:00 AM day 12')", async () => {
    const res = GET(req("?expr=" + encodeURIComponent("0 0 12 * * ?")));
    expect(res.status).toBe(200);
    const body = await res.json();
    // Must describe noon (12:00 PM / noon), NOT "12:00 AM, on day 12" (wrong AWS parse)
    expect(body.description).toMatch(/12:00 PM|noon/i);
    expect(body.description).not.toMatch(/day 12/i);
    expect(body.next).toHaveLength(5);
  });

  it("BLOCKER-2 — 0 9 ? * MON-FRI * auto-detects as AWS and returns weekday 9am description", async () => {
    const res = GET(req("?expr=" + encodeURIComponent("0 9 ? * MON-FRI *")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.description).toMatch(/09:00|9:00 AM/i);
    expect(body.description).toContain("Monday through Friday");
    expect(body.next).toHaveLength(5);
  });
});
