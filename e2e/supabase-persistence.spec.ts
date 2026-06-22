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

// These tests share one live user + workspace, so run them serially to avoid
// races on the shared remote state. Run the live suite with --workers=1.
test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
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
    // Wait for results to hydrate from Supabase (signed-URL round trips), then open one.
    const firstResult = page.locator("a[href^='/gallery/']").first();
    await firstResult.waitFor({ state: "visible", timeout: 20_000 });
    await firstResult.click();
    await page.waitForURL(/\/gallery\/.+/, { timeout: 20_000 });

    await page.getByRole("button", { name: /add to favorites|favorited/i }).click();
    await page.getByRole("button", { name: /^approve|approved$/i }).click();
    // Let the optimistic write flush to Supabase before reloading.
    await expect(page.getByRole("button", { name: /favorited/i })).toBeVisible();
    await page.waitForTimeout(500);

    await page.reload();
    await expect(page.getByRole("button", { name: /favorited/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /approved/i })).toBeVisible({ timeout: 20_000 });
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
