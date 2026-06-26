import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Phase 3.4 visual-review artifacts — GUARDED, live Supabase. Captures the 12
 * required screens into artifacts/web-vision-phase-3-4-simplified/ using the real
 * Malahi shell branding and existing assets (no hard-coded ids, no secrets in the
 * page). Assets are selected interactively on the Home generator.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const EMAIL = process.env.E2E_TEST_EMAIL ?? "";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";
const DIR = "artifacts/web-vision-phase-3-4-simplified";

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

/** Select a logo whose brand has products, then a product and a location. */
async function buildReadyMockup(page: Page) {
  const logos = page.getByTestId("picker-logo").locator("button");
  const count = await logos.count();
  for (let i = 0; i < count; i++) {
    await logos.nth(i).click().catch(() => undefined);
    await page.waitForTimeout(500);
    const products = page.getByTestId("picker-products").locator("button");
    if ((await products.count()) > 0) {
      await products.first().click().catch(() => undefined);
      break;
    }
  }
  await page.waitForTimeout(300);
  const locations = page.getByTestId("picker-location").locator("li button");
  if ((await locations.count()) > 0) await locations.first().click().catch(() => undefined);
  await page.waitForTimeout(400);
}

async function clickGenerate(page: Page) {
  const gens = page.getByRole("button", { name: /generate mockup/i });
  const n = await gens.count();
  for (let i = 0; i < n; i++) {
    if (await gens.nth(i).isVisible().catch(() => false)) {
      await gens.nth(i).click({ force: true }).catch(() => undefined);
      return true;
    }
  }
  return false;
}

test.describe("Phase 3.4 screenshots", () => {
  test.skip(!SUPABASE_URL || !EMAIL || !PASSWORD, "requires live Supabase + E2E creds");
  test.beforeAll(() => {
    mkdirSync(DIR, { recursive: true });
  });

  test("desktop screens", async ({ page }) => {
    test.setTimeout(200_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    await settleHome(page);

    await page.screenshot({ path: `${DIR}/01-home-generator-desktop.png` });

    await page.getByTestId("picker-logo").scrollIntoViewIfNeeded().catch(() => undefined);
    await page.getByTestId("picker-logo").screenshot({ path: `${DIR}/02-logo-picker-desktop.png` }).catch(() => undefined);

    await buildReadyMockup(page);

    await page.getByTestId("picker-products").scrollIntoViewIfNeeded().catch(() => undefined);
    await page.getByTestId("picker-products").screenshot({ path: `${DIR}/03-product-picker-desktop.png` }).catch(() => undefined);

    await page.getByTestId("picker-location").scrollIntoViewIfNeeded().catch(() => undefined);
    await page.getByTestId("picker-location").screenshot({ path: `${DIR}/04-location-picker-desktop.png` }).catch(() => undefined);

    // Generation progress ("cooking") — capture mid-run before it navigates to the result.
    if (await clickGenerate(page)) {
      await page.getByTestId("studio-generating").waitFor({ timeout: 8_000 }).catch(() => undefined);
      await page.waitForTimeout(700);
    }
    await page.screenshot({ path: `${DIR}/08-generation-progress-desktop.png` });

    // Library pages.
    await shot(page, "/identity", "05-logos-library-desktop");
    await shot(page, "/products", "06-products-library-desktop");
    await shot(page, "/locations", "07-locations-library-desktop");
    await shot(page, "/gallery", "09-gallery-desktop");
  });

  test("mobile screens", async ({ page }) => {
    test.setTimeout(200_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await settleHome(page);

    await page.screenshot({ path: `${DIR}/10-home-generator-mobile.png` });

    await buildReadyMockup(page);
    await page.getByTestId("picker-products").scrollIntoViewIfNeeded().catch(() => undefined);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${DIR}/11-asset-picker-mobile.png` });

    if (await clickGenerate(page)) {
      await page.getByTestId("studio-generating").waitFor({ timeout: 8_000 }).catch(() => undefined);
      await page.waitForTimeout(700);
    }
    await page.screenshot({ path: `${DIR}/12-generation-progress-mobile.png` });
  });
});
