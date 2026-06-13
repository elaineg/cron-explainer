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

    // Timezone label present near the next-runs section (e.g. "Next 5 runs — America/Los_Angeles").
    // The app renders this as "Next 5 runs — {tzLabel}" in the section header.
    const tzHeader = page.locator("h2").filter({ hasText: /next 5 runs/i });
    await expect(tzHeader).toBeVisible();
    const tzHeaderText = await tzHeader.innerText();
    expect(tzHeaderText).toMatch(/next 5 runs/i);
    // Must show a non-empty timezone portion after the dash
    expect(tzHeaderText).toMatch(/—\s*\S+/);

    // Each run row has an absolute timestamp; at least one has a relative hint
    // (round-3: duplicate hints are deduplicated so not every row shows one).
    const rows = page.locator("ol > li");
    let hintCount = 0;
    for (let i = 0; i < 5; i++) {
      const text = await rows.nth(i).innerText();
      expect(text).toMatch(/\d{4}/); // year in absolute timestamp
      if (/in \d+|next/i.test(text)) hintCount++;
    }
    // At least the first row must have a hint (dedup never strips the first)
    expect(hintCount).toBeGreaterThanOrEqual(1);
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

test.describe("Core flow 2: generate from English", () => {
  test("typing 'every weekday at 9am' generates 0 9 * * 1-5 and updates explanation", async ({
    page,
  }) => {
    await page.goto("/");
    const english = page.locator("#english-input");
    const cron = page.locator("#cron-input");

    await english.fill("every weekday at 9am");
    await expect(cron).toHaveValue("0 9 * * 1-5");
    await expect(page.getByTestId("generated-cron")).toContainText(
      "0 9 * * 1-5"
    );
    const description = page.locator("section >> p").first();
    await expect(description).toContainText(/09:00|9:00 AM/);
    await expect(description).toContainText("Monday through Friday");
    await expect(page.locator("ol > li")).toHaveCount(5);
    // Permalink reflects the generated expression.
    await expect(page.getByTestId("permalink")).toContainText(
      "/e/0%209%20*%20*%201-5"
    );
  });

  test("'every 10 minutes on weekends' generates */10 * * * 0,6", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#english-input").fill("every 10 minutes on weekends");
    await expect(page.locator("#cron-input")).toHaveValue("*/10 * * * 0,6");
    const description = page.locator("section >> p").first();
    await expect(description).toContainText(/every 10 minutes/i);
    await expect(description).toContainText(/Saturday|Sunday/);
  });

  // Updated (round-3): English parse error blocks the result region.
  test("unsupported phrase shows can't-understand message; round-3 fix: result region is suppressed", async ({
    page,
  }) => {
    await page.goto("/");
    const english = page.locator("#english-input");
    const cron = page.locator("#cron-input");
    const before = await cron.inputValue();

    await english.fill("whenever mercury is in retrograde");
    const msg = page.getByTestId("english-error");
    await expect(msg).toBeVisible();
    // App shows "Couldn't read that schedule. Try one of the examples below."
    await expect(msg).toContainText(/couldn't/i);
    // Example phrases are shown as chips near the input (not inside the error div itself)
    await expect(page.getByRole("button", { name: "every weekday at 9am" })).toBeVisible();
    // Cron input is untouched — no silent guess.
    await expect(cron).toHaveValue(before);
    // Round-3: result region blocked while English error is active
    await expect(page.locator("ol > li")).toHaveCount(0);

    // Message clears once the phrase becomes parseable.
    await english.fill("every hour");
    await expect(msg).toHaveCount(0);
    await expect(cron).toHaveValue("0 * * * *");
    await expect(page.locator("ol > li")).toHaveCount(5);
  });

  test("one direction only: editing the cron input leaves the English input alone", async ({
    page,
  }) => {
    await page.goto("/");
    const english = page.locator("#english-input");
    await english.fill("every monday at 9am");
    await expect(page.locator("#cron-input")).toHaveValue("0 9 * * 1");

    await page.locator("#cron-input").fill("*/5 * * * *");
    await expect(english).toHaveValue("every monday at 9am");
    const description = page.locator("section >> p").first();
    await expect(description).toContainText(/every 5 minutes/i);
  });
});

test.describe("Core flow 1: invalid input", () => {
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
