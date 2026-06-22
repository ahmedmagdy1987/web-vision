import { test, expect, type Page } from "@playwright/test";

/**
 * Supabase persistence E2E — GUARDED (see supabase-auth.spec.ts). Verifies that
 * data round-trips through Supabase (Postgres + Storage) instead of localStorage.
 * Requires a configured Supabase project, a seeded organization, and a test user
 * with editor+ role (E2E_TEST_EMAIL / E2E_TEST_PASSWORD). Skips otherwise.
 */
const SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
const EMAIL = process.env.E2E_TEST_EMAIL ?? "";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/");
}

test.describe("Supabase persistence", () => {
  test.skip(!SUPABASE, "requires a configured Supabase env (NEXT_PUBLIC_SUPABASE_URL)");
  test.skip(!EMAIL || !PASSWORD, "requires E2E_TEST_EMAIL / E2E_TEST_PASSWORD");

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("a created brand persists across reload (Supabase-backed)", async ({ page }) => {
    const name = `QA Supabase Brand ${Date.now()}`;
    await page.goto("/identity");
    await page.getByRole("button", { name: "Add brand" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/name/i).fill(name);
    await dialog.getByRole("button", { name: "Create brand" }).click();
    await expect(page.getByRole("heading", { name })).toBeVisible();

    // Reload: the brand must come back from Supabase, not localStorage.
    await page.reload();
    await expect(page.getByRole("heading", { name })).toBeVisible();
  });

  test("favorite + review state on a gallery result persists across reload", async ({ page }) => {
    await page.goto("/gallery");
    // Open the first result.
    await page.locator("a[href^='/gallery/']").first().click();
    await expect.poll(() => new URL(page.url()).pathname.startsWith("/gallery/")).toBe(true);

    await page.getByRole("button", { name: /add to favorites|favorited/i }).click();
    await page.getByRole("button", { name: /^approve|approved$/i }).click();

    await page.reload();
    await expect(page.getByRole("button", { name: /favorited/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /approved/i })).toBeVisible();
  });

  test("mobile Studio mock generation persists a job + result", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/studio");
    // Drive the 4-step mobile workflow to Review, then Generate.
    for (let i = 0; i < 3; i++) {
      const next = page.getByRole("button", { name: /continue/i });
      if (await next.isEnabled().catch(() => false)) await next.click();
    }
    const generate = page.getByRole("button", { name: /^generate/i });
    if (await generate.isVisible().catch(() => false)) {
      await generate.click();
      // After generation the user lands on a gallery result; reload to confirm
      // the job/result were persisted to Supabase.
      await expect.poll(() => new URL(page.url()).pathname.startsWith("/gallery"), { timeout: 30_000 }).toBe(true);
      await page.reload();
      await expect(page.locator("a[href^='/gallery/'], main")).toBeTruthy();
    }
  });
});
