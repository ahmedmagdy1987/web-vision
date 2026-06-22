import { test, expect } from "@playwright/test";
import { collectPageErrors } from "./helpers";

const ROUTES: { name: string; path: string }[] = [
  { name: "Identity", path: "/identity" },
  { name: "Products", path: "/products" },
  { name: "Studio", path: "/studio" },
  { name: "Gallery", path: "/gallery" },
  { name: "Home", path: "/" },
];

test("navigates between every section via the sidebar", async ({ page }) => {
  await page.goto("/");
  const aside = page.locator("aside");
  for (const { name, path } of ROUTES) {
    await aside.getByRole("link", { name, exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(path);
  }
});

test("no console errors or uncaught exceptions across routes", async ({ page }) => {
  const errors = collectPageErrors(page);
  for (const { path } of ROUTES) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);
  }
  // Visit a result detail too.
  await page.goto("/gallery/res_arcade_mall_hero");
  await expect(page.getByText("Generation settings")).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});
