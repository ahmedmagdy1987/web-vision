import "server-only";
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { STORAGE_BUCKET, extensionForMime } from "@/lib/storage/paths";

// Streams a private result image as a same-origin attachment so the browser
// downloads it directly (no new tab, no exposed Storage URL). Server-only.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sanitize into a safe, traversal-proof download filename. */
function safeFilename(brandName: unknown, id: string, mime: string): string {
  const base =
    (typeof brandName === "string" ? brandName : "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "mockup";
  const shortId = id.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "result";
  return `${base}-mockup-${shortId}.${extensionForMime(mime)}`;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-fA-F-]{10,64}$/.test(id)) {
    return NextResponse.json({ error: "Invalid result id." }, { status: 400 });
  }

  const sb = await getServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // RLS already limits this to results in organizations the user belongs to.
  const { data: row, error } = await sb
    .from("generation_results")
    .select("organization_id, storage_path, mime_type, snapshot")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Result not found." }, { status: 404 });

  // Belt-and-suspenders membership check on top of RLS.
  const { data: member } = await sb
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", row.organization_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { data: blob, error: dlErr } = await sb.storage.from(STORAGE_BUCKET).download(row.storage_path);
  if (dlErr || !blob) return NextResponse.json({ error: "File unavailable." }, { status: 404 });

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const mime = row.mime_type || "application/octet-stream";
  const filename = safeFilename((row.snapshot as { brandName?: string } | null)?.brandName, id, mime);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      // The Content-Type comes from a stored DB value — forbid MIME sniffing and
      // sandbox the response so it can never be interpreted as active content.
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
