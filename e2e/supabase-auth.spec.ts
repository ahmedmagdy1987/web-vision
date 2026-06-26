import { test, expect, type Page } from "@playwright/test";

type FlashWindow = Window & { __sawPending?: boolean };

/** Arm a MutationObserver that flips a flag if the "Access pending" screen ever
 *  appears in the DOM — catches even a sub-frame flash. Re-runs on every load. */
async function armPendingDetector(page: Page) {
  await page.addInitScript(() => {
    const w = window as FlashWindow;
    w.__sawPending = false;
    const scan = () => {
      if (/access pending/i.test(document.body?.innerText ?? "")) w.__sawPending = true;
    };
    const start = () => {
      scan();
      new MutationObserver(scan).observe(document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    };
    if (document.body) start();
    else window.addEventListener("DOMContentLoaded", start);
  });
}
const sawPending = (page: Page) => page.evaluate(() => (window as FlashWindow).__sawPending ?? false);

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/");
}

/**
 * Supabase auth E2E — GUARDED. These tests only run when a Supabase project is
 * configured (NEXT_PUBLIC_SUPABASE_URL set) AND a seeded test user is provided
 * via E2E_TEST_EMAIL / E2E_TEST_PASSWORD. Without those they skip, so the
 * default demo Playwright suite stays green (no Docker / no remote required).
 *
 * To run:
 *   1. Configure .env.local with the Supabase project + start the prod server.
 *   2. Seed an org + a member user (see docs/SUPABASE.md "Auth bootstrap").
 *   3. E2E_TEST_EMAIL=... E2E_TEST_PASSWORD=... npm run test:e2e
 */
const SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
const EMAIL = process.env.E2E_TEST_EMAIL ?? "";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";

// Shares the live user (sign in/out), so run serially. Use --workers=1 for the
// live suite to avoid cross-file races on the shared remote session/workspace.
test.describe.configure({ mode: "serial" });

test.describe("Supabase auth", () => {
  test.skip(!SUPABASE, "requires a configured Supabase env (NEXT_PUBLIC_SUPABASE_URL)");

  test("unauthenticated visit to a protected route redirects to /sign-in", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/");
    await expect.poll(() => new URL(page.url()).pathname).toBe("/sign-in");
  });

  test.describe("with test credentials", () => {
    test.skip(!EMAIL || !PASSWORD, "requires E2E_TEST_EMAIL / E2E_TEST_PASSWORD");

    test("sign in lands on the app, protected nav works, then sign out", async ({ page }) => {
      await page.goto("/sign-in");
      await page.getByLabel("Email").fill(EMAIL);
      await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();

      // Lands on the application shell.
      await expect.poll(() => new URL(page.url()).pathname).toBe("/");

      // Protected navigation works while authenticated. ("Gallery" appears in
      // both the sidebar and the mobile nav, so target the first visible link.)
      await page.getByRole("link", { name: "Gallery", exact: true }).first().click();
      await expect.poll(() => new URL(page.url()).pathname).toBe("/gallery");

      // Sign out via the account menu returns to /sign-in.
      await page.getByRole("button", { name: "Account menu" }).click();
      await page.getByRole("menuitem", { name: "Sign out" }).click();
      await expect.poll(() => new URL(page.url()).pathname).toBe("/sign-in");
    });

    test("an authorized sign-in never flashes Access pending and the app loads", async ({ page }) => {
      await armPendingDetector(page);
      await signIn(page, EMAIL, PASSWORD);
      // App shell is rendered (nav present), not stuck on a splash or pending.
      await page.getByRole("link", { name: "Gallery", exact: true }).first().waitFor({ timeout: 15_000 });
      expect(await sawPending(page), "Access pending flashed during sign-in").toBe(false);
    });

    test("refreshing a protected route restores the session with no Access-pending flash", async ({ page }) => {
      await armPendingDetector(page);
      await signIn(page, EMAIL, PASSWORD);
      await page.goto("/gallery");
      await expect.poll(() => new URL(page.url()).pathname).toBe("/gallery");

      // Reload re-runs the init script (fresh flag) and restores the session.
      await page.reload({ waitUntil: "domcontentloaded" });
      // No sign-in flash: stays on the protected route.
      await expect.poll(() => new URL(page.url()).pathname).toBe("/gallery");
      await page.getByRole("link", { name: "Gallery", exact: true }).first().waitFor({ timeout: 15_000 });
      expect(await sawPending(page), "Access pending flashed on refresh").toBe(false);
    });
  });
});
