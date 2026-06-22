/**
 * Private Supabase Storage access. Works with any Supabase client (browser uses
 * RLS as the signed-in user; server/admin clients for trusted tasks). Stores
 * object PATHS only; view/download URLs are short-lived signed URLs minted here
 * and never persisted.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, formatBytes } from "@/lib/upload";
import { STORAGE_BUCKET, extensionForMime } from "./paths";

export type WvSupabaseClient = SupabaseClient<Database>;

export const DEFAULT_SIGNED_URL_TTL = 60 * 60; // seconds (1 hour)

export class StorageError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "StorageError";
    this.cause = cause;
  }
}

export interface UploadInput {
  path: string;
  body: Blob | File | ArrayBuffer | Uint8Array | string;
  contentType: string;
  upsert?: boolean;
}

/** Defense-in-depth file validation (type, extension, size) before upload. */
export function validateUploadFile(file: File): { ok: boolean; error?: string } {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, error: `${file.name}: unsupported type.` };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: `${file.name}: too large (${formatBytes(file.size)}). Max ${formatBytes(MAX_IMAGE_BYTES)}.` };
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const expected = extensionForMime(file.type);
  // jpg/jpeg both map to image/jpeg.
  const allowed = expected === "jpg" ? ["jpg", "jpeg"] : [expected];
  if (ext && !allowed.includes(ext)) {
    return { ok: false, error: `${file.name}: extension .${ext} does not match ${file.type}.` };
  }
  return { ok: true };
}

export async function uploadObject(supabase: WvSupabaseClient, input: UploadInput): Promise<void> {
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(input.path, input.body, {
    contentType: input.contentType,
    upsert: input.upsert ?? false,
  });
  if (error) throw new StorageError(`Upload failed for ${input.path}: ${error.message}`, error);
}

export async function createSignedUrl(
  supabase: WvSupabaseClient,
  path: string,
  ttl: number = DEFAULT_SIGNED_URL_TTL,
): Promise<string> {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, ttl);
  if (error || !data?.signedUrl) {
    throw new StorageError(`Could not sign ${path}: ${error?.message ?? "unknown error"}`, error);
  }
  return data.signedUrl;
}

/** Batch sign many paths; returns a path → signed URL map (missing on failure). */
export async function createSignedUrls(
  supabase: WvSupabaseClient,
  paths: string[],
  ttl: number = DEFAULT_SIGNED_URL_TTL,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(paths)].filter(Boolean);
  if (unique.length === 0) return out;
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrls(unique, ttl);
  if (error || !data) throw new StorageError(`Could not sign ${unique.length} object(s): ${error?.message ?? "unknown"}`, error);
  for (const entry of data) {
    if (entry.signedUrl && entry.path) out.set(entry.path, entry.signedUrl);
  }
  return out;
}

/** Best-effort removal. Returns which paths were removed vs. left orphaned. */
export async function removeObjects(
  supabase: WvSupabaseClient,
  paths: string[],
): Promise<{ removed: string[]; failed: string[] }> {
  const unique = [...new Set(paths)].filter(Boolean);
  if (unique.length === 0) return { removed: [], failed: [] };
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).remove(unique);
  if (error) return { removed: [], failed: unique };
  const removed = (data ?? []).map((o) => o.name);
  const failed = unique.filter((p) => !removed.includes(p));
  return { removed, failed };
}

/**
 * Upload objects, then run the DB write. If the DB write throws, the freshly
 * uploaded objects are cleaned up so no orphan is left behind. If the cleanup
 * itself fails, the original error is still surfaced (caller can reconcile via
 * the retained paths in the error).
 */
export async function uploadThenPersist<T>(
  supabase: WvSupabaseClient,
  uploads: UploadInput[],
  persist: () => Promise<T>,
): Promise<T> {
  const uploaded: string[] = [];
  try {
    for (const u of uploads) {
      await uploadObject(supabase, u);
      uploaded.push(u.path);
    }
    return await persist();
  } catch (err) {
    if (uploaded.length > 0) {
      try {
        await removeObjects(supabase, uploaded);
      } catch {
        // Surface the original failure; orphan paths remain in `uploaded`.
      }
    }
    throw err instanceof Error ? err : new StorageError("Persist after upload failed", err);
  }
}

/** Decode a data: URL into a Blob (used by the localStorage → Storage importer). */
export function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } {
  const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!match) throw new StorageError("Not a data URL");
  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const data = match[3];
  if (isBase64) {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { blob: new Blob([bytes], { type: mimeType }), mimeType };
  }
  return { blob: new Blob([decodeURIComponent(data)], { type: mimeType }), mimeType };
}
