import "server-only";

import { toFile } from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getServerSupabase } from "@/lib/supabase/server";
import { createSignedUrl, uploadObject } from "@/lib/storage/storage-service";
import { resultPath, STORAGE_BUCKET } from "@/lib/storage/paths";
import { nowIso } from "@/lib/ids";
import {
  GenerationError,
  type GenerationContext,
  type GenerationGateway,
  type GenerationRequestInput,
  type PersistResultInput,
  type ResolvedRef,
} from "./generation-orchestrator";
import type { PostProcessedImage } from "./openai-server";

type Sb = SupabaseClient<Database>;

const SIGNED_URL_TTL = 60 * 10; // 10 minutes — only needed for the server→OpenAI fetch
const WRITER_ROLES = new Set(["owner", "admin", "editor"]);
const RATE_WINDOW_MS = 60_000;

/**
 * The real Supabase + Storage implementation of {@link GenerationGateway}. All
 * loads are org-scoped + active-only (RLS is a second line of defense), input
 * images are fetched + converted server-side from short-lived signed URLs, and
 * the result is uploaded to private Storage. The browser never supplies a URL.
 */
class SupabaseGenerationGateway implements GenerationGateway {
  constructor(private readonly sb: Sb) {}

  async authorize(orgId: string): Promise<GenerationContext> {
    const {
      data: { user },
    } = await this.sb.auth.getUser();
    if (!user) throw new GenerationError("UNAUTHENTICATED", "Sign in required.");

    const { data: member } = await this.sb
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!member) throw new GenerationError("FORBIDDEN", "No active membership in this organization.");
    if (!WRITER_ROLES.has(member.role)) throw new GenerationError("FORBIDDEN", "Insufficient role to generate.");

    return { userId: user.id, orgId, role: member.role };
  }

  async findJobByIdempotencyKey(ctx: GenerationContext, key: string) {
    const { data: job } = await this.sb
      .from("generation_jobs")
      .select("id")
      .eq("id", key)
      .eq("organization_id", ctx.orgId)
      .maybeSingle();
    if (!job) return null;
    const { data: result } = await this.sb
      .from("generation_results")
      .select("id")
      .eq("job_id", key)
      .eq("organization_id", ctx.orgId)
      .maybeSingle();
    return { jobId: job.id, resultId: result?.id ?? null };
  }

  async recentJobCount(ctx: GenerationContext) {
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count } = await this.sb
      .from("generation_jobs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.orgId)
      .eq("created_by", ctx.userId)
      .gte("created_at", since);
    return count ?? 0;
  }

  private async toRef(role: ResolvedRef["role"], id: string, name: string, storagePath: string, mimeType: string): Promise<ResolvedRef> {
    const url = await createSignedUrl(this.sb, storagePath, SIGNED_URL_TTL);
    const res = await fetch(url);
    if (!res.ok) throw new GenerationError("NOT_FOUND", `Could not load the ${role} image.`);
    const bytes = Buffer.from(await res.arrayBuffer());
    const file = await toFile(bytes, `${role}-${id}`, { type: mimeType });
    return { role, id, name, mimeType, file };
  }

  async loadLogo(ctx: GenerationContext, logoId: string, brandId: string): Promise<ResolvedRef | null> {
    const { data: brand } = await this.sb
      .from("brands")
      .select("id")
      .eq("id", brandId)
      .eq("organization_id", ctx.orgId)
      .eq("status", "active")
      .maybeSingle();
    if (!brand) return null;
    const { data: logo } = await this.sb
      .from("brand_assets")
      .select("id, name, storage_path, mime_type")
      .eq("id", logoId)
      .eq("brand_id", brandId)
      .eq("status", "active")
      .maybeSingle();
    if (!logo) return null;
    return this.toRef("logo", logo.id, logo.name ?? "logo", logo.storage_path, logo.mime_type);
  }

  async loadProduct(ctx: GenerationContext, productId: string): Promise<ResolvedRef | null> {
    const { data: product } = await this.sb
      .from("products")
      .select("id, name")
      .eq("id", productId)
      .eq("organization_id", ctx.orgId)
      .eq("status", "active")
      .maybeSingle();
    if (!product) return null;
    const { data: img } = await this.sb
      .from("product_assets")
      .select("storage_path, mime_type")
      .eq("product_id", productId)
      .eq("is_primary", true)
      .maybeSingle();
    if (!img) return null;
    return this.toRef("product", product.id, product.name, img.storage_path, img.mime_type);
  }

  async loadLocation(ctx: GenerationContext, locationId: string): Promise<ResolvedRef | null> {
    const { data: loc } = await this.sb
      .from("locations")
      .select("id, name")
      .eq("id", locationId)
      .eq("organization_id", ctx.orgId)
      .eq("status", "active")
      .maybeSingle();
    if (!loc) return null;
    const { data: img } = await this.sb
      .from("location_assets")
      .select("storage_path, mime_type")
      .eq("location_id", locationId)
      .eq("is_primary", true)
      .maybeSingle();
    if (!img) return null;
    return this.toRef("location", loc.id, loc.name, img.storage_path, img.mime_type);
  }

  async composePrompt(_ctx: GenerationContext, input: GenerationRequestInput, refs: ResolvedRef[]): Promise<string> {
    return composeServerPrompt(input, refs);
  }

  async createJob(ctx: GenerationContext, jobId: string, input: GenerationRequestInput): Promise<void> {
    const { error } = await this.sb.from("generation_jobs").insert({
      id: jobId,
      organization_id: ctx.orgId,
      brand_id: input.brandId,
      location_id: input.locationId,
      status: "processing",
      progress: 0,
      request: JSON.parse(JSON.stringify({ ...input, settings: input.settings })) as Database["public"]["Tables"]["generation_jobs"]["Insert"]["request"],
      provider: "openai",
      created_by: ctx.userId,
      started_at: nowIso(),
      project_id: input.projectId ?? null,
    });
    if (error) throw new GenerationError("PROVIDER_ERROR", "Could not create the generation job.");
  }

  async uploadResult(ctx: GenerationContext, jobId: string, resultId: string, image: PostProcessedImage): Promise<string> {
    const path = resultPath(ctx.orgId, jobId, resultId, image.mimeType);
    await uploadObject(this.sb, { path, body: image.buffer, contentType: image.mimeType, upsert: true });
    return path;
  }

  async persistResult(ctx: GenerationContext, data: PersistResultInput): Promise<void> {
    const snapshot = {
      brandId: data.input.brandId,
      logoId: data.input.logoId,
      productIds: data.input.productIds,
      locationId: data.input.locationId,
      settings: data.input.settings,
      notes: data.input.notes,
    };
    const providerMetadata = {
      provider: data.provider,
      model: data.model,
      quality: data.quality,
      inputFidelity: data.inputFidelity,
      nativeWidth: data.nativeWidth,
      nativeHeight: data.nativeHeight,
      nativeSize: data.nativeSize,
      requestId: data.requestId,
      usage: data.usage,
      estimatedCostUsd: data.estimatedCostUsd,
    };
    const { error } = await this.sb.from("generation_results").insert({
      id: data.resultId,
      job_id: data.jobId,
      organization_id: ctx.orgId,
      storage_bucket: STORAGE_BUCKET,
      storage_path: data.storagePath,
      mime_type: data.mimeType,
      width: data.finalWidth,
      height: data.finalHeight,
      aspect_ratio: data.aspectRatio,
      result_index: 0,
      review_status: "draft",
      is_favorite: false,
      snapshot: snapshot as unknown as Database["public"]["Tables"]["generation_results"]["Insert"]["snapshot"],
      provider_metadata: providerMetadata as unknown as Database["public"]["Tables"]["generation_results"]["Insert"]["provider_metadata"],
      project_id: data.input.projectId ?? null,
    });
    if (error) throw new GenerationError("PROVIDER_ERROR", "Could not persist the generation result.");
  }

  async completeJob(ctx: GenerationContext, jobId: string): Promise<void> {
    await this.sb
      .from("generation_jobs")
      .update({ status: "completed", progress: 100, completed_at: nowIso() })
      .eq("id", jobId)
      .eq("organization_id", ctx.orgId);
  }

  async failJob(ctx: GenerationContext, jobId: string, code: string, message: string): Promise<void> {
    await this.sb
      .from("generation_jobs")
      .update({ status: "failed", error_code: code, error_message: message })
      .eq("id", jobId)
      .eq("organization_id", ctx.orgId);
  }
}

export async function createSupabaseGenerationGateway(): Promise<GenerationGateway> {
  const sb = await getServerSupabase();
  return new SupabaseGenerationGateway(sb);
}

/**
 * Build the hidden generation prompt server-side. Communicates the permanent
 * preservation rules + composition-safe guidance (keep products fully inside the
 * final crop). Never shown to employees.
 */
export function composeServerPrompt(input: GenerationRequestInput, refs: ResolvedRef[]): string {
  const products = refs.filter((r) => r.role === "product").map((r) => r.name);
  const location = refs.find((r) => r.role === "location")?.name ?? "the location";
  const s = input.settings;
  const lines = [
    "You are the Malahi mockup engine. Produce a single photorealistic product placement.",
    `BASE SCENE: use the location image (${location}) as the base scene. Preserve its architecture, fixed structures, camera perspective and field of view exactly. Do not redesign the space.`,
    `PRODUCTS: place ${products.join(", ") || "the product"} into the scene. Preserve each product's exact design, geometry, proportions, materials and colors from its reference image. Do not invent or duplicate products.`,
    "LOGO: apply the provided logo only to appropriate product/branding surfaces. Preserve the logo's lettering, glyphs and proportions exactly. Do not place the logo on architecture or unrelated surfaces.",
    "REALISM: place products at realistic scale with correct floor/surface contact, lighting, shadows, reflections and occlusion that match the scene.",
    `COMPOSITION-SAFE: keep all products and any applied logo fully within the central safe area so nothing important is lost when the image is cropped to the final ${s.aspectRatio} ratio. Leave comfortable margins; do not place key subjects at the extreme top/bottom/left/right edges.`,
    `OUTPUT INTENT: ${s.visualStyle} style, ${s.placement} placement, ${s.aspectRatio} aspect ratio.`,
    input.notes?.trim() ? `EMPLOYEE NOTES (secondary — never override the preservation rules above): ${input.notes.trim()}` : "",
    "Do not add extra products, brands, text or watermarks. Do not output multiple variations.",
  ];
  return lines.filter(Boolean).join("\n");
}
