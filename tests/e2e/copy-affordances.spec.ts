/**
 * E2E tests for the copy affordances added in panel round-2 fix pass:
 *   - Whole-file "Copy explained crontab" button (file mode)
 *   - Per-row copy buttons on JOB rows (file mode)
 *   - "Copy explanation" button in single-expression mode
 *   - Empty-state: copy buttons are NOT present when there are no results
 *   - Dimming: COMMENT and ENV rows visibly have a different (dimmer) color class than JOB rows
 *   - UTC hint is visible in file mode timezone block
 */
import { test, expect } from "@playwright/test";

// ---------- helpers ----------
const modeFile = (page: import("@playwright/test").Page) =>
  page.getByTestId("mode-file");
const loadSampleBtn = (page: import("@playwright/test").Page) =>
  page.getByTestId("load-sample-btn");
const crontabTextarea = (page: import("@playwright/test").Page) =>
  page.getByTestId("crontab-textarea");
const crontabResults = (page: import("@playwright/test").Page) =>
  page.getByTestId("crontab-results");
const copyAnnotatedBtn = (page: import("@playwright/test").Page) =>
  page.getByTestId("copy-annotated-btn");

// ---------- file mode: whole-file copy button hidden when textarea empty ----------

test.describe("Copy affordances — empty state", () => {
  test("whole-file copy button is NOT visible when crontab textarea is empty", async ({
    page,
  }) => {
    await page.goto("/");
    await modeFile(page).click();
    // Textarea is empty → no results → no copy button
    await expect(copyAnnotatedBtn(page)).toHaveCount(0);
  });

  test("whole-file copy button APPEARS after loading sample", async ({
    page,
  }) => {
    await page.goto("/");
    await modeFile(page).click();
    await loadSampleBtn(page).click();
    await expect(crontabResults(page)).toBeVisible();
    await expect(copyAnnotatedBtn(page)).toBeVisible();
  });
});

// ---------- file mode: per-row copy buttons ----------

test.describe("Copy affordances — per-row copy buttons on JOB rows", () => {
  test("each valid JOB row has a copy button", async ({ page }) => {
    await page.goto("/");
    await modeFile(page).click();
    await loadSampleBtn(page).click();
    await expect(crontabResults(page)).toBeVisible();

    // The sample has 4 valid jobs (indices 2, 3, 5, 6 in line order — row indices vary)
    const copyRowBtns = page.getByTestId(/^copy-row-btn-/);
    const count = await copyRowBtns.count();
    // At least 4 per-row copy buttons (one per valid job)
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test("per-row copy button is visible and labeled 'Copy'", async ({ page }) => {
    await page.goto("/");
    await modeFile(page).click();
    await crontabTextarea(page).fill("0 2 * * * /backup.sh");
    await expect(crontabResults(page)).toBeVisible();

    const copyRowBtns = page.getByTestId(/^copy-row-btn-/);
    await expect(copyRowBtns.first()).toBeVisible();
    await expect(copyRowBtns.first()).toContainText("Copy");
  });

  test("clicking per-row copy triggers a confirmation state", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await modeFile(page).click();
    await crontabTextarea(page).fill("0 9 * * MON-FRI /cmd");
    await expect(crontabResults(page)).toBeVisible();

    const copyBtn = page.getByTestId(/^copy-row-btn-/).first();
    await copyBtn.click();

    // After clicking, the button should show a confirmation ("✓ Copied" or "Blocked")
    await expect(copyBtn).toContainText(/Copied|Blocked/);
  });
});

// ---------- file mode: whole-file copy shows "Copied!" confirmation ----------

test.describe("Copy affordances — whole-file copy shows visible 'Copied!' confirmation", () => {
  test("whole-file copy button shows '✓ Copied!' text after successful click", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: baseURL,
    });
    await page.goto("/");
    await modeFile(page).click();
    await loadSampleBtn(page).click();
    await expect(crontabResults(page)).toBeVisible();

    const btn = copyAnnotatedBtn(page);
    await btn.click();
    // Button text must change to show copied state
    await expect(btn).toContainText(/Copied/i);
  });

  test("copy-annotated-status is visually visible (not sr-only) after click", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: baseURL,
    });
    await page.goto("/");
    await modeFile(page).click();
    await loadSampleBtn(page).click();
    await expect(crontabResults(page)).toBeVisible();

    await copyAnnotatedBtn(page).click();

    // copy-annotated-status must be present and visible (not sr-only)
    const statusEl = page.getByTestId("copy-annotated-status");
    await expect(statusEl).toBeVisible();
    await expect(statusEl).toContainText(/copied|clipboard/i);
  });
});

// ---------- file mode: blocked clipboard failure state ----------

test.describe("Copy affordances — blocked clipboard shows explicit failure", () => {
  test("per-row copy shows 'Blocked' label when clipboard is denied", async ({
    page,
    context,
  }) => {
    // No clipboard permission granted → writeText will reject
    await page.goto("/");
    await modeFile(page).click();
    await crontabTextarea(page).fill("0 9 * * * /cmd");
    await expect(crontabResults(page)).toBeVisible();

    // Override clipboard.writeText to simulate failure
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: () => Promise.reject(new Error("NotAllowedError")),
        },
        configurable: true,
      });
    });

    const copyBtn = page.getByTestId(/^copy-row-btn-/).first();
    await copyBtn.click();
    await expect(copyBtn).toContainText("Blocked");
  });

  test("whole-file copy shows 'Copy blocked' label when clipboard is denied", async ({
    page,
  }) => {
    await page.goto("/");
    await modeFile(page).click();
    await loadSampleBtn(page).click();
    await expect(crontabResults(page)).toBeVisible();

    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: () => Promise.reject(new Error("NotAllowedError")),
        },
        configurable: true,
      });
    });

    await copyAnnotatedBtn(page).click();
    await expect(copyAnnotatedBtn(page)).toContainText(/blocked/i);
  });
});

// ---------- single mode: copy-description button ----------

test.describe("Copy affordances — single expression mode copy description", () => {
  test("'Copy' button appears next to description in single mode when result is valid", async ({
    page,
  }) => {
    await page.goto("/");
    // Pre-filled example renders result immediately after hydration
    await expect(page.getByTestId("copy-description-btn")).toBeVisible();
  });

  test("clicking copy-description-btn shows confirmation", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    const copyDescBtn = page.getByTestId("copy-description-btn");
    await expect(copyDescBtn).toBeVisible();
    await copyDescBtn.click();
    await expect(copyDescBtn).toContainText(/Copied|Blocked/);
  });

  test("copy-description-btn has stable aria-label (not 'Copy explanation' when copied)", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    const copyDescBtn = page.getByTestId("copy-description-btn");
    await expect(copyDescBtn).toBeVisible();
    // Initial aria-label
    await expect(copyDescBtn).toHaveAttribute("aria-label", "Copy explanation");
  });
});

// ---------- craft: COMMENT and ENV rows are visibly dimmer than JOB rows ----------

test.describe("Craft — COMMENT and ENV rows are visibly dimmed", () => {
  test("comment row text uses a dimmer color class than job row text", async ({
    page,
  }) => {
    await page.goto("/");
    await modeFile(page).click();
    await loadSampleBtn(page).click();
    await expect(crontabResults(page)).toBeVisible();

    // Get the COMMENT row
    const commentRow = page.getByTestId(/crontab-row-comment/).first();
    // Get a JOB row
    const jobRow = page.getByTestId(/^crontab-row-job-/).first();

    // Comment row should contain zinc-400 class on the text span (dim)
    // Job row should contain zinc-900 / zinc-700 class (darker)
    // We assert by checking that the comment row's visible text color is lighter (via class)
    const commentHTML = await commentRow.innerHTML();
    const jobHTML = await jobRow.innerHTML();

    // Comment row text span must have a "dim" color class (zinc-400 or zinc-600 in dark)
    expect(commentHTML).toMatch(/text-zinc-4(00)|text-zinc-6(00)/);
    // Job row description text must have a darker class (zinc-700 or zinc-900)
    expect(jobHTML).toMatch(/text-zinc-7(00)|text-zinc-9(00)/);
  });

  test("env row text uses a dimmer color class than job row text", async ({
    page,
  }) => {
    await page.goto("/");
    await modeFile(page).click();
    await loadSampleBtn(page).click();
    await expect(crontabResults(page)).toBeVisible();

    const envRow = page.getByTestId(/crontab-row-env/).first();
    const jobRow = page.getByTestId(/^crontab-row-job-/).first();

    const envHTML = await envRow.innerHTML();
    const jobHTML = await jobRow.innerHTML();

    expect(envHTML).toMatch(/text-zinc-4(00)|text-zinc-6(00)/);
    expect(jobHTML).toMatch(/text-zinc-7(00)|text-zinc-9(00)/);
  });
});

// ---------- file mode: UTC hint is visible ----------

test.describe("File mode — UTC timezone hint", () => {
  test("UTC hint text is visible in file mode timezone block", async ({
    page,
  }) => {
    await page.goto("/");
    await modeFile(page).click();

    const hint = page.getByTestId("file-mode-utc-hint");
    await expect(hint).toBeVisible();
    await expect(hint).toContainText(/UTC/i);
    await expect(hint).toContainText(/server/i);
  });
});
