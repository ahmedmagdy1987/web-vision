"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  Download,
  MapPin,
  Package2,
  RefreshCw,
  Sparkles,
  Star,
  XCircle,
} from "lucide-react";
import type { GenerationResult, GenerationSettings } from "@/lib/domain";
import { CONTROL_LABELS, creativityLabel } from "@/lib/domain";
import { resultRepository } from "@/lib/repositories";
import { studioPrefill } from "@/lib/store/studio-draft";
import { readableForeground } from "@/lib/theme/brand-accent";
import { AspectFrame } from "@/components/common/aspect-frame";
import { AssetImage } from "@/components/common/asset-image";
import { ReviewBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { InstructionsViewer } from "./instructions-viewer";

interface ResultDetailProps {
  result: GenerationResult;
}

interface SettingRow {
  label: string;
  value: string;
}

function buildSettingRows(settings: GenerationSettings): SettingRow[] {
  return [
    { label: "Visualization", value: CONTROL_LABELS.visualizationType[settings.visualizationType] },
    { label: "Visual style", value: CONTROL_LABELS.visualStyle[settings.visualStyle] },
    { label: "Placement", value: CONTROL_LABELS.placement[settings.placement] },
    { label: "Camera angle", value: CONTROL_LABELS.cameraAngle[settings.cameraAngle] },
    { label: "Environment", value: CONTROL_LABELS.environmentType[settings.environmentType] },
    { label: "Lighting", value: CONTROL_LABELS.lighting[settings.lighting] },
    { label: "Aspect ratio", value: settings.aspectRatio },
    { label: "Product scale", value: CONTROL_LABELS.productScale[settings.productScale] },
    { label: "Brand visibility", value: CONTROL_LABELS.brandVisibility[settings.brandVisibility] },
    { label: "People in scene", value: CONTROL_LABELS.peopleInScene[settings.peopleInScene] },
    {
      label: "Creativity",
      value: `${creativityLabel(settings.creativity)} (${settings.creativity})`,
    },
    { label: "Outputs", value: String(settings.outputCount) },
  ];
}

export function ResultDetail({ result }: ResultDetailProps) {
  const router = useRouter();
  const { snapshot } = result;
  const accentFg = readableForeground(snapshot.brandAccent);

  const settingRows = React.useMemo(() => buildSettingRows(snapshot.settings), [snapshot.settings]);

  const goToStudio = React.useCallback(
    (settingsOverride: Partial<GenerationSettings>, source: string, message: string) => {
      studioPrefill.set({
        brandId: snapshot.brandId,
        logoId: snapshot.logoId,
        productIds: snapshot.productIds,
        locationId: snapshot.locationId,
        locationDraft: snapshot.locationDraft,
        mainLocationImageId: undefined,
        settings: { ...snapshot.settings, ...settingsOverride },
        notes: snapshot.notes,
        source,
      });
      toast.success(message);
      router.push("/studio");
    },
    [router, snapshot],
  );

  const handleDuplicate = () =>
    goToStudio({}, "gallery:duplicate", "Setup copied to Studio");
  const handleRegenerate = () =>
    goToStudio({}, "gallery:regenerate", "Re-running this setup in Studio");
  const handleVariation = () =>
    goToStudio(
      { creativity: Math.min(100, snapshot.settings.creativity + 20) },
      "gallery:variation",
      "Creating a more experimental variation",
    );

  const handleReview = (review: "approved" | "rejected") => {
    if (result.review === review) {
      resultRepository.setReview(result.id, "draft");
      toast.success("Reset to draft");
      return;
    }
    resultRepository.setReview(result.id, review);
    toast.success(review === "approved" ? "Marked as approved" : "Marked as rejected");
  };

  const handleToggleFavorite = () => {
    const next = resultRepository.toggleFavorite(result.id);
    toast.success(next?.favorite ? "Added to favorites" : "Removed from favorites");
  };

  const downloadName = `${snapshot.brandName.replace(/\s+/g, "-").toLowerCase()}-mockup-${result.id}.svg`;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px]">
      {/* Preview */}
      <div className="space-y-3">
        <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
          <AspectFrame ratio={snapshot.settings.aspectRatio} className="bg-muted">
            <AssetImage
              src={result.image.url}
              alt={`${snapshot.brandName} mockup`}
              className="absolute inset-0 h-full w-full object-contain"
            />
          </AspectFrame>
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
          <span>
            {result.image.width}×{result.image.height} · seed {result.seed}
          </span>
          <Button asChild variant="outline" size="sm">
            <a href={result.image.url} download={downloadName}>
              <Download className="size-4" />
              Download
            </a>
          </Button>
        </div>
      </div>

      {/* Details panel */}
      <div className="space-y-5">
        {/* Header: brand + review */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-semibold"
                style={
                  snapshot.logoUrl
                    ? undefined
                    : { backgroundColor: snapshot.brandAccent, color: accentFg }
                }
              >
                {snapshot.logoUrl ? (
                  <AssetImage
                    src={snapshot.logoUrl}
                    alt={`${snapshot.brandName} logo`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  snapshot.brandName.slice(0, 1).toUpperCase()
                )}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold">{snapshot.brandName}</h2>
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <span
                    className="inline-block size-2.5 rounded-full"
                    style={{ backgroundColor: snapshot.brandAccent }}
                    aria-hidden
                  />
                  {snapshot.brandAccent}
                </span>
              </div>
            </div>
            <ReviewBadge review={result.review} />
          </div>

          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <CalendarClock className="size-3.5" />
            Created {new Date(result.createdAt).toLocaleString()}
          </p>
        </div>

        {/* Primary actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={result.review === "approved" ? "default" : "outline"}
            onClick={() => handleReview("approved")}
            aria-pressed={result.review === "approved"}
          >
            <CheckCircle2 className="size-4" />
            {result.review === "approved" ? "Approved" : "Approve"}
          </Button>
          <Button
            variant={result.review === "rejected" ? "destructive" : "outline"}
            onClick={() => handleReview("rejected")}
            aria-pressed={result.review === "rejected"}
          >
            <XCircle className="size-4" />
            {result.review === "rejected" ? "Rejected" : "Reject"}
          </Button>
          <Button
            variant="outline"
            className={cn("col-span-2", result.favorite && "text-warning border-warning/40")}
            onClick={handleToggleFavorite}
            aria-pressed={result.favorite}
          >
            <Star className={cn("size-4", result.favorite && "fill-current")} />
            {result.favorite ? "Favorited" : "Add to favorites"}
          </Button>
        </div>

        <Separator />

        {/* Composition summary */}
        <dl className="space-y-3 text-sm">
          <SummaryItem icon={Package2} label="Products">
            {snapshot.productNames.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {snapshot.productNames.map((name, index) => (
                  <Badge key={`${name}-${index}`} variant="secondary" className="font-normal">
                    {name}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">No products</span>
            )}
          </SummaryItem>

          <SummaryItem icon={MapPin} label="Location">
            {snapshot.locationName ? (
              <div className="flex items-center gap-2">
                {snapshot.locationImageUrl && (
                  <span className="bg-muted size-9 shrink-0 overflow-hidden rounded-md">
                    <AssetImage
                      src={snapshot.locationImageUrl}
                      alt={snapshot.locationName}
                      className="h-full w-full object-cover"
                    />
                  </span>
                )}
                <span>{snapshot.locationName}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">No location</span>
            )}
          </SummaryItem>
        </dl>

        <Separator />

        {/* Settings grid */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Generation settings</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            {settingRows.map((row) => (
              <div key={row.label} className="min-w-0">
                <dt className="text-muted-foreground text-xs">{row.label}</dt>
                <dd className="truncate font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant={snapshot.settings.preserveArchitecture ? "brand" : "muted"} className="font-normal">
              {snapshot.settings.preserveArchitecture ? "Preserve architecture" : "Free architecture"}
            </Badge>
            <Badge variant={snapshot.settings.removeExistingObjects ? "brand" : "muted"} className="font-normal">
              {snapshot.settings.removeExistingObjects ? "Remove existing objects" : "Keep existing objects"}
            </Badge>
          </div>
        </div>

        {snapshot.notes && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold">Notes</h3>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">{snapshot.notes}</p>
            </div>
          </>
        )}

        <Separator />

        <InstructionsViewer instructions={snapshot.instructions} />

        <Separator />

        {/* Reuse actions */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Reuse this setup</h3>
          <div className="grid grid-cols-1 gap-2">
            <Button variant="default" onClick={handleRegenerate}>
              <RefreshCw className="size-4" />
              Regenerate in Studio
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleDuplicate}>
                <Copy className="size-4" />
                Duplicate setup
              </Button>
              <Button variant="outline" onClick={handleVariation}>
                <Sparkles className="size-4" />
                Create variation
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Icon className="size-3.5" />
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
