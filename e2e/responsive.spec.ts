import { test } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./helpers";

const SIZES = [
  { name: "laptop", width: 1280, height: 800 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile", width: 390, height: 844 },
];

const ROUTES = ["/", "/identity", "/products", "/studio", "/gallery", "/gallery/res_arcade_mall_hero"];

for (const size of SIZES) {
  test(`no horizontal overflow at ${size.name} (${size.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    for (const route of ROUTES) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await expectNoHorizontalOverflow(page);
    }
  });
}
