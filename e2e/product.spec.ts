import { test, expect } from "@playwright/test";

test("create a product and confirm it persists after refresh", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("button", { name: "Add product" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(/^name/i).fill("QA Test Game");

  // Brand is a Radix Select.
  await dialog.getByLabel(/^brand/i).click();
  await page.getByRole("option").first().click();

  await dialog.getByLabel(/^category/i).fill("Arcade");
  await dialog.getByRole("button", { name: "Add product" }).click();

  await expect(page.getByRole("heading", { name: "QA Test Game" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "QA Test Game" })).toBeVisible();
});
