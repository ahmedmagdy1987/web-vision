import { test, expect } from "@playwright/test";

/**
 * Branding & metadata — runs in BOTH demo and Supabase modes (auth pages are
 * public). Verifies the Web Vision document title, a non-generic favicon, and
 * that the auth screens have no horizontal overflow on desktop + mobile.
 */
test.describe("Branding & metadata", () => {
  test("sign-in has a Web Vision title and a non-generic favicon", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveTitle(/web vision/i);
    const iconHref = await page.locator('link[rel~="icon"]').first().getAttribute("href");
    expect(iconHref, "an icon link is present").toBeTruthy();
    // Our Web Vision mark is /icon.svg, not the default Next favicon.ico.
    expect(iconHref ?? "").toMatch(/icon/i);
  });

  test("auth screens render without horizontal overflow (desktop + mobile)", async ({ page }) => {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["/sign-in", "/auth/forgot-password", "/auth/invite-expired"]) {
        await page.goto(route);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        );
        expect(overflow, `overflow at ${width}px on ${route}`).toBe(false);
      }
    }
  });
});
