import { test, expect, type Page } from "@playwright/test";

/**
 * Captures the Phase 2 visual review package into artifacts/web-vision-review/.
 * Run all: npx playwright test screenshots
 * Desktop viewport = 1440x900 (project default); mobile = 390x844.
 */

const DIR = "artifacts/web-vision-review";
const MOBILE = { width: 390, height: 844 };

const STUDIO_PREFILL_KEY = "web-vision:v1:studio-prefill";
const COMPLETE_SETUP = {
  brandId: "brand_arcade",
  logoId: "logo_brand_arcade_primary",
  productIds: ["prod_galaxy", "prod_tickettower"],
  locationId: "loc_mall_atrium",
  settings: { visualizationType: "lifestyle-scene", aspectRatio: "16:9" },
  source: "screenshot",
};

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500); // let the page-enter animation finish
}

async function openStudioWithSetup(page: Page) {
  await page.goto("/");
  await page.evaluate(
    ({ k, v }) => sessionStorage.setItem(k, v),
    { k: STUDIO_PREFILL_KEY, v: JSON.stringify(COMPLETE_SETUP) },
  );
  await page.goto("/studio");
  await expect(page.getByRole("button", { name: "Generate", exact: true })).toBeVisible();
  await settle(page);
}

test("01 home desktop", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${DIR}/01-home-desktop.png` });
});

test("02 identity desktop", async ({ page }) => {
  await page.goto("/identity");
  await expect(page.getByRole("heading", { name: "Identity" })).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${DIR}/02-identity-desktop.png` });
});

test("03 products desktop", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${DIR}/03-products-desktop.png` });
});

test("04 studio complete desktop", async ({ page }) => {
  await openStudioWithSetup(page);
  await page.screenshot({ path: `${DIR}/04-studio-complete-desktop.png` });
});

test("05 studio processing desktop", async ({ page }) => {
  await openStudioWithSetup(page);
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(page.getByText("Generating your mockup…")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${DIR}/05-studio-processing-desktop.png` });
});

test("06 gallery desktop", async ({ page }) => {
  await page.goto("/gallery");
  await expect(page.getByRole("heading", { name: "Gallery" })).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${DIR}/06-gallery-desktop.png` });
});

test("07 gallery result detail desktop", async ({ page }) => {
  await page.goto("/gallery/res_arcade_mall_hero");
  await expect(page.getByText("Generation settings")).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${DIR}/07-gallery-detail-desktop.png` });
});

test("08 home mobile", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${DIR}/08-home-mobile.png` });
});

test("09 studio mobile", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await openStudioWithSetup(page);
  await page.screenshot({ path: `${DIR}/09-studio-mobile.png` });
});

test("10 gallery mobile", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto("/gallery");
  await expect(page.getByRole("heading", { name: "Gallery" })).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${DIR}/10-gallery-mobile.png` });
});
