import { test, expect } from "@playwright/test";

/** Each seeded result's stored dimensions must match its aspect ratio. */
const CASES = [
  { id: "res_velocity_rooftop", ratio: "1:1", dims: "1280×1280" },
  { id: "res_arcade_retail", ratio: "9:16", dims: "720×1280" },
  { id: "res_arcade_mall_hero", ratio: "16:9", dims: "1280×720" },
  { id: "res_nova_fec", ratio: "3:2", dims: "1280×853" },
];

for (const c of CASES) {
  test(`gallery detail dimensions are consistent with ${c.ratio}`, async ({ page }) => {
    await page.goto(`/gallery/${c.id}`);
    await expect(page.getByText("Continue working")).toBeVisible();

    // The metadata line reads "<W>×<H> · <ratio> · seed <n>".
    const metaLine = page.getByText(c.dims);
    await expect(metaLine).toBeVisible();
    await expect(metaLine).toContainText(c.ratio);
  });
}
