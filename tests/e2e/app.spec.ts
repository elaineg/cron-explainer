import { test, expect } from "@playwright/test";

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

test.describe("Core flow 1: explain an expression", () => {
  test("home page shows prefilled example with description and exactly 5 run times", async ({
    page,
  }) => {
    await page.goto("/");
    const input = page.locator("#cron-input");
    await expect(input).toHaveValue("*/15 9-17 * * MON-FRI");

    // Plain-English description is non-empty.
    const description = page.locator("section >> p").first();
    await expect(description).not.toHaveText("");
    await expect(description).toContainText(/every 15 minutes/i);

    // Exactly 5 run times rendered.
    await expect(page.locator("ol > li")).toHaveCount(5);

    // Timezone label present (IANA name like Area/City or UTC).
    await expect(page.getByText(/your timezone:/i)).toBeVisible();
    const tzText = await page.getByText(/your timezone:/i).innerText();
    expect(tzText).toMatch(/your timezone:\s*\S+/i);

    // Each run row has an absolute timestamp and a relative hint.
    const rows = page.locator("ol > li");
    for (let i = 0; i < 5; i++) {
      const text = await rows.nth(i).innerText();
      expect(text).toMatch(/\d{4}/); // year in absolute timestamp
      expect(text).toMatch(/in \d+|next/i); // relative hint
    }
  });

  test("typing 0 9 * * MON-FRI updates live with weekday 9 AM description", async ({
    page,
  }) => {
    await page.goto("/");
    const input = page.locator("#cron-input");
    await input.fill("0 9 * * MON-FRI");
    const description = page.locator("section >> p").first();
    await expect(description).toContainText(/09:00|9:00 AM/);
    await expect(description).toContainText("Monday through Friday");
    await expect(page.locator("ol > li")).toHaveCount(5);
    // All 5 runs at 9:00 local time (page renders in browser local tz).
    const rows = await page.locator("ol > li").allInnerTexts();
    for (const row of rows) {
      expect(row).toMatch(/09:00|9:00\sAM/);
    }
  });

  test("@daily shows a midnight description and 5 daily runs", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("@daily");
    const description = page.locator("section >> p").first();
    await expect(description).toContainText(/midnight/i);
    await expect(page.locator("ol > li")).toHaveCount(5);
  });
});

test.describe("Core flow 2: invalid input", () => {
  // Next.js injects an empty route announcer with role="alert", so scope to
  // the app's own error alert.
  const errorAlert = (page: import("@playwright/test").Page) =>
    page.locator('[role="alert"]:not([id="__next-route-announcer__"])');

  test("61 * * * * shows inline error; valid input clears it", async ({
    page,
  }) => {
    await page.goto("/");
    const input = page.locator("#cron-input");
    const alert = errorAlert(page);

    await input.fill("61 * * * *");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/not a valid cron expression/i);

    await input.fill("not a cron");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/not a valid cron expression/i);

    // Recovery: valid expression replaces the error with results.
    await input.fill("*/5 * * * *");
    await expect(alert).toHaveCount(0);
    await expect(page.locator("ol > li")).toHaveCount(5);
  });

  test("@reboot and 6-field syntax get explanatory errors", async ({
    page,
  }) => {
    await page.goto("/");
    const input = page.locator("#cron-input");
    const alert = errorAlert(page);

    await input.fill("@reboot");
    await expect(alert).toContainText(/@reboot/);

    await input.fill("0 */10 * * * *");
    await expect(alert).toContainText(/6-field|seconds/i);
  });

  test("home page documents the API endpoint", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/GET \/api\/explain\?expr=/)).toBeVisible();
  });
});

test.describe("Core flow 3: API access", () => {
  test("GET /api/explain with */10 * * * * returns 200, every-10-minutes description, 5 ISO timestamps 10 min apart", async ({
    request,
  }) => {
    const res = await request.get("/api/explain?expr=*/10%20*%20*%20*%20*");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.expression).toBe("*/10 * * * *");
    expect(body.description.toLowerCase()).toContain("every 10 minutes");
    expect(Array.isArray(body.next)).toBe(true);
    expect(body.next).toHaveLength(5);
    for (const ts of body.next) expect(ts).toMatch(ISO_RE);
    for (let i = 1; i < body.next.length; i++) {
      expect(
        new Date(body.next[i]).getTime() - new Date(body.next[i - 1]).getTime()
      ).toBe(600_000);
    }
  });

  test("GET /api/explain?expr=banana returns 400 with JSON error", async ({
    request,
  }) => {
    const res = await request.get("/api/explain?expr=banana");
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  test("GET /api/explain without expr returns 400", async ({ request }) => {
    const res = await request.get("/api/explain");
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
  });
});
