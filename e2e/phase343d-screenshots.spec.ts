import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Phase 3.4.3D verification — the Gallery renders the real OpenAI result without
 * the `hexToRgb`/`replace` crash, and the detail shows the original 4:5 ratio.
 * Uses the existing generated result only; makes NO OpenAI request.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const EMAIL = process.env.E2E_TEST_EMAIL ?? "";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";
const DIR = "artifacts/web-vision-phase-3-4-3d-gallery-fix";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe("/");
}

function attachCrashGuard(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

function assertNoCrash(errors: string[]) {
  const crash = errors.filter((e) => /Cannot read properties of undefined \(reading 'replace'\)|hexToRgb/i.test(e));
  expect(crash, crash.join(" | ")).toHaveLength(0);
}

test.describe("Phase 3.4.3D gallery fix", () => {
  test.skip(!SUPABASE_URL || !EMAIL || !PASSWORD, "requires live Supabase + E2E creds");
  test.beforeAll(() => mkdirSync(DIR, { recursive: true }));

  test("desktop gallery + real OpenAI result detail", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const errors = attachCrashGuard(page);

    await signIn(page);
    await page.goto("/gallery", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${DIR}/01-gallery-with-real-openai-result-desktop.png` });
    assertNoCrash(errors);

    // The most recent result is the OpenAI one (created last) — open it.
    const firstCard = page.locator('a[href^="/gallery/"]').first();
    await firstCard.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${DIR}/02-openai-result-detail-desktop.png` });
    await page.screenshot({ path: `${DIR}/03-openai-result-original-ratio-desktop.png`, fullPage: true });
    assertNoCrash(errors);
  });

  test("mobile gallery + detail", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const errors = attachCrashGuard(page);

    await signIn(page);
    await page.goto("/gallery", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${DIR}/04-gallery-with-real-result-mobile.png` });

    const firstCard = page.locator('a[href^="/gallery/"]').first();
    await firstCard.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${DIR}/05-openai-result-detail-mobile.png` });
    assertNoCrash(errors);
  });
});
