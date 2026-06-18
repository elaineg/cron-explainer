/**
 * Timezone add-feature e2e tests (2026-06-18)
 * Covers:
 *   - SOURCE tz selector visible and defaults to Local
 *   - DISPLAY tz selector (Local/UTC chips) extended
 *   - Relationship line appears only when source ≠ display
 *   - Legacy ?tz=UTC permalink still displays in UTC
 *   - ?src= param restores source tz
 *   - ?tz= + ?src= round-trip permalink
 *   - Stable test-ids: source-tz-select, display-tz-select, tz-relationship
 */
import { test, expect } from "@playwright/test";

test.describe("TIMEZONE: source selector visible on cold load", () => {
  test("source tz block is visible with Local chip active by default", async ({
    page,
  }) => {
    await page.goto("/");
    const localBtn = page.getByTestId("source-tz-local");
    const utcBtn = page.getByTestId("source-tz-utc");
    await expect(localBtn).toBeVisible();
    await expect(utcBtn).toBeVisible();
    // Local is active (aria-pressed=true) by default
    await expect(localBtn).toHaveAttribute("aria-pressed", "true");
    await expect(utcBtn).toHaveAttribute("aria-pressed", "false");
  });

  test("source tz combobox (Other…) is visible", async ({ page }) => {
    await page.goto("/");
    const picker = page.getByTestId("source-tz-select");
    await expect(picker).toBeVisible();
  });

  test("nudge caption about UTC servers is visible", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText(/servers usually run cron in UTC/i)
    ).toBeVisible();
  });

  test("privacy line is visible", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText(/runs entirely in your browser/i)
    ).toBeVisible();
  });
});

test.describe("TIMEZONE: display selector", () => {
  test("display Local/UTC chips are visible in the paired timezone row", async ({
    page,
  }) => {
    await page.goto("/");
    const localBtn = page.getByTestId("display-tz-local");
    const utcBtn = page.getByTestId("display-tz-utc");
    await expect(localBtn).toBeVisible();
    await expect(utcBtn).toBeVisible();
    await expect(localBtn).toHaveAttribute("aria-pressed", "true");
    await expect(utcBtn).toHaveAttribute("aria-pressed", "false");
  });

  test("display tz combobox (Other…) is visible", async ({ page }) => {
    await page.goto("/");
    const picker = page.getByTestId("display-tz-select");
    await expect(picker).toBeVisible();
  });

  test("switching display to UTC shows UTC in the Next 5 runs header", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("display-tz-utc").click();
    const tzHeader = page.locator("h2").filter({ hasText: /next 5 runs/i });
    await expect(tzHeader).toBeVisible();
    const text = await tzHeader.innerText();
    expect(text).toMatch(/UTC/);
  });
});

test.describe("TIMEZONE: relationship line", () => {
  test("relationship line is NOT shown when source=Local and display=Local (default)", async ({
    page,
  }) => {
    await page.goto("/");
    // Default: both local — no relationship line
    await expect(page.getByTestId("tz-relationship")).toHaveCount(0);
  });

  test("relationship line appears when source=UTC and display=Local", async ({
    page,
  }) => {
    await page.goto("/");
    // Set source to UTC
    await page.getByTestId("source-tz-utc").click();
    // Display stays Local — now source ≠ display, relationship line should appear
    const relLine = page.getByTestId("tz-relationship");
    await expect(relLine).toBeVisible();
    const text = await relLine.innerText();
    // Must mention UTC and local tz with a · separator
    expect(text).toMatch(/·/);
    expect(text).toMatch(/UTC/);
  });

  test("relationship line disappears when source and display are set to the same zone", async ({
    page,
  }) => {
    await page.goto("/");
    // Set source to UTC
    await page.getByTestId("source-tz-utc").click();
    // Relationship line visible
    await expect(page.getByTestId("tz-relationship")).toBeVisible();
    // Set display to UTC too
    await page.getByTestId("display-tz-utc").click();
    // Now both UTC → relationship line hidden
    await expect(page.getByTestId("tz-relationship")).toHaveCount(0);
  });
});

test.describe("TIMEZONE: permalink params", () => {
  test("legacy ?tz=UTC permalink still displays in UTC", async ({ page }) => {
    await page.goto("/?expr=0%209%20*%20*%20*&tz=UTC");
    // Display UTC chip should be active
    await expect(page.getByTestId("display-tz-utc")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    // Header should show UTC
    const tzHeader = page.locator("h2").filter({ hasText: /next 5 runs/i });
    const text = await tzHeader.innerText();
    expect(text).toMatch(/UTC/);
  });

  test("?src=UTC param restores source tz to UTC", async ({ page }) => {
    await page.goto("/?src=UTC");
    await expect(page.getByTestId("source-tz-utc")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  test("permalink includes ?src= when source is non-local", async ({ page }) => {
    await page.goto("/");
    // Fill valid expression, set source to UTC
    await page.locator("#cron-input").fill("0 9 * * *");
    await page.getByTestId("source-tz-utc").click();
    const permalink = page.getByTestId("permalink");
    await expect(permalink).toBeVisible();
    const href = await permalink.getAttribute("href");
    expect(href).toContain("src=UTC");
  });

  test("permalink omits ?src= when source is local (default)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 9 * * *");
    // Source stays local (default)
    const permalink = page.getByTestId("permalink");
    await expect(permalink).toBeVisible();
    const href = await permalink.getAttribute("href");
    expect(href).not.toContain("src=");
  });

  test("permalink omits ?tz= when display is local (default)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 9 * * *");
    const permalink = page.getByTestId("permalink");
    await expect(permalink).toBeVisible();
    const href = await permalink.getAttribute("href");
    expect(href).not.toContain("tz=");
  });

  test("permalink includes ?tz=UTC when display is UTC", async ({ page }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("0 9 * * *");
    await page.getByTestId("display-tz-utc").click();
    const permalink = page.getByTestId("permalink");
    const href = await permalink.getAttribute("href");
    expect(href).toContain("tz=UTC");
  });

  test("opening a link with ?tz=UTC and ?src=UTC restores both selectors", async ({
    page,
  }) => {
    await page.goto("/e/0%209%20*%20*%20*?tz=UTC&src=UTC");
    await expect(page.getByTestId("source-tz-utc")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(page.getByTestId("display-tz-utc")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});

test.describe("TIMEZONE: back-compat — default source = local", () => {
  test("on first load (no params), prefilled example produces 5 runs same as before", async ({
    page,
  }) => {
    await page.goto("/");
    // Source = local by default
    await expect(page.getByTestId("source-tz-local")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    // 5 run times rendered
    await expect(page.locator("ol > li")).toHaveCount(5);
    // Display = local by default
    await expect(page.getByTestId("display-tz-local")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});
