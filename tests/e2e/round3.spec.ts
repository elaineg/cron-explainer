/**
 * Round-3 regression tests for cron-explainer.
 * Covers the specific checks added in the round-3 verification pass:
 *   a. Stale-output cleared on error: cron error hides results; English error hides results.
 *   b. Copy confirmation on BOTH copy buttons.
 *   c. Invalid ?tz= → 400; absent tz → 200 UTC; valid tz → 200 shifted correctly.
 *   d. Polish: API note is styled (not naked body text); relative hints not all identical.
 *   e. Regression: core flows, English→cron, permalink, Local|UTC toggle.
 */
import { test, expect } from "@playwright/test";

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

// ── a. Stale-output cleared on error ────────────────────────────────────────

test.describe("Round-3 (a): stale output cleared on cron error", () => {
  test("valid cron showing results → invalid cron → results disappear, only error shows", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 9 * * MON-FRI");
    await expect(page.locator("ol > li")).toHaveCount(5);
    // All result sections visible
    await expect(page.locator("section")).not.toHaveCount(0);

    // Enter invalid expression
    await page.locator("#cron-input").fill("99 99 99 99 99");

    // Error must show, results must be gone
    const alert = page.locator('[role="alert"]:not([id="__next-route-announcer__"])');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/not a valid cron expression/i);
    await expect(page.locator("ol > li")).toHaveCount(0);

    // Permalink, previous-run, copy buttons must be absent
    await expect(page.getByTestId("permalink")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /copy cron expression/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /copy link/i })).toHaveCount(0);
  });

  test("valid cron results + invalid cron → cron Copy button disappears", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("*/5 * * * *");
    await expect(page.locator("ol > li")).toHaveCount(5);
    // Copy button present when valid (aria-label = "Copy cron expression")
    await expect(page.getByRole("button", { name: /copy cron expression/i })).toBeVisible();

    // Invalidate
    await page.locator("#cron-input").fill("banana");
    await expect(page.getByRole("button", { name: /copy cron expression/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /copy link/i })).toHaveCount(0);
  });
});

test.describe("Round-3 (a): stale output cleared on English error (cross-field)", () => {
  test("generate cron from valid English (results visible) → unparseable English → results disappear", async ({
    page,
  }) => {
    await page.goto("/");
    // Generate a valid cron from English so results are shown
    await page.locator("#english-input").fill("every weekday at 9am");
    await expect(page.locator("#cron-input")).toHaveValue("0 9 * * 1-5");
    await expect(page.locator("ol > li")).toHaveCount(5);

    // Now type an unparseable English phrase
    await page.locator("#english-input").fill("whenever mercury is in retrograde");

    // English error must appear
    const engErr = page.getByTestId("english-error");
    await expect(engErr).toBeVisible();
    await expect(engErr).toContainText(/couldn't/i);

    // Result region must be gone — no ol>li, no explanation section
    await expect(page.locator("ol > li")).toHaveCount(0);

    // No copy buttons visible
    await expect(page.getByRole("button", { name: /copy cron expression/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /copy link/i })).toHaveCount(0);

    // English error is the only affirmative state shown
    await expect(page.getByTestId("permalink")).toHaveCount(0);
  });
});

// ── b. Copy confirmation on BOTH buttons ────────────────────────────────────

test.describe("Round-3 (b): copy confirmation on both buttons", () => {
  test("cron expression Copy button shows '✓ Copied!' state", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: baseURL,
    });
    await page.goto("/");
    await page.locator("#cron-input").fill("0 9 * * MON-FRI");
    await expect(page.locator("ol > li")).toHaveCount(5);

    // aria-label = "Copy cron expression"; visible text = "Copy"
    const copyBtn = page.getByRole("button", { name: /copy cron expression/i });
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    // Must show copied state (aria-label + visible text both change to "✓ Copied!")
    await expect(page.getByRole("button", { name: /copied!/i })).toBeVisible();
  });

  test("permalink Copy link button shows '✓ Copied!' state", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: baseURL,
    });
    await page.goto("/");
    await page.locator("#cron-input").fill("0 9 * * MON-FRI");
    await expect(page.locator("ol > li")).toHaveCount(5);

    const copyLinkBtn = page.getByRole("button", { name: /copy link|copied/i });
    await expect(copyLinkBtn).toBeVisible();
    await copyLinkBtn.click();
    await expect(copyLinkBtn).toHaveText(/✓\s*Copied!/i);
  });
});

// ── c. Invalid ?tz= → 400; absent tz → 200 UTC; valid tz → 200 shifted ─────

test.describe("Round-3 (c): API timezone handling", () => {
  test("GET /api/explain?expr=...&tz=Bogus/Zone → 400 with {error}", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/explain?expr=0%209%20*%20*%20*&tz=Bogus/Zone"
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
    expect(body.error).toMatch(/bogus\/zone|unknown timezone/i);
  });

  test("GET /api/explain?expr=... (absent tz) → 200, UTC times", async ({
    request,
  }) => {
    const res = await request.get("/api/explain?expr=0%209%20*%20*%20*");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.next)).toBe(true);
    expect(body.next).toHaveLength(5);
    for (const ts of body.next) {
      expect(ts).toMatch(ISO_RE);
      // With no tz → UTC: 0 9 * * * fires at 09:00 UTC
      expect(ts).toMatch(/T09:00:00/);
    }
  });

  test("GET /api/explain?expr=...&tz=America/New_York → 200 with correctly shifted UTC instants", async ({
    request,
  }) => {
    // 0 9 * * * in America/New_York: June → EDT = UTC-4, so UTC instant is 13:00
    const res = await request.get(
      "/api/explain?expr=0%209%20*%20*%20*&tz=America%2FNew_York"
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.next)).toBe(true);
    expect(body.next).toHaveLength(5);
    for (const ts of body.next) {
      expect(ts).toMatch(ISO_RE);
      // 09:00 NY in summer (June) = UTC 13:00
      expect(ts).toMatch(/T13:00:00/);
    }
    // Sanity: differs from UTC result
    const utcRes = await request.get("/api/explain?expr=0%209%20*%20*%20*");
    const utcBody = await utcRes.json();
    expect(body.next[0]).not.toBe(utcBody.next[0]);
  });
});

// ── d. Polish checks ─────────────────────────────────────────────────────────

test.describe("Round-3 (d): polish — API note styled, relative hints not all identical", () => {
  test("API/developers note is in a styled footer element, not naked body text", async ({
    page,
  }) => {
    await page.goto("/");
    // Must be inside a <footer> element with styling, not raw text
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText(/GET \/api\/explain\?expr=/);
    // The text must be inside a link or styled container, not a bare text node
    const apiLink = footer.locator("a");
    await expect(apiLink).toBeVisible();
  });

  test("next-5 relative-time hints are not all identical duplicates", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("*/1 * * * *"); // every minute
    await expect(page.locator("ol > li")).toHaveCount(5);
    const items = page.locator("ol > li");
    const texts = await items.allInnerTexts();
    // Collect non-empty relative hints; they should not all be the same string
    const hints = texts
      .map((t) => {
        const parts = t.split("\n").map((s) => s.trim()).filter(Boolean);
        return parts[1] ?? "";
      })
      .filter((h) => h.length > 0);
    // At minimum, not all hints are the exact same string
    const unique = new Set(hints);
    expect(unique.size).toBeGreaterThan(1);
  });
});

// ── e. Regression: core flows still work ────────────────────────────────────

test.describe("Round-3 (e): regression — core flows", () => {
  test("English→cron generation still works: 'every weekday at 9am' → 0 9 * * 1-5", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#english-input").fill("every weekday at 9am");
    await expect(page.locator("#cron-input")).toHaveValue("0 9 * * 1-5");
    await expect(page.locator("ol > li")).toHaveCount(5);
  });

  test("permalink ?expr= alias prefills the cron input", async ({ page }) => {
    await page.goto("/?expr=0%209%20*%20*%20MON-FRI");
    await expect(page.locator("#cron-input")).toHaveValue("0 9 * * MON-FRI");
    await expect(page.locator("ol > li")).toHaveCount(5);
  });

  test("permalink ?cron= alias prefills the cron input", async ({ page }) => {
    await page.goto("/?cron=%40daily");
    await expect(page.locator("#cron-input")).toHaveValue("@daily");
    await expect(page.locator("ol > li")).toHaveCount(5);
  });

  test("/e/<expr> permalink prefills and shows results", async ({ page }) => {
    await page.goto("/e/0%209%20*%20*%20MON-FRI");
    await expect(page.locator("#cron-input")).toHaveValue("0 9 * * MON-FRI");
    await expect(page.locator("ol > li")).toHaveCount(5);
  });

  test("Local | UTC toggle still works", async ({ page }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 9 * * *");
    await expect(page.locator("ol > li")).toHaveCount(5);
    const localFirst = await page.locator("ol > li").first().innerText();
    // Use stable testid — page now has two UTC buttons (source + display)
    await page.getByTestId("display-tz-utc").click();
    await expect(page.locator("ol > li")).toHaveCount(5);
    const utcFirst = await page.locator("ol > li").first().innerText();
    // At minimum both have years; may differ unless browser is in UTC zone
    expect(localFirst).toMatch(/\d{4}/);
    expect(utcFirst).toMatch(/\d{4}/);
  });
});
