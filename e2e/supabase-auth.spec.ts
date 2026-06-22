import { test, expect } from "@playwright/test";

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
      await page.getByLabel("Password").fill(PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();

      // Lands on the application shell.
      await expect.poll(() => new URL(page.url()).pathname).toBe("/");

      // Protected navigation works while authenticated.
      await page.getByRole("link", { name: "Gallery", exact: true }).click();
      await expect.poll(() => new URL(page.url()).pathname).toBe("/gallery");

      // Sign out via the account menu returns to /sign-in.
      await page.getByRole("button", { name: "Account menu" }).click();
      await page.getByRole("menuitem", { name: "Sign out" }).click();
      await expect.poll(() => new URL(page.url()).pathname).toBe("/sign-in");
    });
  });
});
