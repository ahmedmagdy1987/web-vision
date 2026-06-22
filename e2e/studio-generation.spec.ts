import { test, expect } from "@playwright/test";
import { COMPLETE_SETUP, TINY_PNG, openStudioWithSetup } from "./helpers";

test("create a new client location in Studio, then generate and land on the gallery result", async ({ page }) => {
  // Prefill brand + product so we focus on the new-location + generation flow.
  await page.goto("/");
  await page.evaluate(
    ({ k, v }) => sessionStorage.setItem(k, v),
    { k: "web-vision:v1:studio-prefill", v: JSON.stringify({ brandId: COMPLETE_SETUP.brandId, productIds: ["prod_galaxy"] }) },
  );
  await page.goto("/studio");

  // Switch to uploading a new location.
  await page.getByText("Upload new", { exact: true }).click();
  await page.getByLabel("Location name").fill("QA Pop-up Venue");
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "venue.png",
    mimeType: "image/png",
    buffer: TINY_PNG,
  });

  // Generate becomes enabled only once the brand, product and (named, image-backed) location are ready.
  const generate = page.getByRole("button", { name: "Generate", exact: true });
  await expect(generate).toBeEnabled({ timeout: 10000 });
  await generate.click();

  // On completion the workspace redirects to the new gallery result.
  await page.waitForURL(/\/gallery\/[^/]+$/, { timeout: 20000 });
  await expect(page.getByText("Generation settings")).toBeVisible();
});

test("full generation from a complete prefilled setup reaches the gallery", async ({ page }) => {
  await openStudioWithSetup(page);
  const generate = page.getByRole("button", { name: "Generate", exact: true });
  await expect(generate).toBeEnabled();
  await generate.click();
  await expect(page.getByText("Generating your mockup…")).toBeVisible({ timeout: 5000 });
  await page.waitForURL(/\/gallery\/[^/]+$/, { timeout: 20000 });
  await expect(page.getByText("Generation settings")).toBeVisible();
});
