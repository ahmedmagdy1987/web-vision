import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Phase 3.4.3 visual-review artifacts (live Supabase). Captures the 11 required
 * screens into artifacts/web-vision-phase-3-4-3/ and asserts that opening +
 * closing the upload dialogs produces zero aria-hidden focus warnings.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const EMAIL = process.env.E2E_TEST_EMAIL ?? "";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";
const DIR = "artifacts/web-vision-phase-3-4-3";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe("/");
}

async function settleHome(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" }).catch(() => undefined);
  await page.getByTestId("home-generator").waitFor({ timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(800);
}

async function clickBtn(page: Page, name: string | RegExp) {
  const btns = page.getByRole("button", { name });
  const n = await btns.count();
  for (let i = 0; i < n; i++) {
    if (await btns.nth(i).isVisible().catch(() => false)) {
      await btns.nth(i).click().catch(() => undefined);
      return true;
    }
  }
  return false;
}

async function shot(page: Page, route: string, name: string) {
  await page.goto(route, { waitUntil: "networkidle" }).catch(() => undefined);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${DIR}/${name}.png` });
}

async function closeDialog(page: Page) {
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 6_000 }).catch(() => undefined);
  await page.waitForTimeout(250);
}

test.describe("Phase 3.4.3 screenshots", () => {
  test.skip(!SUPABASE_URL || !EMAIL || !PASSWORD, "requires live Supabase + E2E creds");
  test.beforeAll(() => mkdirSync(DIR, { recursive: true }));

  test("desktop screens + dialog focus", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1440, height: 900 });

    const ariaWarnings: string[] = [];
    page.on("console", (msg) => {
      const t = msg.text();
      if (/aria-hidden/i.test(t)) ariaWarnings.push(t);
    });

    // Sign-in (dark, then light).
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/sign-in", { waitUntil: "networkidle" }).catch(() => undefined);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/08-sign-in-dark-desktop.png` });
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/sign-in", { waitUntil: "networkidle" }).catch(() => undefined);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/07-sign-in-light-desktop.png` });

    await signIn(page);
    await settleHome(page);

    // Exercise the focus fix: open each picker, open its upload dialog, close.
    for (const [open, upload] of [
      ["Choose logo", "Upload logo"],
      ["Add products", "Upload product"],
      ["Choose location", "Upload location"],
    ] as const) {
      await clickBtn(page, open);
      await page.getByRole("dialog").first().waitFor({ state: "visible", timeout: 8_000 }).catch(() => undefined);
      await page.waitForTimeout(400);
      await clickBtn(page, upload);
      await page.waitForTimeout(600);
      await closeDialog(page);
    }
    expect(ariaWarnings, `aria-hidden warnings: ${ariaWarnings.join(" | ")}`).toHaveLength(0);

    // Add Product — simplified, then Advanced expanded.
    await page.goto("/products", { waitUntil: "networkidle" }).catch(() => undefined);
    await page.waitForTimeout(700);
    await clickBtn(page, "Add product");
    await page.getByRole("dialog").waitFor({ state: "visible", timeout: 8_000 }).catch(() => undefined);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${DIR}/01-add-product-simple-desktop.png` });
    await page.getByRole("button", { name: /advanced details/i }).click().catch(() => undefined);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${DIR}/02-add-product-advanced-collapsed.png` });
    await closeDialog(page);

    // Logo delete confirmation.
    await page.goto("/logos", { waitUntil: "networkidle" }).catch(() => undefined);
    await page.waitForTimeout(700);
    await page.getByRole("button", { name: "Logo actions" }).first().click().catch(() => undefined);
    await page.waitForTimeout(300);
    await page.getByRole("menuitem", { name: "Delete" }).click().catch(() => undefined);
    await page.getByRole("dialog").waitFor({ state: "visible", timeout: 6_000 }).catch(() => undefined);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${DIR}/03-logo-delete-confirmation.png` });
    await closeDialog(page);

    // Gallery filters + square cards.
    await shot(page, "/gallery", "04-gallery-filters-desktop");
    await page.screenshot({ path: `${DIR}/05-gallery-square-cards-desktop.png`, fullPage: true });

    // Gallery → original uncropped image detail.
    const firstCard = page.locator('a[href^="/gallery/"]').first();
    if (await firstCard.count()) {
      await firstCard.click().catch(() => undefined);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${DIR}/06-gallery-original-image-detail.png` });
    }

    // Shell logo in dark mode (integrated brand band, no white pill).
    await page.goto("/", { waitUntil: "networkidle" }).catch(() => undefined);
    await page.getByTestId("home-generator").waitFor({ timeout: 10_000 }).catch(() => undefined);
    await page.getByRole("button", { name: "Change theme" }).click().catch(() => undefined);
    await page.getByRole("menuitem", { name: "Dark" }).click().catch(() => undefined);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/09-shell-logo-dark-desktop.png` });
  });

  test("mobile screens", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await settleHome(page);

    // Add Product on mobile (full-screen sheet).
    await page.goto("/products", { waitUntil: "networkidle" }).catch(() => undefined);
    await page.waitForTimeout(700);
    await clickBtn(page, "Add product");
    await page.getByRole("dialog").waitFor({ state: "visible", timeout: 8_000 }).catch(() => undefined);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${DIR}/10-add-product-mobile.png` });
    await closeDialog(page);

    await shot(page, "/gallery", "11-gallery-mobile");
  });
});
