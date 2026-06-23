import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";

/**
 * Phase 3.2 visual-review artifacts — GUARDED, live Supabase. Captures the 12
 * required screens into artifacts/web-vision-phase-3-2-product-alignment/.
 * Studio ready/generating states use a sessionStorage prefill (no secrets).
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const EMAIL = process.env.E2E_TEST_EMAIL ?? "";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";
const DIR = "artifacts/web-vision-phase-3-2-product-alignment";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/");
}
async function shot(page: Page, route: string, name: string) {
  // networkidle lets the Supabase session + collections hydrate so we capture
  // real content, not the "Loading your workspace…" state.
  await page.goto(route, { waitUntil: "networkidle" }).catch(() => page.goto(route));
  await page.getByText("Loading your workspace…").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${DIR}/${name}.png` });
}

test.describe("Phase 3.2 screenshots", () => {
  test.skip(!SUPABASE_URL || !SVC || !EMAIL || !PASSWORD, "requires live Supabase + creds");
  test.beforeAll(() => {
    mkdirSync(DIR, { recursive: true });
  });

  async function prefill(page: Page) {
    const admin = createClient(SUPABASE_URL, SVC, { auth: { persistSession: false } });
    const { data: org } = await admin.from("organizations").select("id").eq("slug", "malahi").single();
    const [b, p, l] = await Promise.all([
      admin.from("brands").select("id").eq("organization_id", org!.id).limit(1).maybeSingle(),
      admin.from("products").select("id").eq("organization_id", org!.id).limit(1).maybeSingle(),
      admin.from("locations").select("id").eq("organization_id", org!.id).limit(1).maybeSingle(),
    ]);
    await page.evaluate(
      (data) => sessionStorage.setItem("web-vision:v1:studio-prefill", JSON.stringify(data)),
      { brandId: b.data?.id, productIds: [p.data?.id].filter(Boolean), locationId: l.data?.id, source: "qa-screenshot" },
    );
  }

  test("desktop screens", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    await shot(page, "/", "01-home-quick-create-desktop");
    await shot(page, "/projects", "02-projects-desktop");
    await page.goto("/projects", { waitUntil: "networkidle" }).catch(() => undefined);
    const card = page.locator("a[href^='/projects/']").first();
    await card.waitFor({ state: "visible", timeout: 15_000 }).catch(() => undefined);
    if (await card.isVisible().catch(() => false)) {
      await card.click();
      await page.waitForLoadState("networkidle").catch(() => undefined);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${DIR}/03-project-detail-desktop.png` });
    }
    await shot(page, "/identity", "04-identity-project-filter-desktop");
    await shot(page, "/products", "05-products-project-filter-desktop");
    await shot(page, "/locations", "06-locations-desktop");

    // Studio ready (prefilled) then generating ("cooking") state.
    await prefill(page);
    await page.goto("/studio", { waitUntil: "load" });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${DIR}/07-studio-ready-desktop.png` });
    const gen = page.getByRole("button", { name: /^generate/i }).first();
    if (await gen.isEnabled().catch(() => false)) {
      await gen.click({ force: true });
      await page.waitForTimeout(1100); // mid-generation (mock runs ~2s) → "cooking" canvas
      await page.screenshot({ path: `${DIR}/08-studio-generating-desktop.png` });
    }
    await shot(page, "/gallery", "09-gallery-project-filter-desktop");
  });

  test("mobile screens", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await shot(page, "/", "10-home-mobile");
    await shot(page, "/locations", "12-locations-mobile");

    // Mobile Studio generating: drive the 4-step flow to Generate, capture cooking.
    await prefill(page);
    await page.goto("/studio", { waitUntil: "load" });
    for (let i = 0; i < 3; i++) {
      const next = page.getByRole("button", { name: /continue/i });
      if (await next.isEnabled().catch(() => false)) await next.click();
      await page.waitForTimeout(300);
    }
    const gen = page.getByRole("button", { name: /^generate/i }).first();
    if (await gen.isVisible().catch(() => false)) {
      await gen.click({ force: true });
      await page.waitForTimeout(1100); // mid-generation → "cooking" canvas
      await page.screenshot({ path: `${DIR}/11-studio-generating-mobile.png` });
    }
  });
});
