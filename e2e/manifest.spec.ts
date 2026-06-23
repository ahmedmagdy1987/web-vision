import { test, expect } from "@playwright/test";

/**
 * Manifest + metadata routes must be served as assets (not intercepted by the
 * auth proxy and turned into an HTML redirect). Runs in demo and Supabase modes.
 */
test.describe("Web app manifest", () => {
  test("manifest.webmanifest parses as JSON with the correct content type", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"] ?? "").toContain("application/manifest+json");
    const json = await res.json(); // throws if the body is not valid JSON
    expect(String(json.name)).toMatch(/web vision/i);
    expect(Array.isArray(json.icons) && json.icons.length).toBeTruthy();
    expect(String(json.theme_color)).toMatch(/^#/);
  });

  test("icon and apple-icon resolve", async ({ request }) => {
    const icon = await request.get("/icon.svg");
    expect(icon.status()).toBe(200);
    expect(icon.headers()["content-type"] ?? "").toContain("image/svg+xml");
    const apple = await request.get("/apple-icon");
    expect(apple.status()).toBe(200);
    expect(apple.headers()["content-type"] ?? "").toContain("image/png");
  });
});
