import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Phase 3.4.4 (slice) verification — repaired result metadata, secure direct
 * download (attachment, no new tab), and the image lightbox. Uses the existing
 * generated result only; makes NO OpenAI request.
 */
const SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
const EMAIL = process.env.E2E_TEST_EMAIL ?? "";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";
const DIR = "artifacts/web-vision-phase-3-4-4-final-release";
const RESULT_ID = "84d65b19-f822-41f6-a7d8-8b445719ce83";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe("/");
}

function crashGuard(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

test.describe("Phase 3.4.4 slice", () => {
  test.skip(!SUPABASE || !EMAIL || !PASSWORD, "requires live Supabase + creds");
  test.beforeAll(() => mkdirSync(DIR, { recursive: true }));

  test("repaired metadata + result lightbox + secure download (desktop)", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const errors = crashGuard(page);
    await signIn(page);

    // Part 1: the real result now shows the correct names (no fallback).
    await page.goto("/gallery", { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await expect(page.getByText("Malahi Arcade").first()).toBeVisible();
    await page.screenshot({ path: `${DIR}/01-gallery-real-result-desktop.png` });

    // Part 8: the download route returns an attachment (auth via cookies) — no new tab.
    const dl = await page.request.get(`/api/results/${RESULT_ID}/download`);
    expect(dl.status()).toBe(200);
    expect((dl.headers()["content-disposition"] ?? "").toLowerCase()).toContain("attachment");
    expect(dl.headers()["content-type"]).toBe("image/webp");

    // Detail page shows the repaired names + Download button.
    await page.goto(`/gallery/${RESULT_ID}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await expect(page.getByRole("heading", { name: "Malahi Arcade" })).toBeVisible();
    await expect(page.getByText("SLUSH MACHINE")).toBeVisible();
    await expect(page.getByText("test", { exact: true })).toBeVisible();
    await page.screenshot({ path: `${DIR}/09-gallery-download-state-desktop.png` });

    // Part 7: clicking the result image opens the lightbox at original ratio.
    await page.getByRole("button", { name: /view .* mockup full size/i }).click();
    await page.waitForTimeout(700);
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
    await page.screenshot({ path: `${DIR}/08-gallery-result-lightbox-desktop.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    expect(errors.filter((e) => /replace|hexToRgb|undefined/i.test(e))).toHaveLength(0);
  });

  test("product library + product lightbox (desktop + mobile)", async ({ page }) => {
    test.setTimeout(180_000);
    const errors = crashGuard(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);

    await page.goto("/products", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${DIR}/01-products-library-selection-desktop.png` });

    const firstImage = page.getByRole("button", { name: /view .* image/i }).first();
    await firstImage.click();
    await page.waitForTimeout(700);
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
    await page.screenshot({ path: `${DIR}/02-product-lightbox-desktop.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Mobile lightbox
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/products", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /view .* image/i }).first().click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/11-image-lightbox-mobile.png` });

    expect(errors.filter((e) => /replace|hexToRgb|undefined/i.test(e))).toHaveLength(0);
  });
});
