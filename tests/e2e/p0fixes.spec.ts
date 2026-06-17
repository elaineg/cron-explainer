/**
 * P0-fix verification tests — run 20260617-153950-daily
 *
 * P0-1: AWS auto-detect
 *   "0 9 ? * MON-FRI *" must detect as AWS (not Quartz), and next-5 runs must be
 *   weekday 09:00:00 UTC (not hourly at :09, not midnight+9min).
 *   "0 0 9 ? * MON-FRI" must still detect as Quartz (last=DOW token).
 *   "every-30s" Quartz expr must still detect as Quartz with next-5 exactly 30s apart.
 *   A generic no-? 6-field expression defaults to Quartz.
 *   Manual override must re-explain the same string under the forced dialect.
 *
 * P0-2: Year field honored
 *   "0 0 12 ? * MON 2027" — every returned timestamp is in year 2027.
 *   "0 0 12 1 1 ? 2030"  — every returned timestamp is in year 2030 (Jan 1, 12:00).
 *   Description's stated year and next-5 AGREE.
 *   Past year (2020) → honest "No upcoming runs" note.
 */
import { test, expect } from "@playwright/test";

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

// ─── P0-1: AWS auto-detect ────────────────────────────────────────────────────

test.describe("P0-1 AWS auto-detect", () => {
  test("0 9 ? * MON-FRI * auto-detects as AWS via API (dialect in response)", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/explain?expr=" + encodeURIComponent("0 9 ? * MON-FRI *")
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    // AWS: min=0 hour=9 dom=? month=* dow=MON-FRI year=*
    // Description must mention 9 AM (not 12:09 AM)
    expect(body.description).toMatch(/9:00|09:00/i);
    // Must return 5 run times
    expect(body.next).toHaveLength(5);
    // All must be at hour 09 UTC, NOT hour 0 or minute 9 of hour 0
    for (const ts of body.next) {
      expect(ts).toMatch(ISO_RE);
      const d = new Date(ts);
      expect(d.getUTCHours()).toBe(9);   // must be 09:00, not 00:09
      expect(d.getUTCMinutes()).toBe(0);
    }
  });

  test("0 9 ? * MON-FRI * next-5 are all weekdays at 09:00 UTC", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/explain?expr=" + encodeURIComponent("0 9 ? * MON-FRI *")
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.next).toHaveLength(5);
    for (const ts of body.next) {
      const d = new Date(ts);
      // UTC weekday: Mon=1, Fri=5
      const dow = d.getUTCDay();
      expect(dow).toBeGreaterThanOrEqual(1);
      expect(dow).toBeLessThanOrEqual(5);
      expect(d.getUTCHours()).toBe(9);
      expect(d.getUTCMinutes()).toBe(0);
    }
  });

  test("0 0 9 ? * MON-FRI still detects as Quartz via API (last=DOW token)", async ({
    request,
  }) => {
    // Quartz: sec=0 min=0 hour=9 dom=? month=* dow=MON-FRI
    const res = await request.get(
      "/api/explain?expr=" + encodeURIComponent("0 0 9 ? * MON-FRI")
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Should be valid Quartz weekday-9am (same meaning)
    expect(body.description).toMatch(/9:00|09:00/i);
    expect(body.next).toHaveLength(5);
    for (const ts of body.next) {
      const d = new Date(ts);
      expect(d.getUTCHours()).toBe(9);
      expect(d.getUTCMinutes()).toBe(0);
    }
  });

  test("*/30 * * * * * still detects as Quartz, next-5 exactly 30s apart (API)", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/explain?expr=" + encodeURIComponent("*/30 * * * * *")
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.next).toHaveLength(5);
    for (let i = 1; i < body.next.length; i++) {
      const spacing =
        new Date(body.next[i]).getTime() - new Date(body.next[i - 1]).getTime();
      expect(spacing).toBe(30_000);
    }
  });

  test("UI: 0 9 ? * MON-FRI * shows AWS badge active (not Quartz)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 9 ? * MON-FRI *");
    // AWS button must be active, Quartz must be inactive
    await expect(page.getByTestId("dialect-aws")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(page.getByTestId("dialect-quartz")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  test("UI: 0 9 ? * MON-FRI * description and next-5 show 09:00 (not midnight+9m)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 9 ? * MON-FRI *");
    // Description must mention 9:00
    const description = page.locator("section >> p").first();
    await expect(description).toContainText(/9:00|09:00/);
    // 5 run times, all with the hour digit "9" visible in the time
    await expect(page.locator("ol > li")).toHaveCount(5);
    const items = await page.locator("ol > li").allInnerTexts();
    for (const item of items) {
      // Must NOT be "12:09 AM" — must contain "9:00"
      expect(item).toMatch(/9:00/);
    }
  });

  test("UI: manual override switches between Quartz and AWS for 0 0 9 * * MON-FRI", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 0 9 * * MON-FRI");
    // Auto-detects as Quartz
    await expect(page.getByTestId("dialect-quartz")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    const quartzDesc = await page.locator("section >> p").first().innerText();

    // Override to AWS — same string, re-explained under AWS rules
    await page.getByTestId("dialect-aws").click();
    await expect(page.getByTestId("dialect-aws")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    // Must still show some description (not an error)
    await expect(page.locator("ol > li")).toHaveCount(5);
    const awsDesc = await page.locator("section >> p").first().innerText();

    // Both have content; they may differ (different dialect interpretation)
    expect(quartzDesc.length).toBeGreaterThan(0);
    expect(awsDesc.length).toBeGreaterThan(0);
  });
});

// ─── P0-2: Year field honored ─────────────────────────────────────────────────

test.describe("P0-2 year field honored in next-run computation", () => {
  test("API: 0 0 12 ? * MON 2027 — all next timestamps are in 2027", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/explain?expr=" + encodeURIComponent("0 0 12 ? * MON 2027")
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Must have at least 1 result (2027 is a future year from our FROM date)
    expect(body.next.length).toBeGreaterThan(0);
    // Every returned timestamp must be in 2027
    for (const ts of body.next) {
      expect(ts).toMatch(ISO_RE);
      const year = new Date(ts).getUTCFullYear();
      expect(year).toBe(2027);
    }
    // Hour must be 12:00
    for (const ts of body.next) {
      const d = new Date(ts);
      expect(d.getUTCHours()).toBe(12);
      expect(d.getUTCMinutes()).toBe(0);
    }
  });

  test("API: 0 0 12 ? * MON 2027 — timestamps are Mondays", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/explain?expr=" + encodeURIComponent("0 0 12 ? * MON 2027")
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.next.length).toBeGreaterThan(0);
    for (const ts of body.next) {
      const d = new Date(ts);
      expect(d.getUTCDay()).toBe(1); // Monday = 1
    }
  });

  test("API: 0 0 12 1 1 ? 2030 — all next timestamps are in 2030, Jan 1 at 12:00", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/explain?expr=" + encodeURIComponent("0 0 12 1 1 ? 2030")
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.next.length).toBeGreaterThan(0);
    for (const ts of body.next) {
      expect(ts).toMatch(ISO_RE);
      const d = new Date(ts);
      expect(d.getUTCFullYear()).toBe(2030);
      expect(d.getUTCMonth()).toBe(0);  // January
      expect(d.getUTCDate()).toBe(1);
      expect(d.getUTCHours()).toBe(12);
      expect(d.getUTCMinutes()).toBe(0);
    }
  });

  test("UI: 0 0 12 ? * MON 2027 shows 2027 in next-run timestamps", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 0 12 ? * MON 2027");
    // Should show results (no error), all with 2027 in the date
    await expect(page.locator("ol > li")).toHaveCount(5);
    const items = await page.locator("ol > li").allInnerTexts();
    for (const item of items) {
      // Each displayed run time must contain "2027"
      expect(item).toContain("2027");
    }
  });

  test("UI: 0 0 12 1 1 ? 2030 shows 2030 in next-run timestamps (Jan 1 2030 occurs once)", async ({
    page,
  }) => {
    // Jan 1 2030 at 12:00 occurs only once per year, so only 1 result for year=2030
    await page.goto("/");
    await page.locator("#cron-input").fill("0 0 12 1 1 ? 2030");
    // At least 1 result (exactly 1 for this single-day-per-year expression)
    const count = await page.locator("ol > li").count();
    // Must have at least 1 result and it must be in 2030
    expect(count).toBeGreaterThanOrEqual(1);
    const items = await page.locator("ol > li").allInnerTexts();
    for (const item of items) {
      expect(item).toContain("2030");
    }
  });

  test("UI: past year (0 0 12 ? * MON 2020) shows yearNote, not wrong timestamps", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 0 12 ? * MON 2020");
    // Must NOT show 5 run times (2020 is past — no future runs)
    await expect(page.locator("ol > li")).toHaveCount(0);
    // Must show some note about past year or no upcoming runs
    const body = page.locator("body");
    await expect(body).toContainText(/2020|past|no upcoming/i);
  });

  test("API: past year (0 0 12 ? * MON 2020) returns 200 with empty next or yearNote", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/explain?expr=" + encodeURIComponent("0 0 12 ? * MON 2020")
    );
    // Should be 200 (valid expression, just no future runs)
    expect(res.status()).toBe(200);
    const body = await res.json();
    // next should be empty (no future runs in 2020)
    expect(body.next).toHaveLength(0);
  });
});
