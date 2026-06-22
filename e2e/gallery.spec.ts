import { test, expect } from "@playwright/test";

test("open a gallery result and duplicate its setup into Studio", async ({ page }) => {
  await page.goto("/gallery");
  // Click the first result card (stretched link to /gallery/<id>).
  await page.locator('a[href^="/gallery/"]').first().click();
  await expect(page.getByText("Generation settings")).toBeVisible();

  await page.getByRole("button", { name: /Duplicate setup/i }).click();
  await page.waitForURL(/\/studio/);

  // A restored setup means brand + products + location are all present, so Generate is enabled.
  await expect(page.getByRole("button", { name: "Generate", exact: true })).toBeEnabled({ timeout: 10000 });
});

test("create variation restores the setup and remains a distinct entry point", async ({ page }) => {
  await page.goto("/gallery/res_arcade_mall_hero");
  await expect(page.getByText("Generation settings")).toBeVisible();
  await page.getByRole("button", { name: /Create variation/i }).click();
  await page.waitForURL(/\/studio/);
  await expect(page.getByRole("button", { name: "Generate", exact: true })).toBeEnabled({ timeout: 10000 });
});
