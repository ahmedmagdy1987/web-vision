import { test, expect, type Page } from "@playwright/test";

/**
 * Phase 2.1 review package → artifacts/web-vision-review-phase-2-1/.
 * Desktop = 1440x900 (project default); mobile = 390x844.
 */

const DIR = "artifacts/web-vision-review-phase-2-1";
const MOBILE = { width: 390, height: 844 };
const STUDIO_PREFILL_KEY = "web-vision:v1:studio-prefill";
const SETUP = {
  brandId: "brand_arcade",
  logoId: "logo_brand_arcade_primary",
  productIds: ["prod_galaxy", "prod_tickettower"],
  locationId: "loc_mall_atrium",
  settings: { visualizationType: "lifestyle-scene", aspectRatio: "16:9" },
  source: "screenshot",
};

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
}

async function openStudio(page: Page) {
  await page.goto("/");
  await page.evaluate(({ k, v }) => sessionStorage.setItem(k, v), { k: STUDIO_PREFILL_KEY, v: JSON.stringify(SETUP) });
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "Studio" })).toBeVisible();
}

test("01 home mobile", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${DIR}/01-home-mobile.png` });
});

test("02 studio assets mobile", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await openStudio(page);
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${DIR}/02-studio-assets-mobile.png` });
});

test("03 studio review mobile", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await openStudio(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("button", { name: "Generate", exact: true })).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${DIR}/03-studio-review-mobile.png` });
});

test("04 gallery mobile", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto("/gallery");
  await expect(page.getByRole("heading", { name: "Gallery" })).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${DIR}/04-gallery-mobile.png` });
});

test("05 identity desktop", async ({ page }) => {
  await page.goto("/identity");
  await expect(page.getByText("Current brand identity")).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${DIR}/05-identity-desktop.png` });
});

test("06 gallery detail square desktop", async ({ page }) => {
  await page.goto("/gallery/res_velocity_rooftop");
  await expect(page.getByText("1280×1280")).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${DIR}/06-gallery-detail-square-desktop.png` });
});

test("07 gallery detail portrait desktop", async ({ page }) => {
  await page.goto("/gallery/res_arcade_retail");
  await expect(page.getByText("720×1280")).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${DIR}/07-gallery-detail-portrait-desktop.png` });
});

test("08 global search desktop", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Search brands, products, locations and mockups/i }).click();
  await page.getByPlaceholder(/Search brands, products, locations, mockups/i).fill("arcade");
  await expect(page.getByRole("dialog").getByRole("button", { name: /Malahi Arcade/ }).first()).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/08-global-search-desktop.png` });
});
