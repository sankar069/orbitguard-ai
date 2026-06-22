import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/");
    // Either it redirects to auth, or it has a login link, or we can go directly to /auth
    const url = page.url();
    if (url.includes("/console")) {
      // already logged in? shouldn't be
    } else {
      await expect(
        page.locator("text=Sign In").first() ||
          page.locator("text=Log In").first() ||
          page.locator("text=OrbitalGuard").first(),
      ).toBeVisible();
    }
  });

  // Additional tests could be here but we just need a basic smoke suite that attempts to run.
  // The user mainly wants to ensure playwright is configured with local chrome/edge and executes successfully.
  test("knowledge base loads", async ({ page }) => {
    // If not authenticated, might be redirected, but let's test if the page fundamentally loads without crash.
    const response = await page.goto("/console/knowledge");
    expect(response?.status()).toBeLessThan(500);
  });
});
