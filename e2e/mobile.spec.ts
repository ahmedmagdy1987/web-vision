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

test("complete the Studio step workflow on mobile", async ({ page }) => {
  await openStudioWithSetup(page);
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Assets → Location → Settings → Review (brand/products/location are prefilled).
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  const generate = page.getByRole("button", { name: "Generate", exact: true });
  await expect(generate).toBeEnabled({ timeout: 10000 });
  await generate.click();

  await page.waitForURL(/\/gallery\/[^/]+$/, { timeout: 20000 });
  await expect(page.getByText("Generation settings")).toBeVisible();
});

test("mobile Studio: lowest content scrolls clear of the action bar and bottom nav", async ({ page }) => {
  await openStudioWithSetup(page);
  // Advance to the Settings step (a long form ending in the Notes field).
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  const notes = page.getByLabel("Notes (optional)");
  await expect(notes).toBeVisible();

  // Scroll the main content fully to the bottom.
  await page.evaluate(() => {
    const main = document.querySelector("main");
    if (main) main.scrollTo(0, main.scrollHeight);
  });
  await page.waitForTimeout(150);

  const notesBox = await notes.boundingBox();
  const footerBox = await page.getByTestId("studio-step-footer").boundingBox();
  const navBox = await page.locator('nav[aria-label="Primary"]').boundingBox();

  expect(notesBox, "notes field").not.toBeNull();
  expect(footerBox, "step action bar").not.toBeNull();
  expect(navBox, "bottom nav").not.toBeNull();

  if (notesBox && footerBox && navBox) {
    // The lowest interactive content sits fully above the sticky action bar.
    expect(notesBox.y + notesBox.height).toBeLessThanOrEqual(footerBox.y + 2);
    // The action bar sits above the bottom navigation — no stacked fixed bars.
    expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(navBox.y + 2);
  }
});
