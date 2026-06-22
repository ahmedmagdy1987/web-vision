import { test, expect } from "@playwright/test";
import { MOBILE, expectNoHorizontalOverflow, openStudioWithSetup } from "./helpers";

test.use({ viewport: MOBILE });

test("core routes have no horizontal overflow on mobile", async ({ page }) => {
  for (const path of ["/", "/identity", "/products", "/gallery"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalOverflow(page);
  }
});

test("complete the Studio generation flow on mobile", async ({ page }) => {
  await openStudioWithSetup(page);
  await expectNoHorizontalOverflow(page);

  const generate = page.getByRole("button", { name: "Generate", exact: true });
  await expect(generate).toBeEnabled({ timeout: 10000 });
  await generate.click();

  await page.waitForURL(/\/gallery\/[^/]+$/, { timeout: 20000 });
  await expect(page.getByText("Generation settings")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
