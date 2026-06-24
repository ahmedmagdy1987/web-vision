import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Phase 3.4.1 visual-review artifacts — GUARDED, live Supabase. Captures the 12
 * required screens into artifacts/web-vision-phase-3-4-1-review/ using the real
 * Malahi text wordmark and existing assets. Assets are selected via the visual
 * picker sheets on Home.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const EMAIL = process.env.E2E_TEST_EMAIL ?? "";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";
const DIR = "artifacts/web-vision-phase-3-4-1-review";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/");
}

async function settleHome(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" }).catch(() => undefined);
  await page.getByTestId("home-generator").waitFor({ timeout: 15_000 }).catch(() => undefined);
  await page.getByText("Loading Malahi…").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(900);
}

async function shot(page: Page, route: string, name: string) {
  await page.goto(route, { waitUntil: "networkidle" }).catch(() => page.goto(route));
  await page.getByText("Loading Malahi…").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${DIR}/${name}.png` });
}

/** Click a button by exact name if visible. */
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

/** Pick the first tile in the open picker sheet (tiles carry aria-pressed). */
async function pickFirstTile(page: Page) {
  const tile = page.getByRole("dialog").locator("button[aria-pressed]").first();
  await tile.waitFor({ timeout: 8_000 }).catch(() => undefined);
  await tile.click().catch(() => undefined);
  await page.waitForTimeout(400);
}

async function generate(page: Page) {
  if (await clickBtn(page, /generate mockup/i)) {
    await page.getByTestId("studio-generating").waitFor({ timeout: 8_000 }).catch(() => undefined);
    await page.waitForTimeout(700);
  }
}

test.describe("Phase 3.4.1 screenshots", () => {
  test.skip(!SUPABASE_URL || !EMAIL || !PASSWORD, "requires live Supabase + E2E creds");
  test.beforeAll(() => {
    mkdirSync(DIR, { recursive: true });
  });

  test("desktop screens", async ({ page }) => {
    test.setTimeout(220_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    await settleHome(page);

    await page.screenshot({ path: `${DIR}/01-home-generator-desktop.png` });

    // Logo picker sheet.
    await clickBtn(page, "Choose logo");
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/02-home-logo-picker-desktop.png` });
    await pickFirstTile(page);

    // Product picker sheet.
    await clickBtn(page, "Add products");
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/03-home-product-picker-desktop.png` });
    await pickFirstTile(page);
    await page.keyboard.press("Escape").catch(() => undefined);
    await page.waitForTimeout(300);

    // Location picker sheet.
    await clickBtn(page, "Choose location");
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/04-home-location-picker-desktop.png` });
    await pickFirstTile(page);

    // Generation progress.
    await generate(page);
    await page.screenshot({ path: `${DIR}/08-generation-progress-desktop.png` });

    // Library pages.
    await shot(page, "/logos", "05-logos-library-desktop");
    await shot(page, "/products", "06-products-library-desktop");
    await shot(page, "/locations", "07-locations-library-desktop");
    await shot(page, "/gallery", "09-gallery-desktop");
  });

  test("mobile screens", async ({ page }) => {
    test.setTimeout(220_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await settleHome(page);

    await page.screenshot({ path: `${DIR}/10-home-generator-mobile.png` });

    // Select a logo first so products are available.
    await clickBtn(page, "Choose logo");
    await page.waitForTimeout(600);
    await pickFirstTile(page);

    // Product picker sheet (mobile).
    await clickBtn(page, "Add products");
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/11-home-product-picker-mobile.png` });
    await pickFirstTile(page);
    await page.keyboard.press("Escape").catch(() => undefined);
    await page.waitForTimeout(300);

    await clickBtn(page, "Choose location");
    await page.waitForTimeout(600);
    await pickFirstTile(page);

    await generate(page);
    await page.screenshot({ path: `${DIR}/12-generation-progress-mobile.png` });
  });
});
