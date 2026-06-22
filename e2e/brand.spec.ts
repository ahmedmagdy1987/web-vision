import { test, expect } from "@playwright/test";

test("create a brand and confirm it persists after refresh", async ({ page }) => {
  await page.goto("/identity");
  await page.getByRole("button", { name: "Add brand" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(/name/i).fill("QA Test Brand");
  await dialog.getByRole("button", { name: "Create brand" }).click();

  // New brand card title is a heading.
  await expect(page.getByRole("heading", { name: "QA Test Brand" })).toBeVisible();

  // Persistence: reload and confirm it survives via the repository/localStorage layer.
  await page.reload();
  await expect(page.getByRole("heading", { name: "QA Test Brand" })).toBeVisible();
});
