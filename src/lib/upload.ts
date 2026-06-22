import type { ImageAsset } from "@/lib/domain";
import { newId, nowIso } from "@/lib/ids";

export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
  "image/avif",
];

export const ACCEPTED_IMAGE_EXTENSIONS = ".png,.jpg,.jpeg,.webp,.svg,.gif,.avif";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

export interface UploadValidation {
  ok: boolean;
  error?: string;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Validate a single file's type and size before reading it. */
export function validateImageFile(file: File): UploadValidation {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, error: `${file.name}: unsupported type. Use PNG, JPG, WEBP, SVG, GIF or AVIF.` };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: `${file.name}: too large (${formatBytes(file.size)}). Max ${formatBytes(MAX_IMAGE_BYTES)}.` };
  }
  return { ok: true };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function readDimensions(dataUrl: string): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({});
    img.src = dataUrl;
  });
}

/** Convert a validated file into a persisted (data-URL) ImageAsset. */
export async function fileToImageAsset(file: File): Promise<ImageAsset> {
  const url = await readAsDataUrl(file);
  const { width, height } = await readDimensions(url);
  return {
    id: newId("img"),
    url,
    name: file.name,
    mimeType: file.type,
    size: file.size,
    width,
    height,
    createdAt: nowIso(),
  };
}

export interface UploadResult {
  assets: ImageAsset[];
  errors: string[];
}

/** Validate and convert multiple files, collecting per-file errors. */
export async function filesToImageAssets(files: File[]): Promise<UploadResult> {
  const assets: ImageAsset[] = [];
  const errors: string[] = [];
  for (const file of files) {
    const validation = validateImageFile(file);
    if (!validation.ok) {
      if (validation.error) errors.push(validation.error);
      continue;
    }
    try {
      assets.push(await fileToImageAsset(file));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Failed to read ${file.name}`);
    }
  }
  return { assets, errors };
}
