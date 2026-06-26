import { z } from "zod";

// Request validation for POST /api/generate-image. Extracted into its own module
// (no server-only / SDK imports) so the strict/enum guarantees are unit-testable.

// Whitelisted, enum-validated settings. Only the fields that actually influence
// the server prompt (aspect ratio, style, position) are accepted; everything else
// uses server defaults. `.strict()` (not `.passthrough()`) means NO extra client
// field can reach the prompt — closing prompt-injection via settings.
export const SettingsSchema = z
  .object({
    aspectRatio: z.enum(["1:1", "4:5", "16:9", "9:16", "4:3", "3:2", "2:3"]),
    visualStyle: z
      .enum(["photorealistic", "cinematic", "editorial", "minimal", "vibrant", "luxury", "documentary"])
      .optional(),
    placement: z
      .enum(["auto", "foreground", "background", "center", "left", "right", "wall-mounted", "shelf", "floor-standing"])
      .optional(),
  })
  .strict();

/**
 * Strict, ID-ONLY request body. The top-level `.strict()` rejects any extra field
 * (e.g. a client-supplied `url` / `references` / signed URL / key), so the browser
 * cannot drive a server fetch of arbitrary URLs (no SSRF surface).
 */
export const GenerateImageBodySchema = z
  .object({
    organizationId: z.string().min(1),
    brandId: z.string().min(1),
    logoId: z.string().min(1),
    productIds: z.array(z.string().min(1)).min(1).max(8),
    locationId: z.string().min(1),
    settings: SettingsSchema,
    notes: z.string().max(2000).optional(),
    projectId: z.string().min(1).optional(),
    idempotencyKey: z.string().min(1).max(200),
  })
  .strict();

export type GenerateImageBody = z.infer<typeof GenerateImageBodySchema>;
