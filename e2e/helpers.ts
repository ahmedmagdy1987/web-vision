import { type Page, expect } from "@playwright/test";

/** A valid 1x1 PNG for upload inputs. */
export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

export const MOBILE = { width: 390, height: 844 };

/** A complete Studio prefill referencing seeded ids (brand + products + saved location). */
export const COMPLETE_SETUP = {
  brandId: "brand_arcade",
  logoId: "logo_brand_arcade_primary",
  productIds: ["prod_galaxy", "prod_tickettower"],
  locationId: "loc_mall_atrium",
  settings: { visualizationType: "lifestyle-scene", aspectRatio: "16:9" },
  source: "e2e",
};

const STUDIO_PREFILL_KEY = "web-vision:v1:studio-prefill";

/** Seed a Studio prefill then open Studio (deterministic complete setup). */
export async function openStudioWithSetup(page: Page) {
  await page.goto("/");
  await page.evaluate(
    ({ k, v }) => sessionStorage.setItem(k, v),
    { k: STUDIO_PREFILL_KEY, v: JSON.stringify(COMPLETE_SETUP) },
  );
  await page.goto("/studio");
}

/** Collect console errors and uncaught page errors for an assertion at end of test. */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/** Assert the document does not overflow horizontally. */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflowPx = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflowPx, "horizontal overflow in px").toBeLessThanOrEqual(1);
}
