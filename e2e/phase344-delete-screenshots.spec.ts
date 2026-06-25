import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Phase 3.4.4 delete/archive/bulk — captures the custom Malahi confirmation
 * dialogs. NEVER confirms (always Cancel/Escape) so no asset is mutated, and
 * makes NO OpenAI request.
 */
const SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
const EMAIL = process.env.E2E_TEST_EMAIL ?? "";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";
const DIR = "artifacts/web-vision-phase-3-4-4-final-release";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe("/");
}

async function openCardDelete(page: Page, actionsNamePattern: RegExp) {
  const actions = page.getByRole("button", { name: actionsNamePattern }).first();
  await actions.scrollIntoViewIfNeeded();
  await actions.click({ force: true });
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test.describe("Phase 3.4.4 delete dialogs", () => {
  test.skip(!SUPABASE || !EMAIL || !PASSWORD, "requires live Supabase + creds");
  test.beforeAll(() => mkdirSync(DIR, { recursive: true }));

  test("product + bulk delete confirmations (desktop)", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    await signIn(page);
    await page.goto("/products", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    await openCardDelete(page, /^Actions for/);
    await page.screenshot({ path: `${DIR}/03-product-delete-confirmation.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Bulk: select two products via their checkboxes, then Delete from the bar.
    const checks = page.getByRole("checkbox", { name: /^Select/ });
    const n = await checks.count();
    await checks.nth(0).click({ force: true });
    if (n > 1) await checks.nth(1).click({ force: true });
    await page
      .getByRole("region", { name: "Product selection" })
      .getByRole("button", { name: "Delete" })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({ path: `${DIR}/04-products-bulk-delete-confirmation.png` });
    await page.keyboard.press("Escape");

    expect(errors).toHaveLength(0);
  });

  test("location + logo delete confirmations (desktop + mobile)", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);

    await page.goto("/locations", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await openCardDelete(page, /^Actions for/);
    await page.screenshot({ path: `${DIR}/06-location-delete-confirmation.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    await page.goto("/logos", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const logoActions = page.getByRole("button", { name: "Logo actions" }).first();
    await logoActions.scrollIntoViewIfNeeded();
    await logoActions.click({ force: true });
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({ path: `${DIR}/07-logo-delete-confirmation.png` });
    await page.keyboard.press("Escape");

    // Mobile delete confirmation
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/products", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await openCardDelete(page, /^Actions for/);
    await page.screenshot({ path: `${DIR}/12-custom-delete-confirmation-mobile.png` });
    await page.keyboard.press("Escape");
  });
});
