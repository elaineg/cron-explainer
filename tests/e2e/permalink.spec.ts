import { test, expect } from "@playwright/test";

// Core flow 4: shareable permalinks at /e/<url-encoded-expression>.

test.describe("Core flow 4: /e/<expr> permalink pages", () => {
  test("/e/<encoded valid expr> renders input, description and 5 run times with no interaction", async ({
    page,
  }) => {
    await page.goto("/e/0%209%20*%20*%20MON-FRI");

    // Expression is pre-filled in the input.
    await expect(page.locator("#cron-input")).toHaveValue("0 9 * * MON-FRI");

    // Description already rendered.
    const description = page.locator("section >> p").first();
    await expect(description).toContainText(/09:00|9:00 AM/);
    await expect(description).toContainText("Monday through Friday");

    // Exactly 5 run times already shown.
    await expect(page.locator("ol > li")).toHaveCount(5);
  });

  test("raw HTML of /e/%2A%2F10%20%2A%20%2A%20%2A%20%2A contains the description without JS", async ({
    request,
  }) => {
    const res = await request.get("/e/%2A%2F10%20%2A%20%2A%20%2A%20%2A");
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html.toLowerCase()).toContain("every 10 minutes");
  });

  test("raw HTML of /e/banana is not a 5xx and server-renders the error and prefilled input", async ({
    request,
  }) => {
    const res = await request.get("/e/banana");
    expect(res.status()).toBeLessThan(500);
    const html = await res.text();
    expect(html.toLowerCase()).toContain("not a valid cron expression");
    expect(html).toContain('value="banana"');
  });

  test("/e/banana shows banana in the input with the inline error and is not a 5xx", async ({
    page,
  }) => {
    const response = await page.goto("/e/banana");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);

    await expect(page.locator("#cron-input")).toHaveValue("banana");

    const alert = page.locator(
      '[role="alert"]:not([id="__next-route-announcer__"])'
    );
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/not a valid cron expression/i);

    // No results are shown for an invalid permalink.
    await expect(page.locator("ol > li")).toHaveCount(0);
  });
});

test.describe("Core flow 4: permalink + copy UI on the home page", () => {
  test("typing a valid expression reveals a permalink to /e/<encoded expr> and a copy control", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: baseURL,
    });
    await page.goto("/");
    await page.locator("#cron-input").fill("0 9 * * MON-FRI");

    const permalink = page.getByTestId("permalink");
    await expect(permalink).toBeVisible();
    await expect(permalink).toHaveAttribute(
      "href",
      "/e/0%209%20*%20*%20MON-FRI"
    );
    // The visible link text is the absolute URL.
    await expect(permalink).toContainText("/e/0%209%20*%20*%20MON-FRI");
    await expect(permalink).toContainText(new URL(baseURL!).origin);

    // Copy control puts the absolute URL on the clipboard.
    // NOTE: locate by a name matching BOTH states ("Copy link" / "Copied!");
    // a /copy/i name filter stops matching once the text flips to "Copied!".
    const copyButton = page.getByRole("button", { name: /copy link|copied/i });
    await expect(copyButton).toBeVisible();
    await expect(copyButton).toHaveText(/copy link/i);
    await copyButton.click();
    await expect(copyButton).toHaveText(/copied/i);
    const clipboard = await page.evaluate(() =>
      navigator.clipboard.readText()
    );
    expect(clipboard).toBe(
      `${new URL(baseURL!).origin}/e/0%209%20*%20*%20MON-FRI`
    );
  });

  test("permalink updates as the expression changes and disappears for invalid input", async ({
    page,
  }) => {
    await page.goto("/");
    const input = page.locator("#cron-input");
    const permalink = page.getByTestId("permalink");

    await input.fill("@daily");
    await expect(permalink).toHaveAttribute("href", "/e/%40daily");

    await input.fill("banana");
    await expect(permalink).toHaveCount(0);

    await input.fill("*/5 * * * *");
    await expect(permalink).toHaveAttribute(
      "href",
      "/e/*%2F5%20*%20*%20*%20*"
    );
  });

  test("clicking the permalink navigates to a working /e/ page", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#cron-input").fill("@hourly");
    await page.getByTestId("permalink").click();
    await expect(page).toHaveURL(/\/e\/%40hourly$/);
    await expect(page.locator("#cron-input")).toHaveValue("@hourly");
    await expect(page.locator("ol > li")).toHaveCount(5);
  });
});
