import { test, expect } from "@playwright/test";

test("global search returns grouped results and navigates", async ({ page }) => {
  await page.goto("/");

  // Open the command-style search from the header.
  await page.getByRole("button", { name: /Search brands, products, locations and mockups/i }).click();
  const input = page.getByPlaceholder(/Search brands, products, locations, mockups/i);
  await expect(input).toBeVisible();

  await input.fill("Velocity");

  // The matching brand appears and navigates to Identity.
  await page.getByRole("button", { name: /Velocity VR/ }).first().click();
  await expect(page).toHaveURL(/\/identity/);
});

test("global search finds a location and opens Studio", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Search brands, products, locations and mockups/i }).click();
  await page.getByPlaceholder(/Search brands, products, locations, mockups/i).fill("Grand Mall");

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /Grand Mall Atrium/ }).first().click();
  await expect(page).toHaveURL(/\/studio/);
});
