import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Phase 3.4.2 visual-review artifacts — GUARDED, live Supabase. Captures the 12
 * required screens into artifacts/web-vision-phase-3-4-2-final-review/. The
 * "complete" Home shots select a logo, two products and a location via the
 * visual picker sheets (any order), then screenshot the selected state.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const EMAIL = process.env.E2E_TEST_EMAIL ?? "";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";
const DIR = "artifacts/web-vision-phase-3-4-2-final-review";

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
  await page.getByText("Loading Malahi…").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(900);
}

async function shot(page: Page, route: string, name: string) {
  await page.goto(route, { waitUntil: "networkidle" }).catch(() => page.goto(route));
  await page.getByText("Loading Malahi…").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${DIR}/${name}.png` });
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

/** Click the first `count` tiles (aria-pressed) in the open picker sheet. */
async function pickTiles(page: Page, count: number) {
  const tiles = page.getByRole("dialog").locator("button[aria-pressed]");
  await tiles.first().waitFor({ timeout: 8_000 }).catch(() => undefined);
  const available = await tiles.count();
  for (let i = 0; i < Math.min(count, available); i++) {
    await tiles.nth(i).click().catch(() => undefined);
    await page.waitForTimeout(250);
  }
}

async function waitDialogHidden(page: Page) {
  await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 8_000 }).catch(() => undefined);
  await page.waitForTimeout(300);
}

async function openPicker(page: Page, name: string | RegExp) {
  await clickBtn(page, name);
  await page.getByRole("dialog").waitFor({ state: "visible", timeout: 8_000 }).catch(() => undefined);
  await page.waitForTimeout(500);
}

/** Pick a logo, two products and a location via the picker sheets (any order). */
async function selectAll(page: Page) {
  await openPicker(page, "Choose logo");
  await pickTiles(page, 1); // single-select auto-closes
  await waitDialogHidden(page);

  await openPicker(page, /add (more )?products/i);
  await pickTiles(page, 2);
  await clickBtn(page, "Done");
  await waitDialogHidden(page);

  await openPicker(page, "Choose location");
  await pickTiles(page, 1);
  await waitDialogHidden(page);
}

test.describe("Phase 3.4.2 screenshots", () => {
  test.skip(!SUPABASE_URL || !EMAIL || !PASSWORD, "requires live Supabase + E2E creds");
  test.beforeAll(() => {
    mkdirSync(DIR, { recursive: true });
  });

  test("desktop screens", async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // Sign-in (official logo).
    await page.goto("/sign-in", { waitUntil: "networkidle" }).catch(() => undefined);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/12-sign-in-logo-desktop.png` });

    await signIn(page);
    await settleHome(page);

    // Empty state.
    await page.screenshot({ path: `${DIR}/01-home-empty-desktop.png` });

    // Logo picker.
    await openPicker(page, "Choose logo");
    await page.screenshot({ path: `${DIR}/04-logo-picker-desktop.png` });
    await pickTiles(page, 1);
    await waitDialogHidden(page);

    // Product picker (images / fallbacks).
    await openPicker(page, /add (more )?products/i);
    await page.screenshot({ path: `${DIR}/05-product-picker-with-images-desktop.png` });
    await pickTiles(page, 2);
    await clickBtn(page, "Done");
    await waitDialogHidden(page);

    // Location picker.
    await openPicker(page, "Choose location");
    await page.screenshot({ path: `${DIR}/06-location-picker-with-images-desktop.png` });
    await pickTiles(page, 1);
    await waitDialogHidden(page);

    // Complete state (logo + 2 products + location).
    await page.screenshot({ path: `${DIR}/02-home-complete-desktop.png` });

    // Libraries + gallery.
    await shot(page, "/products", "07-products-library-desktop");
    await shot(page, "/locations", "08-locations-library-desktop");
    await shot(page, "/gallery", "09-gallery-clean-desktop");

    // Shell logo (light).
    await page.goto("/", { waitUntil: "networkidle" }).catch(() => undefined);
    await page.getByTestId("home-generator").waitFor({ timeout: 10_000 }).catch(() => undefined);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${DIR}/10-shell-logo-light-desktop.png` });

    // Shell logo (dark).
    await page.getByRole("button", { name: "Change theme" }).click().catch(() => undefined);
    await page.getByRole("menuitem", { name: "Dark" }).click().catch(() => undefined);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/11-shell-logo-dark-desktop.png` });
  });

  test("mobile complete", async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await settleHome(page);
    await selectAll(page);
    await page.screenshot({ path: `${DIR}/03-home-complete-mobile.png` });
  });
});
