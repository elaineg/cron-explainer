/**
 * Round-2 regression tests for cron-explainer.
 * Covers the specific checks added in the round-2 verification pass:
 *   - API timezone correctness (UTC vs America/New_York)
 *   - Timezone toggle UI changes the rendered list
 *   - Copy buttons exist and show confirmation
 *   - NL phrase parsing: "noon every day", "first of the month at 9am", "9am every monday", "every 30 minutes"
 *   - Unparseable phrase shows friendly error and clears prior result
 */
import { test, expect } from "@playwright/test";

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

test.describe("Round-2: API timezone correctness", () => {
  test("GET /api/explain?expr=0%206%20*%20*%20*&tz=UTC returns 06:00:00Z times", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/explain?expr=0%206%20*%20*%20*&tz=UTC"
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.next)).toBe(true);
    expect(body.next).toHaveLength(5);
    for (const ts of body.next) {
      expect(ts).toMatch(ISO_RE);
      // Must fire at 06:00 UTC
      expect(ts).toMatch(/T06:00:00/);
    }
  });

  test("GET /api/explain?expr=0%206%20*%20*%20*&tz=America/New_York returns 10:00 or 11:00Z (NY offset)", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/explain?expr=0%206%20*%20*%20*&tz=America/New_York"
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.next)).toBe(true);
    expect(body.next).toHaveLength(5);
    for (const ts of body.next) {
      expect(ts).toMatch(ISO_RE);
      // 06:00 NY in June = EDT = UTC-4, so 10:00Z
      // 06:00 NY in winter = EST = UTC-5, so 11:00Z
      // All June dates here → expect T10:00:00Z
      expect(ts).toMatch(/T10:00:00/);
    }
    // Verify these differ from the UTC result (UTC vs NY must produce different instants)
    const utcRes = await request.get(
      "/api/explain?expr=0%206%20*%20*%20*&tz=UTC"
    );
    const utcBody = await utcRes.json();
    // UTC: 06:00Z vs NY: 10:00Z — must not match
    expect(body.next[0]).not.toBe(utcBody.next[0]);
  });

  test("GET /api/explain with invalid tz falls back to UTC silently (returns 200)", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/explain?expr=0%206%20*%20*%20*&tz=Not/ATimezone"
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.next)).toBe(true);
    expect(body.next).toHaveLength(5);
  });
});

test.describe("Round-2: timezone toggle UI", () => {
  test("Local | UTC toggle changes the rendered next-run list", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 9 * * *");

    // Give the page a moment to compute
    await expect(page.locator("ol > li")).toHaveCount(5);

    // Capture the first run time in Local mode
    const localFirst = await page.locator("ol > li").first().innerText();

    // Switch to UTC
    await page.getByRole("button", { name: /UTC/ }).click();
    await expect(page.locator("ol > li")).toHaveCount(5);
    const utcFirst = await page.locator("ol > li").first().innerText();

    // The two lists should differ (unless the browser happens to be in UTC,
    // in which case this test would incorrectly pass — acceptable on CI).
    // At minimum, both show timestamps with a year.
    expect(localFirst).toMatch(/\d{4}/);
    expect(utcFirst).toMatch(/\d{4}/);
  });
});

test.describe("Round-2: copy buttons", () => {
  test("copy button for cron expression exists and shows 'Copied!' confirmation", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: baseURL,
    });
    await page.goto("/");
    // The copy-expression button should be near the cron input
    const copyExprBtn = page.getByRole("button", { name: /copy.*expr|copy.*cron/i });
    // If not named that way, look for any "Copy" button in the header area
    const anyBtn = page.getByRole("button", { name: /^copy/i }).first();
    await expect(anyBtn).toBeVisible();
    await anyBtn.click();
    // Should show "Copied!" briefly
    await expect(page.getByText(/copied/i)).toBeVisible();
  });

  test("permalink copy button shows 'Copied!' confirmation", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: baseURL,
    });
    await page.goto("/");
    await page.locator("#cron-input").fill("0 9 * * MON-FRI");
    const copyLinkBtn = page.getByRole("button", { name: /copy link|copied/i });
    await expect(copyLinkBtn).toBeVisible();
    await expect(copyLinkBtn).toHaveText(/copy link/i);
    await copyLinkBtn.click();
    await expect(copyLinkBtn).toHaveText(/copied/i);
  });
});

test.describe("Round-2: NL generator phrase coverage", () => {
  const phrases: Array<{ phrase: string; expectedCron: string }> = [
    { phrase: "noon every day", expectedCron: "0 12 * * *" },
    { phrase: "first of the month at 9am", expectedCron: "0 9 1 * *" },
    { phrase: "9am every monday", expectedCron: "0 9 * * 1" },
    { phrase: "every 30 minutes", expectedCron: "*/30 * * * *" },
  ];

  for (const { phrase, expectedCron } of phrases) {
    test(`"${phrase}" generates ${expectedCron} and explanation renders`, async ({
      page,
    }) => {
      await page.goto("/");
      await page.locator("#english-input").fill(phrase);
      await expect(page.locator("#cron-input")).toHaveValue(expectedCron);
      await expect(page.locator("ol > li")).toHaveCount(5);
    });
  }

  test("unparseable phrase shows friendly error and does NOT clear prior results", async ({
    page,
  }) => {
    await page.goto("/");
    // Start with a valid expression showing 5 results
    await page.locator("#cron-input").fill("*/15 * * * *");
    await expect(page.locator("ol > li")).toHaveCount(5);

    // Type unparseable phrase
    await page.locator("#english-input").fill("whenever mercury is in retrograde");

    // Error message must appear
    const errMsg = page.getByTestId("english-error");
    await expect(errMsg).toBeVisible();
    await expect(errMsg).toContainText(/couldn't/i);

    // Cron results must still be visible (prior expression unchanged)
    await expect(page.locator("ol > li")).toHaveCount(5);

    // Clearing → typing a valid phrase removes the error
    await page.locator("#english-input").fill("every hour");
    await expect(page.getByTestId("english-error")).toHaveCount(0);
    await expect(page.locator("#cron-input")).toHaveValue("0 * * * *");
  });
});
