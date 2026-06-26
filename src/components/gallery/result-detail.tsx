"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
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
import { ASPECT_RATIO_VALUES, CONTROL_LABELS, creativityLabel } from "@/lib/domain";
import { resultRepository } from "@/lib/repositories";
import { studioPrefill } from "@/lib/store/studio-draft";
import { readableForeground } from "@/lib/theme/brand-accent";
import { AspectFrame } from "@/components/common/aspect-frame";
import { AssetImage } from "@/components/common/asset-image";
import { ImageLightbox } from "@/components/common/image-lightbox";
import { ReviewBadge } from "@/components/common/status-badge";
import { ResultCardMenu } from "./result-card-menu";
import { downloadResultFile } from "@/lib/services/download-result";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

interface ResultDetailProps {
  result: GenerationResult;
}

function buildSettingRows(settings: GenerationSettings): { label: string; value: string }[] {
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
    { label: "Creativity", value: `${creativityLabel(settings.creativity)} (${settings.creativity})` },
    { label: "Outputs", value: String(settings.outputCount) },
  ];
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">{children}</h3>;
}

function ContinueAction({
  icon: Icon,
  label,
  help,
  variant = "outline",
  onClick,
}: {
  icon: typeof RefreshCw;
  label: string;
  help: string;
  variant?: "default" | "outline";
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={variant} className="w-full justify-start" onClick={onClick}>
          <Icon className="size-4" />
          {label}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{help}</TooltipContent>
    </Tooltip>
  );
}

export function ResultDetail({ result }: ResultDetailProps) {
  const router = useRouter();
  const { snapshot } = result;
  const accentFg = readableForeground(snapshot.brandAccent);
  const settingRows = React.useMemo(() => buildSettingRows(snapshot.settings), [snapshot.settings]);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);

  const handleDownload = React.useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadResultFile(result.id);
      toast.success("Download started");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }, [downloading, result.id]);

  const ratioValue = ASPECT_RATIO_VALUES[snapshot.settings.aspectRatio];
  const isPortrait = ratioValue < 1;

  const goToStudio = React.useCallback(
    (settingsOverride: Partial<GenerationSettings>, message: string) => {
      studioPrefill.set({
        brandId: snapshot.brandId,
        logoId: snapshot.logoId,
        productIds: snapshot.productIds,
        locationId: snapshot.locationId,
        locationDraft: snapshot.locationDraft,
        mainLocationImageId: undefined,
        settings: { ...snapshot.settings, ...settingsOverride },
        notes: snapshot.notes,
        source: "gallery",
      });
      toast.success(message);
      router.push("/");
    },
    [router, snapshot],
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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
      {/* Preview — kept dominant; portrait results are width-capped so they don't tower. */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label={`View ${snapshot.brandName} mockup full size`}
          className="bg-card mx-auto block w-full cursor-zoom-in overflow-hidden rounded-xl border shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          style={isPortrait ? { maxWidth: `calc(72vh * ${ratioValue})` } : undefined}
        >
          <AspectFrame ratio={snapshot.settings.aspectRatio} className="bg-muted">
            <AssetImage
              src={result.image.url}
              alt={`${snapshot.brandName} mockup`}
              className="absolute inset-0 h-full w-full object-contain"
            />
          </AspectFrame>
        </button>
        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
          <span>
            {result.image.width}×{result.image.height} · {snapshot.settings.aspectRatio}
            {typeof result.seed === "number" ? ` · seed ${result.seed}` : ""}
          </span>
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
            <Download className="size-4" />
            {downloading ? "Downloading…" : "Download"}
          </Button>
        </div>
      </div>

      {/* Details panel */}
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-semibold"
              style={snapshot.logoUrl ? undefined : { backgroundColor: snapshot.brandAccent, color: accentFg }}
            >
              {snapshot.logoUrl ? (
                <AssetImage src={snapshot.logoUrl} alt={`${snapshot.brandName} logo`} className="h-full w-full object-cover" />
              ) : (
                snapshot.brandName.slice(0, 1).toUpperCase()
              )}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{snapshot.brandName}</h2>
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <CalendarClock className="size-3" />
                {new Date(result.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ReviewBadge review={result.review} />
            <ResultCardMenu
              result={result}
              onDeleted={() => router.push("/gallery")}
              triggerLabel="Result actions"
            />
          </div>
        </div>

        {/* Review */}
        <section className="space-y-2">
          <SectionTitle>Review</SectionTitle>
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
          </div>
          <Button
            variant="outline"
            className={cn("w-full", result.favorite && "text-warning border-warning/40")}
            onClick={handleToggleFavorite}
            aria-pressed={result.favorite}
          >
            <Star className={cn("size-4", result.favorite && "fill-current")} />
            {result.favorite ? "Favorited" : "Add to favorites"}
          </Button>
        </section>

        <Separator />

        {/* Continue working */}
        <section className="space-y-2">
          <SectionTitle>Continue working</SectionTitle>
          <div className="space-y-2">
            <ContinueAction
              icon={Copy}
              label="Duplicate setup"
              help="Reopen the exact setup without generating."
              onClick={() => goToStudio({}, "Setup copied")}
            />
            <ContinueAction
              icon={RefreshCw}
              label="Regenerate"
              help="Create another result from the same request."
              onClick={() => goToStudio({}, "Re-running this setup")}
            />
            <ContinueAction
              icon={Sparkles}
              label="Create variation"
              help="Reopen the setup for intentional edits before generating (creativity boosted)."
              onClick={() =>
                goToStudio(
                  { creativity: Math.min(100, snapshot.settings.creativity + 20) },
                  "Creating a more experimental variation",
                )
              }
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Duplicate reopens as-is · Regenerate re-runs the same brief · Variation opens for edits.
          </p>
        </section>

        <Separator />

        {/* Context */}
        <section className="space-y-3">
          <SectionTitle>Context</SectionTitle>
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Package2 className="size-3.5" />
              Products
            </span>
            {snapshot.productNames.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {snapshot.productNames.map((name, index) => (
                  <Badge key={`${name}-${index}`} variant="secondary" className="font-normal">
                    {name}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">No products</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <MapPin className="size-3.5" />
              Location
            </span>
            {snapshot.locationName ? (
              <div className="flex items-center gap-2">
                {snapshot.locationImageUrl && (
                  <span className="bg-muted size-9 shrink-0 overflow-hidden rounded-md">
                    <AssetImage src={snapshot.locationImageUrl} alt={snapshot.locationName} className="h-full w-full object-cover" />
                  </span>
                )}
                <span className="text-sm">{snapshot.locationName}</span>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">No location</span>
            )}
          </div>
        </section>

        <Separator />

        {/* Technical details */}
        <section className="space-y-3">
          <SectionTitle>Technical details</SectionTitle>

          <div className="rounded-xl border">
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              aria-expanded={settingsOpen}
              className="flex w-full items-center gap-2 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className="text-sm font-medium">Generation settings</span>
              <span className="text-muted-foreground ml-1 truncate text-xs">
                {CONTROL_LABELS.visualizationType[snapshot.settings.visualizationType]} · {snapshot.settings.aspectRatio} ·{" "}
                {CONTROL_LABELS.visualStyle[snapshot.settings.visualStyle]}
              </span>
              <ChevronDown className={cn("text-muted-foreground ml-auto size-4 transition-transform", settingsOpen && "rotate-180")} />
            </button>
            {settingsOpen && (
              <div className="space-y-3 border-t px-4 py-3">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                  {settingRows.map((row) => (
                    <div key={row.label} className="min-w-0">
                      <dt className="text-muted-foreground text-xs">{row.label}</dt>
                      <dd className="truncate font-medium">{row.value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={snapshot.settings.preserveArchitecture ? "brand" : "muted"} className="font-normal">
                    {snapshot.settings.preserveArchitecture ? "Preserve architecture" : "Free architecture"}
                  </Badge>
                  <Badge variant={snapshot.settings.removeExistingObjects ? "brand" : "muted"} className="font-normal">
                    {snapshot.settings.removeExistingObjects ? "Remove existing objects" : "Keep existing objects"}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {snapshot.notes && (
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs font-medium">Notes</p>
              <p className="text-muted-foreground bg-muted/40 rounded-md p-2 text-sm whitespace-pre-wrap">{snapshot.notes}</p>
            </div>
          )}

        </section>
      </div>

      <ImageLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        images={[{ url: result.image.url, alt: `${snapshot.brandName} mockup` }]}
        index={0}
        onIndexChange={() => {}}
        onDownload={handleDownload}
        downloadBusy={downloading}
      />
    </div>
  );
}
