import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Live invitation / password-recovery onboarding — GUARDED. Requires Supabase
 * config + the service-role key (to mint invite/recovery links and clean up
 * temporary users). Skips otherwise. Uses generateLink's `hashed_token` against
 * our /auth/callback (verifyOtp path), avoiding any reliance on the project's
 * redirect allow-list and never sending real emails or reusing the owner token.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const CONFIGURED = Boolean(SUPABASE_URL && SVC);

test.describe.configure({ mode: "serial" });

test.describe("Supabase onboarding", () => {
  test.skip(!CONFIGURED, "requires Supabase env + service-role key");

  let admin: SupabaseClient;
  const tempEmails: string[] = [];

  test.beforeAll(() => {
    admin = createClient(SUPABASE_URL, SVC, { auth: { persistSession: false } });
  });

  test.afterAll(async () => {
    if (!admin) return;
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    for (const email of tempEmails) {
      const u = data.users.find((x) => x.email === email);
      if (u) await admin.auth.admin.deleteUser(u.id).catch(() => undefined);
    }
  });

  async function tokenHashFor(type: "invite" | "recovery", email: string): Promise<string> {
    const { data, error } = await admin.auth.admin.generateLink({
      type,
      email,
      options: { redirectTo: "http://localhost:3210/auth/callback?next=/auth/set-password" },
    });
    if (error) throw new Error(error.message);
    return data.properties.hashed_token;
  }

  test("valid invitation reaches Create-password and completes into the app", async ({ page }) => {
    const email = `qa-invite-${Date.now()}@web-vision.test`;
    tempEmails.push(email);
    const tokenHash = await tokenHashFor("invite", email);

    await page.goto(`/auth/callback?token_hash=${tokenHash}&type=invite&next=/auth/set-password`);
    await expect.poll(() => new URL(page.url()).pathname).toBe("/auth/set-password");
    await expect(page.getByRole("heading", { name: /create your password/i })).toBeVisible();

    // Mismatch is rejected.
    await page.getByLabel("New password").fill("StrongPass123");
    await page.getByLabel("Confirm password").fill("Different123");
    await page.getByRole("button", { name: /create password/i }).click();
    await expect(page.getByText(/match/i)).toBeVisible();

    // Successful creation enters the app (leaves the set-password route).
    await page.getByLabel("Confirm password").fill("StrongPass123");
    await page.getByRole("button", { name: /create password/i }).click();
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
      .not.toContain("/auth/set-password");
  });

  test("expired/invalid invitation shows the recovery state (not the normal form)", async ({ page }) => {
    await page.goto("/auth/callback?error=access_denied&error_code=otp_expired");
    await expect.poll(() => new URL(page.url()).pathname).toBe("/auth/invite-expired");
    await expect(page.getByRole("heading", { name: /expired|can.t be used/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /request a new setup link/i })).toBeVisible();
  });

  test("sign-in surfaces an expired-link banner from error params but keeps the form", async ({ page }) => {
    await page.goto("/sign-in?error_code=otp_expired");
    await expect(page.getByText(/invitation or reset link has expired/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("forgot-password submits with generic success", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await page.getByLabel("Email").fill(`qa-forgot-${Date.now()}@web-vision.test`);
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByText(/if an account exists/i)).toBeVisible();
  });

  test("recovery link reaches set-password and updates the password", async ({ page }) => {
    const email = `qa-recovery-${Date.now()}@web-vision.test`;
    tempEmails.push(email);
    await admin.auth.admin.createUser({ email, password: "InitialPass123", email_confirm: true });
    const tokenHash = await tokenHashFor("recovery", email);

    await page.goto(`/auth/callback?token_hash=${tokenHash}&type=recovery&next=/auth/set-password`);
    await expect.poll(() => new URL(page.url()).pathname).toBe("/auth/set-password");
    await page.getByLabel("New password").fill("NewStrongPass123");
    await page.getByLabel("Confirm password").fill("NewStrongPass123");
    await page.getByRole("button", { name: /create password/i }).click();
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
      .not.toContain("/auth/set-password");
  });

  test("sign-in has no app-supplied default credentials and rejects bad logins", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByLabel("Email")).toHaveValue("");
    await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
    await page.getByLabel("Email").fill("nobody@web-vision.test");
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/incorrect/i)).toBeVisible();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/sign-in");
  });
});
