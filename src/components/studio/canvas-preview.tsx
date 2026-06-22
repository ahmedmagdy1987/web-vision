"use client";

import { ImageIcon, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import type { Brand, GenerationJob, GenerationSettings, LogoAsset, Product } from "@/lib/domain";
import { CONTROL_LABELS } from "@/lib/domain";
import { AssetImage } from "@/components/common/asset-image";
import { AspectFrame } from "@/components/common/aspect-frame";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface CanvasPreviewProps {
  settings: GenerationSettings;
  brand: Brand | null;
  logo: LogoAsset | null;
  products: Product[];
  locationImageUrl: string | null;
  locationName: string | null;
  job: GenerationJob | null;
}

export function CanvasPreview({
  settings,
  brand,
  logo,
  products,
  locationImageUrl,
  locationName,
  job,
}: CanvasPreviewProps) {
  const busy = job?.status === "queued" || job?.status === "processing";
  const failed = job?.status === "failed";

  return (
    <section aria-label="Composition preview" className="space-y-3">
      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <AspectFrame ratio={settings.aspectRatio} className="bg-muted">
          {locationImageUrl ? (
            <AssetImage src={locationImageUrl} alt={locationName ?? "Location"} className="absolute inset-0 size-full object-cover" />
          ) : (
            <div className="bg-grid text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2">
              <ImageIcon className="size-8 opacity-50" />
              <p className="text-sm">Select a location to preview your composition</p>
            </div>
          )}

          {/* Brand mark overlay */}
          {brand && (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/45 px-2.5 py-1 backdrop-blur">
              {logo ? (
                <span className="size-5 overflow-hidden rounded-sm bg-white/90">
                  <AssetImage src={logo.asset.url} alt="" className="size-full object-contain" />
                </span>
              ) : (
                <span className="size-2.5 rounded-full" style={{ backgroundColor: brand.accentColor }} />
              )}
              <span className="text-xs font-medium text-white">{brand.name}</span>
            </div>
          )}

          {/* Product thumbnails overlay */}
          {products.length > 0 && (
            <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-end gap-2">
              {products.slice(0, 5).map((product) => (
                <span
                  key={product.id}
                  className="size-12 overflow-hidden rounded-md border-2 border-white/80 shadow-md"
                  title={product.name}
                >
                  <AssetImage src={product.mainImage?.url} alt={product.name} className="size-full object-cover" />
                </span>
              ))}
              {products.length > 5 && (
                <span className="rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white">
                  +{products.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Job overlay */}
          {(busy || failed) && (
            <div
              className={cn(
                "absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center backdrop-blur-sm",
                failed ? "bg-destructive/20" : "bg-background/70",
              )}
            >
              {failed ? (
                <>
                  <TriangleAlert className="text-destructive size-8" />
                  <p className="text-sm font-medium">Generation failed</p>
                  <p className="text-muted-foreground max-w-xs text-xs">{job?.error}</p>
                </>
              ) : (
                <>
                  <Loader2 className="text-brand size-8 animate-spin" />
                  <p className="text-sm font-medium">
                    {job?.status === "queued" ? "Queued…" : "Generating your mockup…"}
                  </p>
                  <div className="w-full max-w-xs">
                    <Progress value={job?.progress ?? 0} />
                  </div>
                </>
              )}
            </div>
          )}
        </AspectFrame>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="brand">
          <Sparkles />
          {CONTROL_LABELS.visualizationType[settings.visualizationType]}
        </Badge>
        <Badge variant="outline">{settings.aspectRatio}</Badge>
        <Badge variant="outline">{CONTROL_LABELS.visualStyle[settings.visualStyle]}</Badge>
        <Badge variant="outline">{CONTROL_LABELS.lighting[settings.lighting]}</Badge>
        <Badge variant="muted">
          {settings.outputCount} output{settings.outputCount === 1 ? "" : "s"}
        </Badge>
      </div>
    </section>
  );
}
