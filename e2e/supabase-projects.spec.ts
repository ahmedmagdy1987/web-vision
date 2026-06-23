import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Live project workflow — GUARDED. Verifies a project persists in Supabase and
 * the Locations page loads. Cleans up the QA projects it creates.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const EMAIL = process.env.E2E_TEST_EMAIL ?? "";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/");
}

test.describe("Supabase projects", () => {
  test.skip(!SUPABASE_URL || !SVC || !EMAIL || !PASSWORD, "requires live Supabase + creds");

  test.afterAll(async () => {
    const admin = createClient(SUPABASE_URL, SVC, { auth: { persistSession: false } });
    await admin.from("projects").delete().like("name", "QA Project %");
  });

  test("create a project that persists across reload", async ({ page }) => {
    const name = `QA Project ${Date.now()}`;
    await signIn(page);
    await page.goto("/projects");
    await page.getByRole("button", { name: /new project/i }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/name/i).first().fill(name);
    await dialog.getByRole("button", { name: /create project|save/i }).click();
    await expect(page.getByText(name).first()).toBeVisible();

    await page.reload();
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 15_000 });
  });

  test("the Locations page loads for the signed-in owner", async ({ page }) => {
    await signIn(page);
    await page.goto("/locations");
    await expect.poll(() => new URL(page.url()).pathname).toBe("/locations");
    await expect(page.getByRole("heading", { name: /locations/i }).first()).toBeVisible();
  });
});
