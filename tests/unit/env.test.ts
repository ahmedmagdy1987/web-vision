import { describe, it, expect, afterEach } from "vitest";
import { validateSupabaseEnv } from "@/lib/supabase/env";

const SAVED = { ...process.env };

afterEach(() => {
  process.env = { ...SAVED };
});

describe("validateSupabaseEnv", () => {
  it("is always ok in local/demo mode", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const result = validateSupabaseEnv("local");
    expect(result.ok).toBe(true);
    expect(result.message.toLowerCase()).toContain("local");
  });

  it("fails in supabase mode when public env is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const result = validateSupabaseEnv("supabase");
    expect(result.ok).toBe(false);
  });

  it("passes in supabase mode when public env is present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://demo.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    const result = validateSupabaseEnv("supabase");
    expect(result.ok).toBe(true);
    expect(result.message).toContain("demo.supabase.co");
  });
});
