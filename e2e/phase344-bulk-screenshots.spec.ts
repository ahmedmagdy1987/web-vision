import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Phase 3.4.4 bulk-management screenshots. Runs against either backend:
 *  - DEMO (localStorage seed): no auth needed — `WV_FORCE_DEMO=1 npx playwright test phase344-bulk`.
 *  - Live SUPABASE: signs in with E2E_TEST_EMAIL/PASSWORD (skips if those are absent).
 * Covers the Part-5 additions: checkbox-only product selection plus multi-select
 * + bulk delete for Locations and Logos. NEVER confirms a delete (always Escape),
 * so no data is mutated, and makes NO OpenAI request.
 */
const DIR = "artifacts/web-vision-phase-3-4-4-bulk";
const MOBILE = { width: 390, height: 844 };
const SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
const EMAIL = process.env.E2E_TEST_EMAIL ?? "";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe("/");
}

async function settle(page: Page, route: string) {
  await page.goto(route, { waitUntil: "networkidle" }).catch(() => undefined);
  await page.waitForTimeout(800);
}

/** Select up to two assets via their checkboxes (selection is checkbox-only). */
async function selectUpToTwo(page: Page) {
  const checks = page.getByRole("checkbox", { name: /^Select/ });
  await expect(checks.first()).toBeVisible({ timeout: 15_000 });
  const n = await checks.count();
  await checks.nth(0).click();
  if (n > 1) await checks.nth(1).click();
}

async function openBulkDialog(page: Page, region: string) {
  await page.getByRole("region", { name: region }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 8_000 });
}

test.describe("Phase 3.4.4 bulk management", () => {
  // A live Supabase run needs credentials to reach the auth-gated pages; the demo
  // backend needs none.
  test.skip(SUPABASE && (!EMAIL || !PASSWORD), "live Supabase run requires E2E_TEST_EMAIL / E2E_TEST_PASSWORD");
  test.beforeAll(() => mkdirSync(DIR, { recursive: true }));

  test("desktop: checkbox-only products + Locations & Logos bulk delete", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    if (SUPABASE) await signIn(page);

    // Products — checkboxes are always visible; selection is checkbox-only and an
    // image click opens the Lightbox (never selects).
    await settle(page, "/products");
    await selectUpToTwo(page);
    await expect(page.getByRole("region", { name: "Product selection" })).toBeVisible();
    await page.screenshot({ path: `${DIR}/01-products-checkbox-selection-desktop.png` });

    // Locations — multi-select + bulk delete confirmation (delete vs archive split).
    await settle(page, "/locations");
    await selectUpToTwo(page);
    await expect(page.getByRole("region", { name: "Location selection" })).toBeVisible();
    await page.screenshot({ path: `${DIR}/02-locations-selection-desktop.png` });
    await openBulkDialog(page, "Location selection");
    await page.screenshot({ path: `${DIR}/03-locations-bulk-delete-confirmation.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Logos — multi-select + bulk delete confirmation.
    await settle(page, "/logos");
    await selectUpToTwo(page);
    await expect(page.getByRole("region", { name: "Logo selection" })).toBeVisible();
    await page.screenshot({ path: `${DIR}/04-logos-selection-desktop.png` });
    await openBulkDialog(page, "Logo selection");
    await page.screenshot({ path: `${DIR}/05-logos-bulk-delete-confirmation.png` });
    await page.keyboard.press("Escape");

    expect(errors, `page errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("mobile: Locations bulk selection + confirmation", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(MOBILE);
    if (SUPABASE) await signIn(page);
    await settle(page, "/locations");
    await selectUpToTwo(page);
    await expect(page.getByRole("region", { name: "Location selection" })).toBeVisible();
    await page.screenshot({ path: `${DIR}/06-locations-bulk-selection-mobile.png` });
    await openBulkDialog(page, "Location selection");
    await page.screenshot({ path: `${DIR}/07-locations-bulk-delete-mobile.png` });
    await page.keyboard.press("Escape");
  });
});
