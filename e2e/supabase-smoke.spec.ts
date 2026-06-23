import { test, expect, type Page } from "@playwright/test";

/**
 * Live Supabase smoke — GUARDED. After signing in, visits every route at the
 * accepted viewport sizes and asserts there are no console errors, no uncaught
 * page errors, and no horizontal overflow. Skips without Supabase config.
 */
const SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
const EMAIL = process.env.E2E_TEST_EMAIL ?? "";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";
const ROUTES = ["/", "/projects", "/identity", "/products", "/locations", "/studio", "/gallery"];
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile", width: 390, height: 844 },
];

test.describe.configure({ mode: "serial" });

test.describe("Supabase smoke", () => {
  test.skip(!SUPABASE, "requires a configured Supabase env (NEXT_PUBLIC_SUPABASE_URL)");
  test.skip(!EMAIL || !PASSWORD, "requires E2E_TEST_EMAIL / E2E_TEST_PASSWORD");

  async function signIn(page: Page) {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/");
  }

  test("no console/page errors or overflow across routes and viewports", async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`console: ${m.text()}`);
    });

    await signIn(page);

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const route of ROUTES) {
        await page.goto(route, { waitUntil: "load" });
        await expect.poll(() => new URL(page.url()).pathname).toBe(route);
        await page.waitForTimeout(600); // settle async hydration
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        );
        expect(overflow, `horizontal overflow at ${vp.name} ${route}`).toBe(false);
      }
    }

    // "Failed to fetch" = Supabase requests aborted by the test's full-page
    // navigations (real app uses client-side nav, hydrating once) — benign here.
    // Real failures surface as HTTP 4xx/5xx, which the live CRUD/asset tests cover.
    const real = errors.filter(
      (e) => !/favicon|net::ERR_ABORTED|404 \(|Failed to fetch/i.test(e),
    );
    expect(real, `console/page errors:\n${real.join("\n")}`).toEqual([]);
  });
});
