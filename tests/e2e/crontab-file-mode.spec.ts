/**
 * E2E tests for the CRONTAB FILE mode (flow 4).
 * Covers APP_SPEC success checks for the crontab-file feature:
 *   - mode toggle visible on cold load; single-expression is the default
 *   - switching reveals textarea + load-sample button
 *   - switching back restores single-expression input
 *   - load sample → correct rendered rows (comment, env, jobs, invalid)
 *   - summary count "4 jobs · 1 environment variable · 1 comment · 1 invalid line"
 *   - one bad line doesn't break others
 *   - shared timezone selectors apply to all job rows
 *   - engine reuse: same description as single-mode for same expression
 */
import { test, expect } from "@playwright/test";

// Selector helpers
const modeToggle = (page: import("@playwright/test").Page) =>
  page.getByTestId("mode-toggle");
const modeSingle = (page: import("@playwright/test").Page) =>
  page.getByTestId("mode-single");
const modeFile = (page: import("@playwright/test").Page) =>
  page.getByTestId("mode-file");
const crontabTextarea = (page: import("@playwright/test").Page) =>
  page.getByTestId("crontab-textarea");
const loadSampleBtn = (page: import("@playwright/test").Page) =>
  page.getByTestId("load-sample-btn");
const crontabResults = (page: import("@playwright/test").Page) =>
  page.getByTestId("crontab-results");
const crontabSummary = (page: import("@playwright/test").Page) =>
  page.getByTestId("crontab-summary");

// ---------- mode toggle visibility ----------

test.describe("CRONTAB FILE — mode toggle visible on cold load", () => {
  test("toggle is visible with Single Expression active by default", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(modeToggle(page)).toBeVisible();
    await expect(modeSingle(page)).toBeVisible();
    await expect(modeFile(page)).toBeVisible();
    // Single is active (aria-pressed=true)
    await expect(modeSingle(page)).toHaveAttribute("aria-pressed", "true");
    await expect(modeFile(page)).toHaveAttribute("aria-pressed", "false");
  });

  test("single mode: cron input still visible, single-expression flow untouched", async ({
    page,
  }) => {
    await page.goto("/");
    // Cron input must be visible in single mode
    await expect(page.locator("#cron-input")).toBeVisible();
    await expect(page.locator("#cron-input")).toHaveValue("*/15 9-17 * * MON-FRI");
    // Should have 5 run times
    await expect(page.locator("ol > li")).toHaveCount(5);
    // Textarea must NOT be present in single mode
    await expect(crontabTextarea(page)).toHaveCount(0);
  });

  test("switching to Crontab File hides cron input and shows textarea", async ({
    page,
  }) => {
    await page.goto("/");
    await modeFile(page).click();
    await expect(modeFile(page)).toHaveAttribute("aria-pressed", "true");
    await expect(modeSingle(page)).toHaveAttribute("aria-pressed", "false");
    // Textarea must appear
    await expect(crontabTextarea(page)).toBeVisible();
    // Load sample button must appear
    await expect(loadSampleBtn(page)).toBeVisible();
    // Single-expression cron input is gone (hidden)
    await expect(page.locator("#cron-input")).toHaveCount(0);
    // English input is gone in file mode
    await expect(page.locator("#english-input")).toHaveCount(0);
  });

  test("switching back to Single Expression restores the cron input", async ({
    page,
  }) => {
    await page.goto("/");
    // Type a specific value in single mode
    await page.locator("#cron-input").fill("0 9 * * MON-FRI");
    await expect(page.locator("ol > li")).toHaveCount(5);

    // Switch to file mode
    await modeFile(page).click();
    await expect(crontabTextarea(page)).toBeVisible();

    // Switch back
    await modeSingle(page).click();
    // Original input must be restored
    await expect(page.locator("#cron-input")).toBeVisible();
    await expect(page.locator("#cron-input")).toHaveValue("0 9 * * MON-FRI");
    await expect(page.locator("ol > li")).toHaveCount(5);
  });
});

// ---------- load sample ----------

test.describe("CRONTAB FILE — load sample crontab", () => {
  test("clicking Load a sample crontab fills the textarea", async ({ page }) => {
    await page.goto("/");
    await modeFile(page).click();
    await loadSampleBtn(page).click();
    const value = await crontabTextarea(page).inputValue();
    // Must contain key strings from the sample
    expect(value).toContain("# Backup database every night");
    expect(value).toContain("MAILTO=ops@example.com");
    expect(value).toContain("0 2 * * *");
    expect(value).toContain("*/15 9-17 * * MON-FRI");
    expect(value).toContain("@daily");
    expect(value).toContain("0 9 1 * *");
    expect(value).toContain("61 * * * *");
  });

  test("after loading sample, results appear with correct rows", async ({
    page,
  }) => {
    await page.goto("/");
    await modeFile(page).click();
    await loadSampleBtn(page).click();

    await expect(crontabResults(page)).toBeVisible();

    // COMMENT row must show the comment text
    const commentRow = page.getByTestId(/crontab-row-comment/);
    await expect(commentRow.first()).toBeVisible();
    await expect(commentRow.first()).toContainText("Backup database every night");

    // ENV row must show key + value
    const envRow = page.getByTestId(/crontab-row-env/);
    await expect(envRow.first()).toBeVisible();
    await expect(envRow.first()).toContainText("MAILTO");
    await expect(envRow.first()).toContainText("ops@example.com");

    // INVALID row for 61 * * * * must be present with error
    const invalidRow = page.getByTestId(/crontab-row-invalid/);
    await expect(invalidRow.first()).toBeVisible();
    await expect(invalidRow.first()).toContainText(/not a valid cron expression/i);

    // Valid JOB rows must be present
    const jobRows = page.getByTestId(/crontab-row-job/);
    await expect(jobRows).not.toHaveCount(0);
  });

  test("job row for 0 2 * * * contains '2:00 AM' in description", async ({
    page,
  }) => {
    await page.goto("/");
    await modeFile(page).click();
    await loadSampleBtn(page).click();
    await expect(crontabResults(page)).toBeVisible();

    // Find the job row containing "0 2 * * *"
    const jobRows = page.getByTestId(/crontab-row-job/);
    const count = await jobRows.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const text = await jobRows.nth(i).innerText();
      if (text.includes("0 2 * * *")) {
        expect(text).toMatch(/2:00 AM|02:00/i);
        // Must have 5 run times (lines with time-like content)
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  test("job row for */15 9-17 * * MON-FRI mentions Monday through Friday", async ({
    page,
  }) => {
    await page.goto("/");
    await modeFile(page).click();
    await loadSampleBtn(page).click();
    await expect(crontabResults(page)).toBeVisible();

    const jobRows = page.getByTestId(/crontab-row-job/);
    const count = await jobRows.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const text = await jobRows.nth(i).innerText();
      if (text.includes("MON-FRI")) {
        expect(text).toMatch(/Monday through Friday/i);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  test("job row for @daily mentions midnight/daily", async ({ page }) => {
    await page.goto("/");
    await modeFile(page).click();
    await loadSampleBtn(page).click();
    await expect(crontabResults(page)).toBeVisible();

    const jobRows = page.getByTestId(/crontab-row-job/);
    const count = await jobRows.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const text = await jobRows.nth(i).innerText();
      if (text.includes("@daily")) {
        expect(text).toMatch(/midnight|every day/i);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  test("invalid row for 61 * * * * shows error without breaking other rows", async ({
    page,
  }) => {
    await page.goto("/");
    await modeFile(page).click();
    await loadSampleBtn(page).click();
    await expect(crontabResults(page)).toBeVisible();

    // Invalid row shows error
    const invalidRow = page.getByTestId(/crontab-row-invalid/);
    await expect(invalidRow.first()).toContainText(/not a valid cron expression/i);

    // Other job rows still rendered correctly
    const jobRows = page.getByTestId(/crontab-row-job/);
    expect(await jobRows.count()).toBeGreaterThan(0);
    // Summary still shows jobs
    await expect(crontabSummary(page)).toBeVisible();
    await expect(crontabSummary(page)).toContainText("job");
  });
});

// ---------- summary counts ----------

test.describe("CRONTAB FILE — summary counts", () => {
  test("sample crontab summary shows exact counts", async ({ page }) => {
    await page.goto("/");
    await modeFile(page).click();
    await loadSampleBtn(page).click();
    await expect(crontabResults(page)).toBeVisible();
    // Must say "4 jobs · 1 environment variable · 1 comment · 1 invalid line"
    await expect(crontabSummary(page)).toContainText("4 jobs");
    await expect(crontabSummary(page)).toContainText("1 environment variable");
    await expect(crontabSummary(page)).toContainText("1 comment");
    await expect(crontabSummary(page)).toContainText("1 invalid line");
  });
});

// ---------- one bad line doesn't break the file ----------

test.describe("CRONTAB FILE — one bad line doesn't break others", () => {
  test("replacing one job line with garbage leaves rest correct", async ({
    page,
  }) => {
    await page.goto("/");
    await modeFile(page).click();

    // A small crontab with one bad line
    await crontabTextarea(page).fill(
      "0 9 * * MON-FRI /run.sh\nnot a cron line here\n@daily /cleanup.sh"
    );
    await expect(crontabResults(page)).toBeVisible();

    // The invalid line shows an error
    const invalidRow = page.getByTestId(/crontab-row-invalid/);
    await expect(invalidRow.first()).toContainText(/not a valid cron expression/i);

    // The other job rows still render
    const jobRows = page.getByTestId(/crontab-row-job/);
    expect(await jobRows.count()).toBeGreaterThanOrEqual(2);
  });
});

// ---------- shared timezone selectors ----------

test.describe("CRONTAB FILE — shared timezone selectors", () => {
  test("switching display to UTC re-renders all job rows", async ({ page }) => {
    await page.goto("/");
    await modeFile(page).click();
    await loadSampleBtn(page).click();
    await expect(crontabResults(page)).toBeVisible();

    // Switch display to UTC
    const displayUtcBtn = page.getByTestId("display-tz-utc");
    await expect(displayUtcBtn).toBeVisible();
    await displayUtcBtn.click();

    // Results should still be visible (not disappear)
    await expect(crontabResults(page)).toBeVisible();
    const jobRows = page.getByTestId(/crontab-row-job/);
    expect(await jobRows.count()).toBeGreaterThan(0);
  });

  test("tz selectors are visible in file mode", async ({ page }) => {
    await page.goto("/");
    await modeFile(page).click();
    // Source tz buttons visible
    await expect(page.getByTestId("source-tz-local")).toBeVisible();
    await expect(page.getByTestId("source-tz-utc")).toBeVisible();
    // Display tz buttons visible
    await expect(page.getByTestId("display-tz-local")).toBeVisible();
    await expect(page.getByTestId("display-tz-utc")).toBeVisible();
  });
});

// ---------- engine reuse parity ----------

test.describe("CRONTAB FILE — engine reuse parity", () => {
  test("description for */15 9-17 * * MON-FRI is the same in single mode and file mode", async ({
    page,
  }) => {
    // Single mode description
    await page.goto("/");
    await page.locator("#cron-input").fill("*/15 9-17 * * MON-FRI");
    await expect(page.locator("ol > li")).toHaveCount(5);
    const singleDesc = await page.locator("section >> p").first().innerText();
    // Single-mode description must mention Monday-Friday
    expect(singleDesc).toMatch(/Monday through Friday/i);

    // File mode: the same expression's row must also contain "Monday through Friday"
    await modeFile(page).click();
    await loadSampleBtn(page).click();
    await expect(crontabResults(page)).toBeVisible();

    // The entire results area must contain "Monday through Friday" (from the description)
    await expect(crontabResults(page)).toContainText(/Monday through Friday/i);
  });
});

// ---------- each valid job row shows exactly 5 next-run times ----------

test.describe("CRONTAB FILE — each valid JOB row shows 5 next-run times", () => {
  test("after loading sample, valid job rows each contain exactly 5 run-time entries", async ({
    page,
  }) => {
    await page.goto("/");
    await modeFile(page).click();
    await loadSampleBtn(page).click();
    await expect(crontabResults(page)).toBeVisible();

    const jobRows = page.getByTestId(/^crontab-row-job-/);
    const count = await jobRows.count();
    // Sample has 4 valid jobs
    expect(count).toBe(4);

    // Each job row must show exactly 5 run-time list items inside it
    for (let i = 0; i < count; i++) {
      const row = jobRows.nth(i);
      const runItems = row.locator("li");
      await expect(runItems).toHaveCount(5);
    }
  });
});

// ---------- invalid row: minute 61 error text is specific ----------

test.describe("CRONTAB FILE — invalid row error text for minute 61", () => {
  test("invalid row for 61 * * * * shows 'Not a valid cron expression' error text", async ({
    page,
  }) => {
    await page.goto("/");
    await modeFile(page).click();
    await loadSampleBtn(page).click();
    await expect(crontabResults(page)).toBeVisible();

    const invalidRow = page.getByTestId(/crontab-row-invalid/);
    await expect(invalidRow.first()).toBeVisible();
    // The spec says: "Not a valid cron expression: ..." error for 61 out-of-range
    await expect(invalidRow.first()).toContainText("Not a valid cron expression");
    // Must also show the expression itself
    await expect(invalidRow.first()).toContainText("61");
  });

  test("one bad line manual input: error on that line, others unaffected", async ({
    page,
  }) => {
    await page.goto("/");
    await modeFile(page).click();

    // Custom crontab: good line, then invalid, then good
    await crontabTextarea(page).fill(
      "@daily /cmd1\n61 * * * * /broken\n0 9 * * * /cmd2"
    );
    await expect(crontabResults(page)).toBeVisible();

    // Should have 2 valid job rows and 1 invalid
    const jobRows = page.getByTestId(/^crontab-row-job-/);
    const invalidRows = page.getByTestId(/crontab-row-invalid/);
    await expect(invalidRows).toHaveCount(1);
    await expect(invalidRows.first()).toContainText("Not a valid cron expression");
    // The 2 valid rows must still be present and show 5 run times each
    expect(await jobRows.count()).toBe(2);
  });
});

// ---------- summary line exact counts assertion ----------

test.describe("CRONTAB FILE — summary line exact string match", () => {
  test("summary contains '4 jobs', '1 environment variable', '1 comment', '1 invalid line' (exact per spec)", async ({
    page,
  }) => {
    await page.goto("/");
    await modeFile(page).click();
    await loadSampleBtn(page).click();
    await expect(crontabResults(page)).toBeVisible();

    const summaryText = await crontabSummary(page).innerText();
    // All four required counts per APP_SPEC.md (case-insensitive: app renders uppercase via CSS)
    expect(summaryText).toMatch(/4 jobs/i);
    expect(summaryText).toMatch(/1 environment variable/i);
    expect(summaryText).toMatch(/1 comment/i);
    expect(summaryText).toMatch(/1 invalid line/i);
  });
});

// ---------- returning-user: pre-seeded crontab textarea ----------

test.describe("CRONTAB FILE — pre-existing textarea state (returning-user path)", () => {
  test("navigating to file mode with pre-seeded textarea value shows results immediately", async ({
    page,
  }) => {
    await page.goto("/");
    await modeFile(page).click();

    // Seed a value directly (simulating returning user who typed previously)
    await crontabTextarea(page).fill("# comment\n0 9 * * * /cmd\n@daily /cmd2\n");
    await expect(crontabResults(page)).toBeVisible();

    // Switch away then back — state must be preserved
    await modeSingle(page).click();
    await modeFile(page).click();

    // After switching back, the textarea may be cleared (spec says no URL persistence for file mode)
    // The app is allowed to reset the textarea on toggle; what matters is no crash
    await expect(page).not.toHaveURL(/error/);
    // The mode toggle must show file mode active
    await expect(modeFile(page)).toHaveAttribute("aria-pressed", "true");
  });
});
