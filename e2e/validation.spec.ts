import { test, expect } from "@playwright/test";
import { openStudioWithSetup } from "./helpers";

test("Generate is disabled until required selections are made", async ({ page }) => {
  await page.goto("/studio");
  // No products / location selected yet → action blocked.
  await expect(page.getByRole("button", { name: "Generate", exact: true })).toBeDisabled();
  // Readiness summary communicates what is still required.
  await expect(page.getByText("Generation readiness")).toBeVisible();
});

test("the failed state is reachable and recoverable", async ({ page }) => {
  await openStudioWithSetup(page);
  const generate = page.getByRole("button", { name: "Generate", exact: true });
  await expect(generate).toBeEnabled();

  // #fail in the notes deterministically forces the mock provider to fail.
  await page.getByLabel("Notes (optional)").fill("preview the error path #fail");
  await generate.click();

  await expect(page.getByText("Generation failed")).toBeVisible({ timeout: 10000 });
  // Stayed on Studio (no navigation on failure) and can retry.
  await expect(page).toHaveURL(/\/studio/);
  await expect(page.getByRole("button", { name: "Generate", exact: true })).toBeEnabled();
});
