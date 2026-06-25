import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Phase 3.4.3B UI verification — compact Location tile + result-only large area.
 * Selects a logo, product and location and screenshots Home. It NEVER clicks
 * Generate, so it makes NO OpenAI request even though the server is in openai mode.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const EMAIL = process.env.E2E_TEST_EMAIL ?? "";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";
const DIR = "artifacts/web-vision-phase-3-4-3b";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe("/");
}

async function clickBtn(page: Page, name: string | RegExp) {
  const btns = page.getByRole("button", { name });
  const n = await btns.count();
  for (let i = 0; i < n; i++) {
    if (await btns.nth(i).isVisible().catch(() => false)) {
      await btns.nth(i).click().catch(() => undefined);
      return;
    }
  }
}

async function openPick(page: Page, open: string | RegExp, count: number) {
  await clickBtn(page, open);
  await page.getByRole("dialog").first().waitFor({ state: "visible", timeout: 8_000 }).catch(() => undefined);
  await page.waitForTimeout(400);
  const tiles = page.getByRole("dialog").locator("button[aria-pressed]");
  await tiles.first().waitFor({ timeout: 8_000 }).catch(() => undefined);
  for (let i = 0; i < count; i++) {
    await tiles.nth(i).click().catch(() => undefined);
    await page.waitForTimeout(200);
  }
  await clickBtn(page, "Done");
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 6_000 }).catch(() => undefined);
  await page.waitForTimeout(300);
}

async function selectAll(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" }).catch(() => undefined);
  await page.getByTestId("home-generator").waitFor({ timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(600);
  await openPick(page, "Choose logo", 1);
  await openPick(page, /add (more )?products/i, 1);
  await openPick(page, "Choose location", 1);
  await page.waitForTimeout(500);
}

test.describe("Phase 3.4.3B UI", () => {
  test.skip(!SUPABASE_URL || !EMAIL || !PASSWORD, "requires live Supabase + E2E creds");
  test.beforeAll(() => mkdirSync(DIR, { recursive: true }));

  test("desktop compact selection + result area", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await signIn(page);
    await selectAll(page);
    await page.screenshot({ path: `${DIR}/01-home-compact-selection-desktop.png` });
    // No generate click → no paid request.
    expect(errors, errors.join(" | ")).toEqual([]);
  });

  test("mobile compact selection", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await selectAll(page);
    await page.screenshot({ path: `${DIR}/02-home-compact-selection-mobile.png` });
  });
});
