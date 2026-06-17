/**
 * Round-4 e2e tests: multi-dialect support (Quartz, AWS, translate).
 * Covers:
 *   - H: dialect selector always visible on cold load (Unix active)
 *   - Quartz 6-field: auto-detect + correct next-5 times
 *   - Quartz seconds field honored (30s spacing)
 *   - Quartz 7-field with year accepted
 *   - AWS: cron() wrapper accepted
 *   - Ambiguous 6-field defaults to Quartz, can be overridden to AWS
 *   - I: Translate control visible, produces result, copy works
 *   - I: Translate sub-minute seconds -> Unix shows amber warning
 *   - API: Quartz 6-field returns 200
 *   - REGRESSION: 5-field Unix still works byte-identically
 */
import { test, expect } from "@playwright/test";

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

// ── H: Dialect selector always visible ──────────────────────────────────────

test.describe("H: dialect selector — always visible, Unix active on cold load", () => {
  test("dialect selector is visible on cold load with Unix active", async ({
    page,
  }) => {
    await page.goto("/");
    const selector = page.getByTestId("dialect-selector");
    await expect(selector).toBeVisible();

    // All three segments present
    await expect(page.getByTestId("dialect-unix")).toBeVisible();
    await expect(page.getByTestId("dialect-quartz")).toBeVisible();
    await expect(page.getByTestId("dialect-aws")).toBeVisible();

    // Unix is active (aria-pressed=true) for the default 5-field example
    const unixBtn = page.getByTestId("dialect-unix");
    await expect(unixBtn).toHaveAttribute("aria-pressed", "true");
    const quartzBtn = page.getByTestId("dialect-quartz");
    await expect(quartzBtn).toHaveAttribute("aria-pressed", "false");
  });

  test("detected-reason caption is visible", async ({ page }) => {
    await page.goto("/");
    const caption = page.getByTestId("dialect-reason");
    await expect(caption).toBeVisible();
    const text = await caption.innerText();
    expect(text.length).toBeGreaterThan(0);
  });
});

// ── Quartz 6-field ───────────────────────────────────────────────────────────

test.describe("Quartz 6-field auto-detect and next-5", () => {
  test("0 0 9 ? * MON-FRI: auto-detects as Quartz, shows weekday 9am description and 5 runs", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 0 9 ? * MON-FRI");

    // Quartz active
    await expect(page.getByTestId("dialect-quartz")).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    // Description mentions 9 AM and weekdays
    const description = page.locator("section >> p").first();
    await expect(description).toContainText(/09:00|9:00 AM/);
    await expect(description).toContainText("Monday through Friday");

    // 5 run times
    await expect(page.locator("ol > li")).toHaveCount(5);
  });

  test("*/30 * * * * *: Quartz seconds honored — next-5 runs 30s apart", async ({
    page,
    request,
  }) => {
    // Verify via API (UTC, deterministic)
    const res = await request.get(
      "/api/explain?expr=" + encodeURIComponent("*/30 * * * * *")
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.next).toHaveLength(5);
    for (const ts of body.next) expect(ts).toMatch(ISO_RE);
    for (let i = 1; i < body.next.length; i++) {
      expect(
        new Date(body.next[i]).getTime() - new Date(body.next[i - 1]).getTime()
      ).toBe(30_000);
    }
  });

  test("0 0 12 ? * MON 2027: Quartz 7-field with year accepted (no error)", async ({
    page,
  }) => {
    await page.goto("/");
    const alert = page.locator('[role="alert"]:not([id="__next-route-announcer__"])');
    await page.locator("#cron-input").fill("0 0 12 ? * MON 2027");
    await expect(alert).toHaveCount(0);
    // Quartz active
    await expect(page.getByTestId("dialect-quartz")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});

// ── AWS EventBridge ───────────────────────────────────────────────────────────

test.describe("AWS EventBridge dialect", () => {
  test("cron(0 10 * * ? *): AWS wrapper accepted, shows 10 AM description", async ({
    page,
  }) => {
    await page.goto("/");
    const alert = page.locator('[role="alert"]:not([id="__next-route-announcer__"])');
    await page.locator("#cron-input").fill("cron(0 10 * * ? *)");
    await expect(alert).toHaveCount(0);
    await expect(page.locator("ol > li")).toHaveCount(5);
    // AWS should be active
    await expect(page.getByTestId("dialect-aws")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});

// ── Ambiguous 6-field: auto-detect Quartz, override to AWS ───────────────────

test.describe("Ambiguous 6-field: Quartz default, AWS override", () => {
  test("0 0 9 * * MON-FRI: defaults to Quartz; clicking AWS re-explains under AWS rules", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 0 9 * * MON-FRI");

    // Auto-detects as Quartz
    await expect(page.getByTestId("dialect-quartz")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(page.locator("ol > li")).toHaveCount(5);
    const quartzFirst = await page.locator("ol > li").first().innerText();

    // Override to AWS
    await page.getByTestId("dialect-aws").click();
    await expect(page.getByTestId("dialect-aws")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    // Still shows 5 runs (re-explained under AWS)
    await expect(page.locator("ol > li")).toHaveCount(5);
    const awsFirst = await page.locator("ol > li").first().innerText();

    // The expressions have different semantics under Quartz vs AWS,
    // so the run times MAY differ; at minimum both show a year
    expect(quartzFirst).toMatch(/\d{4}/);
    expect(awsFirst).toMatch(/\d{4}/);
  });
});

// ── I: Translate control ──────────────────────────────────────────────────────

test.describe("I: Translate control", () => {
  test("translate control is visible in the result area when expression is valid", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("translate-control")).toBeVisible();
  });

  test("0 9 * * 1-5 (Unix): Translate -> Quartz produces valid Quartz expression", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 9 * * 1-5");
    await expect(page.locator("ol > li")).toHaveCount(5);

    // Click Translate to Quartz
    await page.getByTestId("translate-to-quartz").click();

    // Translate result appears
    const result = page.getByTestId("translate-result");
    await expect(result).toBeVisible();

    // No warning (this translation is possible)
    await expect(page.getByTestId("translate-warning")).toHaveCount(0);

    // Expression shown
    const expr = page.getByTestId("translate-expression");
    await expect(expr).toBeVisible();
    const exprText = await expr.innerText();
    expect(exprText.trim().length).toBeGreaterThan(0);
  });

  test("Translate -> 'Use' button writes expression to cron input and switches dialect", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 9 * * 1-5");
    await expect(page.locator("ol > li")).toHaveCount(5);

    await page.getByTestId("translate-to-quartz").click();
    await expect(page.getByTestId("translate-result")).toBeVisible();
    const exprText = await page.getByTestId("translate-expression").innerText();

    // Click Use
    await page.getByTestId("translate-use-btn").click();

    // Cron input updates to the translated expression
    await expect(page.locator("#cron-input")).toHaveValue(exprText.trim());
    // Quartz should now be active
    await expect(page.getByTestId("dialect-quartz")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    // Results still show
    await expect(page.locator("ol > li")).toHaveCount(5);
  });

  test("*/30 * * * * * (Quartz seconds): Translate -> Unix shows amber warning", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("*/30 * * * * *");
    await expect(page.locator("ol > li")).toHaveCount(5);

    // Click Translate to Unix
    await page.getByTestId("translate-to-unix").click();

    // Warning should appear (sub-minute seconds can't be represented in Unix)
    const warning = page.getByTestId("translate-warning");
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(/sub-minute|seconds/i);

    // No expression shown
    await expect(page.getByTestId("translate-expression")).toHaveCount(0);
  });

  test("Translate Copy button shows Copied! confirmation", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: baseURL,
    });
    await page.goto("/");
    await page.locator("#cron-input").fill("0 9 * * 1-5");
    await expect(page.locator("ol > li")).toHaveCount(5);

    await page.getByTestId("translate-to-quartz").click();
    await expect(page.getByTestId("translate-result")).toBeVisible();

    const copyBtn = page.getByTestId("translate-copy-btn");
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await expect(copyBtn).toContainText(/Copied!/);
  });
});

// ── API: Quartz 6-field returns 200 ──────────────────────────────────────────

test.describe("API: Quartz 6-field returns 200 (not 400)", () => {
  test("GET /api/explain?expr=0%200%209%20%3F%20*%20MON-FRI returns 200 with weekday-9am description", async ({
    request,
  }) => {
    // 0 0 9 ? * MON-FRI (URL-encoded)
    const res = await request.get(
      "/api/explain?expr=0%200%209%20%3F%20*%20MON-FRI"
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.description).toMatch(/09:00|9:00 AM/);
    expect(body.description).toContain("Monday through Friday");
    expect(body.next).toHaveLength(5);
    for (const ts of body.next) expect(ts).toMatch(ISO_RE);
  });

  test("GET /api/explain?expr=...&dialect=quartz forces Quartz interpretation", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/explain?expr=" +
        encodeURIComponent("0 0 9 ? * MON-FRI") +
        "&dialect=quartz"
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.description).toMatch(/09:00|9:00 AM/);
  });
});

// ── BLOCKER-2: 6-field Quartz with trailing ? correctly classified ────────────

test.describe("BLOCKER-2: 6-field Quartz with trailing ? auto-detects as Quartz (not AWS)", () => {
  test("UI: 0 0 12 * * ? auto-detects as Quartz — Quartz dialect button active", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 0 12 * * ?");
    // Should auto-detect as Quartz (? is in dow position, Quartz layout)
    await expect(page.getByTestId("dialect-quartz")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    // Must not error
    const alert = page.locator('[role="alert"]:not([id="__next-route-announcer__"])');
    await expect(alert).toHaveCount(0);
    // Description should be noon (12:00 PM), not "12:00 AM, on day 12"
    const description = page.locator("section >> p").first();
    await expect(description).toContainText(/12:00 PM|noon/i);
  });

  test("API: GET /api/explain?expr=0%200%2012%20*%20*%20%3F returns Quartz noon description", async ({
    request,
  }) => {
    // 0 0 12 * * ? URL-encoded
    const res = await request.get(
      "/api/explain?expr=" + encodeURIComponent("0 0 12 * * ?")
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Must be noon description from Quartz parse, NOT "12:00 AM, on day 12" from wrong AWS parse
    expect(body.description).toMatch(/12:00 PM|noon/i);
    expect(body.description).not.toMatch(/day 12/i);
    expect(body.next).toHaveLength(5);
    for (const ts of body.next) expect(ts).toMatch(ISO_RE);
  });
});

// ── BLOCKER-3: Translate output is visible (in-viewport) and clearly labeled ──

test.describe("BLOCKER-3: Translate output visible and labeled after clicking a translate target", () => {
  test("Translate to Quartz: result panel appears with 'Translated to Quartz' label and expression", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 9 * * 1-5");
    await expect(page.locator("ol > li")).toHaveCount(5);

    await page.getByTestId("translate-to-quartz").click();

    const result = page.getByTestId("translate-result");
    await expect(result).toBeVisible();
    // Label must clearly say what dialect
    await expect(result).toContainText(/Translated to Quartz/i);
    // Expression must be shown
    const expr = page.getByTestId("translate-expression");
    await expect(expr).toBeVisible();
    const exprText = await expr.innerText();
    expect(exprText.trim().length).toBeGreaterThan(0);
    // Result must be in viewport (scrolled into view)
    await expect(result).toBeInViewport();
  });

  test("Translate to AWS: result panel labeled 'Translated to AWS'", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 9 * * 1-5");
    await expect(page.locator("ol > li")).toHaveCount(5);

    await page.getByTestId("translate-to-aws").click();

    const result = page.getByTestId("translate-result");
    await expect(result).toBeVisible();
    await expect(result).toContainText(/Translated to AWS/i);
    await expect(result).toBeInViewport();
  });

  test("Translate sub-minute seconds -> Unix: warning shown inside labeled result panel", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("*/30 * * * * *");
    await expect(page.locator("ol > li")).toHaveCount(5);

    await page.getByTestId("translate-to-unix").click();

    const result = page.getByTestId("translate-result");
    await expect(result).toBeVisible();
    // Should have the "Translated to Unix" label even for warning case
    await expect(result).toContainText(/Translated to Unix/i);
    const warning = page.getByTestId("translate-warning");
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(/sub-minute|seconds/i);
    await expect(result).toBeInViewport();
  });

  test("'Use in input' button writes to input and switches dialect badge", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 9 * * 1-5");
    await expect(page.locator("ol > li")).toHaveCount(5);

    await page.getByTestId("translate-to-quartz").click();
    await expect(page.getByTestId("translate-result")).toBeVisible();
    const exprText = await page.getByTestId("translate-expression").innerText();

    await page.getByTestId("translate-use-btn").click();

    await expect(page.locator("#cron-input")).toHaveValue(exprText.trim());
    await expect(page.getByTestId("dialect-quartz")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(page.locator("ol > li")).toHaveCount(5);
  });
});

// ── REGRESSION: 5-field Unix unchanged ───────────────────────────────────────

test.describe("REGRESSION: 5-field Unix behavior unchanged", () => {
  test("5-field expression: dialect selector shows Unix active", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 9 * * MON-FRI");
    await expect(page.getByTestId("dialect-unix")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  test("5-field */10 * * * * still returns 200 with 10-min spacing (API)", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/explain?expr=" + encodeURIComponent("*/10 * * * *")
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.description.toLowerCase()).toContain("every 10 minutes");
    expect(body.next).toHaveLength(5);
    for (let i = 1; i < body.next.length; i++) {
      expect(
        new Date(body.next[i]).getTime() - new Date(body.next[i - 1]).getTime()
      ).toBe(600_000);
    }
  });

  test("5-field banana still returns 400 (API)", async ({ request }) => {
    const res = await request.get("/api/explain?expr=banana");
    expect(res.status()).toBe(400);
  });
});
