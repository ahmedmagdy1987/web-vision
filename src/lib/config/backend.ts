/**
 * Data backend selection.
 *
 *  - "supabase": Supabase Postgres + Storage + Auth (the configured backend).
 *  - "local":    in-browser localStorage demo backend (Phase 1/2 behaviour),
 *                kept ONLY for development/demo and tests.
 *
 * Resolution order:
 *  1. Explicit override via NEXT_PUBLIC_DATA_BACKEND ("local" | "supabase").
 *  2. Otherwise "supabase" when the public Supabase env is present, else "local".
 *
 * This guarantees we never *silently* fall back to localStorage once Supabase is
 * configured: choosing local then requires an explicit NEXT_PUBLIC_DATA_BACKEND=local.
 */

import { isSupabaseConfigured } from "@/lib/supabase/env";

export type DataBackend = "local" | "supabase";

export function getDataBackend(): DataBackend {
  const explicit = process.env.NEXT_PUBLIC_DATA_BACKEND;
  if (explicit === "local" || explicit === "supabase") return explicit;
  return isSupabaseConfigured() ? "supabase" : "local";
}

export function isSupabaseBackend(): boolean {
  return getDataBackend() === "supabase";
}

export function isLocalBackend(): boolean {
  return getDataBackend() === "local";
}
