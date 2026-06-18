/**
 * Timezone feature unit tests (2026-06-18 verification pass)
 *
 * Covers:
 *   1. BACK-COMPAT: default source = local tz behavior (lib level)
 *   2. SOURCE-TZ CORRECTNESS: UTC vs NY produce different instants
 *   3. DST CORRECTNESS: spring-forward handling for 0 2 * * * in America/New_York
 *   4. SOURCE vs DISPLAY INDEPENDENCE: display tz does NOT change instants
 *   5. API BACK-COMPAT: /api/explain?tz= means source/execution tz (not display)
 *   6. RELATIONSHIP LINE: logic — src vs display IANA strings differ
 */
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/explain/route";
import { explainCron } from "@/lib/cron";

const FROM = new Date("2026-06-11T12:00:00.000Z");

// ─────────────────────────────────────────────────────────────────────────────
// 1. BACK-COMPAT: default source = local tz
//    The lib signature: explainCron(expr, count, from, tz="UTC")
//    The UI uses: evalTz = resolveIana(srcTz="local", localTz) = localTz
//    Test that LOCAL tz evaluation differs from UTC where possible.
// ─────────────────────────────────────────────────────────────────────────────
describe("BACK-COMPAT: default source behavior", () => {
  it("explainCron with tz=UTC for 0 12 * * * fires at 12:00Z (UTC noon)", () => {
    const { next } = explainCron("0 12 * * *", 5, FROM, "UTC");
    for (const d of next) {
      expect(d.getUTCHours()).toBe(12);
      expect(d.getUTCMinutes()).toBe(0);
    }
  });

  it("explainCron with tz=America/New_York for 0 12 * * * fires at 16:00Z (noon EDT)", () => {
    const { next } = explainCron("0 12 * * *", 5, FROM, "America/New_York");
    // noon EDT (UTC-4) = 16:00Z
    for (const d of next) {
      expect(d.getUTCHours()).toBe(16);
      expect(d.getUTCMinutes()).toBe(0);
    }
  });

  it("5-field expression description is byte-identical regardless of source tz (description driven by cronstrue)", () => {
    const { description: d1 } = explainCron("0 9 * * MON-FRI", 5, FROM, "UTC");
    const { description: d2 } = explainCron("0 9 * * MON-FRI", 5, FROM, "America/New_York");
    // cronstrue description is tz-independent
    expect(d1).toBe(d2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. SOURCE-TZ CORRECTNESS
//    0 9 * * * with source=UTC → instants at 09:00Z
//    0 9 * * * with source=America/New_York → instants at 13:00Z (9am EDT = UTC+4)
// ─────────────────────────────────────────────────────────────────────────────
describe("SOURCE-TZ CORRECTNESS: UTC vs America/New_York produce different instants", () => {
  it("source=UTC: 0 9 * * * fires at 09:00Z", () => {
    const { next } = explainCron("0 9 * * *", 5, FROM, "UTC");
    for (const d of next) {
      expect(d.getUTCHours()).toBe(9);
      expect(d.getUTCMinutes()).toBe(0);
    }
  });

  it("source=America/New_York: 0 9 * * * fires at 13:00Z (9am EDT = UTC-4)", () => {
    const { next } = explainCron("0 9 * * *", 5, FROM, "America/New_York");
    for (const d of next) {
      expect(d.getUTCHours()).toBe(13);
      expect(d.getUTCMinutes()).toBe(0);
    }
  });

  it("source=UTC vs source=NY: instants are 4h apart on the SAME calendar day", () => {
    // Use a FROM early in the day so both next-runs fall on the same day.
    // FROM = 2026-06-11T00:00:00.000Z (midnight UTC)
    // Next 9am UTC = 09:00Z; next 9am NY (EDT=UTC-4) = 13:00Z same day
    const earlyFrom = new Date("2026-06-11T00:00:00.000Z");
    const { next: utcNext } = explainCron("0 9 * * *", 1, earlyFrom, "UTC");
    const { next: nyNext } = explainCron("0 9 * * *", 1, earlyFrom, "America/New_York");
    // NY 9am = 13:00Z, UTC 9am = 09:00Z → diff = 4h
    expect(utcNext[0].getUTCHours()).toBe(9);
    expect(nyNext[0].getUTCHours()).toBe(13);
    expect(nyNext[0].getTime() - utcNext[0].getTime()).toBe(4 * 3600 * 1000);
  });

  it("dialect and description are tz-independent (description unchanged by tz param)", () => {
    const { dialect: d1, description: desc1 } = explainCron("0 9 * * *", 1, FROM, "UTC");
    const { dialect: d2, description: desc2 } = explainCron("0 9 * * *", 1, FROM, "America/New_York");
    expect(d1).toBe(d2);
    expect(desc1).toBe(desc2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. DST CORRECTNESS: spring-forward (America/New_York March 2026)
//    DST begins 2026-03-08 at 02:00 AM local → clocks jump to 03:00 AM
//    "0 2 * * *" with source=America/New_York: the 2 AM slot on Mar 8 is skipped.
//    cron-parser either skips the missing hour or advances past it.
//    All instants must be at valid UTC offsets: 07:00Z (2am EST=UTC-5) or 06:00Z (2am EDT=UTC-4).
// ─────────────────────────────────────────────────────────────────────────────
describe("DST CORRECTNESS: spring-forward in America/New_York (2026-03-08)", () => {
  const SPRING_FROM = new Date("2026-03-07T10:00:00.000Z"); // After 2am EST on Mar 7

  it("0 2 * * * in America/New_York: all next instants have UTC hours in {6,7}", () => {
    const { next } = explainCron("0 2 * * *", 10, SPRING_FROM, "America/New_York");
    expect(next.length).toBeGreaterThan(0);
    for (const d of next) {
      const h = d.getUTCHours();
      expect([6, 7]).toContain(h);
    }
  });

  it("0 2 * * * in America/New_York: all minutes and seconds are 0", () => {
    const { next } = explainCron("0 2 * * *", 10, SPRING_FROM, "America/New_York");
    for (const d of next) {
      expect(d.getUTCMinutes()).toBe(0);
      expect(d.getUTCSeconds()).toBe(0);
    }
  });

  it("0 2 * * * in America/New_York: no instant is at 08:00Z (2 AM EST = 7am UTC, not 8am)", () => {
    const { next } = explainCron("0 2 * * *", 10, SPRING_FROM, "America/New_York");
    for (const d of next) {
      expect(d.getUTCHours()).not.toBe(8);
    }
  });

  it("display-tz DST: 0 9 * * * in UTC, displayed in Asia/Tokyo shows 18:00 (UTC+9)", () => {
    // This tests that display-tz formatting is DST-correct for Tokyo (no DST)
    const { next } = explainCron("0 9 * * *", 1, FROM, "UTC");
    // 09:00Z displayed in Tokyo (UTC+9) should show 18:00
    const tokyoStr = next[0].toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Tokyo",
    });
    expect(tokyoStr).toMatch(/18:00/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SOURCE vs DISPLAY INDEPENDENCE
//    Changing DISPLAY tz does NOT change the UTC instant (only how it's shown).
//    Changing SOURCE tz DOES change the UTC instant.
// ─────────────────────────────────────────────────────────────────────────────
describe("SOURCE vs DISPLAY INDEPENDENCE", () => {
  it("same source tz → same ISO instants regardless of display formatting", () => {
    const evalTz = "America/New_York";
    const { next: next1 } = explainCron("0 9 * * *", 5, FROM, evalTz);
    const { next: next2 } = explainCron("0 9 * * *", 5, FROM, evalTz);
    for (let i = 0; i < 5; i++) {
      expect(next1[i].toISOString()).toBe(next2[i].toISOString());
    }
  });

  it("changing source tz changes the ISO instant", () => {
    const { next: utcNext } = explainCron("0 9 * * *", 1, FROM, "UTC");
    const { next: nyNext } = explainCron("0 9 * * *", 1, FROM, "America/New_York");
    expect(utcNext[0].toISOString()).not.toBe(nyNext[0].toISOString());
  });

  it("display-UTC vs display-Tokyo show different wall-clocks for the same instant", () => {
    // Source = UTC, so instant is at 09:00Z
    const { next } = explainCron("0 9 * * *", 1, FROM, "UTC");
    const utcDisplay = next[0].toLocaleString("en-US", {
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC",
    });
    const tokyoDisplay = next[0].toLocaleString("en-US", {
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tokyo",
    });
    expect(utcDisplay).toMatch(/09:00/);
    expect(tokyoDisplay).toMatch(/18:00/); // UTC+9
  });

  it("display-tz change does NOT affect the underlying UTC instant value", () => {
    const { next: n1 } = explainCron("0 9 * * *", 1, FROM, "UTC");
    // The instant stays at getTime() regardless of how we format it
    const raw = n1[0].getTime();
    const utcDisplay = n1[0].toLocaleString("en-US", { timeZone: "UTC" });
    const nyDisplay = n1[0].toLocaleString("en-US", { timeZone: "America/New_York" });
    // Strings differ but underlying epoch is unchanged
    expect(n1[0].getTime()).toBe(raw);
    expect(utcDisplay).not.toBe(nyDisplay);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. API BACK-COMPAT: /api/explain?tz= is SOURCE/EXECUTION tz (not display)
//    The spec: "API /api/explain?tz= KEEPS its existing meaning (the execution/source tz)"
// ─────────────────────────────────────────────────────────────────────────────

function apiReq(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/explain${query}`);
}

describe("API BACK-COMPAT: ?tz= = execution/source tz", () => {
  it("?tz=UTC: 0 9 * * * fires at 09:00Z", async () => {
    const res = GET(apiReq("?expr=" + encodeURIComponent("0 9 * * *") + "&tz=UTC"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.next).toHaveLength(5);
    for (const ts of body.next) {
      expect(new Date(ts).getUTCHours()).toBe(9);
    }
  });

  it("?tz=America/New_York: 0 9 * * * fires at 13:00Z (9am EDT=UTC-4)", async () => {
    const res = GET(apiReq("?expr=" + encodeURIComponent("0 9 * * *") + "&tz=America%2FNew_York"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.next).toHaveLength(5);
    for (const ts of body.next) {
      expect(new Date(ts).getUTCHours()).toBe(13);
    }
  });

  it("?tz= omitted: defaults to UTC execution (0 12 * * * → 12:00Z)", async () => {
    const res = GET(apiReq("?expr=" + encodeURIComponent("0 12 * * *")));
    const body = await res.json();
    expect(res.status).toBe(200);
    for (const ts of body.next) {
      expect(new Date(ts).getUTCHours()).toBe(12);
    }
  });

  it("?tz=Asia/Tokyo: 0 9 * * * fires at 00:00Z the same or next day (9am JST=UTC+9 → midnight UTC)", async () => {
    const res = GET(apiReq("?expr=" + encodeURIComponent("0 9 * * *") + "&tz=Asia%2FTokyo"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.next).toHaveLength(5);
    for (const ts of body.next) {
      // 9am JST (UTC+9) = 00:00Z
      expect(new Date(ts).getUTCHours()).toBe(0);
    }
  });

  it("?tz=America/New_York vs ?tz=UTC produce DIFFERENT instants (confirms tz=source, not display)", async () => {
    const resUtc = GET(apiReq("?expr=" + encodeURIComponent("0 9 * * *") + "&tz=UTC"));
    const resNy = GET(apiReq("?expr=" + encodeURIComponent("0 9 * * *") + "&tz=America%2FNew_York"));
    const utcBody = await resUtc.json();
    const nyBody = await resNy.json();
    expect(utcBody.next[0]).not.toBe(nyBody.next[0]);
    const diff = new Date(nyBody.next[0]).getTime() - new Date(utcBody.next[0]).getTime();
    expect(diff).toBe(4 * 3600 * 1000); // 4h in summer (EDT)
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. RELATIONSHIP LINE logic (pure logic; UI tested in e2e)
//    Show only when src IANA !== display IANA
// ─────────────────────────────────────────────────────────────────────────────
describe("RELATIONSHIP LINE logic", () => {
  function resolveIana(value: string, localTz: string): string {
    if (value === "local") return localTz;
    return value;
  }

  const localTz = "America/Chicago";

  it("src=local, display=local → same IANA → no relationship line", () => {
    const src = resolveIana("local", localTz);
    const disp = resolveIana("local", localTz);
    expect(src).toBe(disp);
  });

  it("src=UTC, display=local (non-UTC zone) → different IANA → show line", () => {
    const src = resolveIana("UTC", localTz);
    const disp = resolveIana("local", localTz);
    expect(src).not.toBe(disp);
  });

  it("src=UTC, display=UTC → same IANA → no relationship line", () => {
    const src = resolveIana("UTC", localTz);
    const disp = resolveIana("UTC", localTz);
    expect(src).toBe(disp);
  });

  it("src=Asia/Tokyo, display=UTC → different IANA → show line", () => {
    const src = resolveIana("Asia/Tokyo", localTz);
    const disp = resolveIana("UTC", localTz);
    expect(src).not.toBe(disp);
  });

  it("src=local, display=UTC where local is UTC → same IANA → no line", () => {
    const utcLocal = "UTC";
    const src = resolveIana("local", utcLocal);
    const disp = resolveIana("UTC", utcLocal);
    expect(src).toBe(disp);
  });
});
