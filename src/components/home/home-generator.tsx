"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ImageOff, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import type {
  AspectRatio,
  Brand,
  ControlOption,
  GenerationJob,
  Location,
  LogoAsset,
  Placement,
  ResultSnapshot,
  UploadedAssetRef,
} from "@/lib/domain";
import { VISUAL_STYLE_OPTIONS } from "@/lib/domain";
import { useBrands, useLocations, useProducts } from "@/lib/hooks";
import { locationRepository } from "@/lib/repositories";
import { buildGenerationRequest, type ComposeInput } from "@/lib/services/instruction-composer";
import { startGeneration } from "@/lib/services/generation-service";
import { validateGenerationRequest } from "@/lib/services/validation";
import { studioPrefill, type StudioPrefill } from "@/lib/store/studio-draft";
import { nowIso } from "@/lib/ids";
import { AssetImage } from "@/components/common/asset-image";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { CanvasPreview } from "@/components/studio/canvas-preview";
import { ProductPicker } from "@/components/studio/product-picker";
import { LocationPicker } from "@/components/studio/location-picker";
import { ControlField, SegmentedControl, SettingSelect } from "@/components/studio/control-primitives";
import { createInitialState, studioReducer } from "@/components/studio/studio-state";

// Intentionally limited employee-facing controls. The composer expands each of
// these into sophisticated, provider-ready instructions behind the scenes.
const POSITION_OPTIONS: ControlOption<Placement>[] = [
  { value: "auto", label: "Auto" },
  { value: "center", label: "Center" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

const ASPECT_OPTIONS: ControlOption<AspectRatio>[] = [
  { value: "4:5", label: "Portrait" },
  { value: "1:1", label: "Square" },
  { value: "16:9", label: "Wide" },
  { value: "9:16", label: "Story" },
];

// One-shot prefill handoff (from Gallery "regenerate", Products/Locations "use").
let prefillConsumed = false;
function takePrefillOnce(): StudioPrefill | null {
  if (prefillConsumed) return null;
  prefillConsumed = true;
  return studioPrefill.consume();
}

interface LogoOption {
  brand: Brand;
  logo: LogoAsset;
}

/** Flat logo library across all active brands — employee picks a logo directly. */
function LogoChoice({
  logos,
  value,
  onPick,
}: {
  logos: LogoOption[];
  value: string | null;
  onPick: (brandId: string, logoId: string) => void;
}) {
  if (logos.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed px-3 py-6 text-center text-sm">
        <ImageOff className="size-5" />
        <span>
          No logos yet.{" "}
          <Link href="/identity" className="text-brand underline-offset-2 hover:underline">
            Add a logo
          </Link>
          .
        </span>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {logos.map(({ brand, logo }) => {
        const selected = logo.id === value;
        return (
          <button
            key={logo.id}
            type="button"
            onClick={() => onPick(brand.id, logo.id)}
            aria-pressed={selected}
            aria-label={`${brand.name} logo`}
            className={cn(
              "relative flex flex-col items-center gap-1 rounded-lg border p-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
              selected ? "border-brand bg-brand-subtle" : "border-border hover:border-brand-border",
            )}
          >
            <span className="bg-card flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border">
              <AssetImage src={logo.asset.url} alt="" className="size-full object-contain p-1.5" />
            </span>
            <span className="w-full truncate text-center text-[10px] font-medium">{brand.name}</span>
            {selected && (
              <span className="bg-brand text-brand-foreground absolute -right-1.5 -top-1.5 rounded-full p-0.5">
                <Check className="size-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function HomeGenerator() {
  const router = useRouter();
  const brands = useBrands();
  const products = useProducts();
  const locations = useLocations();

  const [prefill] = React.useState(takePrefillOnce);
  const [state, dispatch] = React.useReducer(studioReducer, prefill, (p) => {
    const s = createInitialState(p);
    // One mockup per click by default (hidden control).
    return { ...s, settings: { ...s.settings, outputCount: p?.settings?.outputCount ?? 1 } };
  });
  const [job, setJob] = React.useState<GenerationJob | null>(null);
  const [generating, setGenerating] = React.useState(false);

  React.useEffect(() => {
    prefillConsumed = false;
  }, [prefill]);

  // Flat logo library across all active Malahi brands (no project gating).
  const logoOptions = React.useMemo<LogoOption[]>(
    () =>
      brands
        .filter((b) => b.status === "active")
        .flatMap((b) => b.logos.filter((l) => l.status === "active").map((logo) => ({ brand: b, logo }))),
    [brands],
  );

  const brand = brands.find((b) => b.id === state.brandId) ?? null;
  const logo = brand?.logos.find((l) => l.id === state.logoId && l.status === "active") ?? null;
  // All active products of the chosen logo's brand — relations preserved, project gating removed.
  const brandProducts = brand ? products.filter((p) => p.brandId === brand.id && p.status === "active") : [];
  const selectedProducts = brandProducts.filter((p) => state.productIds.includes(p.id));
  const selectedProductIds = selectedProducts.map((p) => p.id);

  const selectedLocation = locations.find((l) => l.id === state.locationId) ?? null;

  // Resolve the location + main image used for preview/compose (existing or uploaded).
  let composeLocation: Location | undefined;
  let mainLocationImageUrl: string | null = null;
  let mainLocationImageId: string | undefined;
  if (state.locationMode === "existing" && selectedLocation) {
    const main =
      selectedLocation.images.find((i) => i.id === (state.mainLocationImageId ?? selectedLocation.mainImageId)) ??
      selectedLocation.images[0];
    composeLocation = selectedLocation;
    mainLocationImageUrl = main?.url ?? null;
    mainLocationImageId = main?.id;
  } else if (state.locationMode === "new" && state.newLocation.images.length > 0) {
    const nl = state.newLocation;
    const main = nl.images.find((i) => i.id === nl.mainImageId) ?? nl.images[0];
    composeLocation = {
      id: "",
      name: nl.name || "Untitled location",
      brandId: brand?.id,
      usage: nl.usage,
      images: nl.images,
      mainImageId: main?.id,
      description: nl.description || undefined,
      preservationInstructions: nl.preservationInstructions || undefined,
      saved: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    mainLocationImageUrl = main?.url ?? null;
    mainLocationImageId = main?.id;
  }
  const mainLocationImage = composeLocation?.images.find((i) => i.id === mainLocationImageId);

  const composeInput: ComposeInput | null = brand
    ? {
        brand,
        logo: logo ?? undefined,
        products: selectedProducts,
        location: composeLocation,
        mainLocationImage,
        settings: state.settings,
        notes: state.notes,
      }
    : null;

  // ---- Validation ----
  const issues: string[] = [];
  if (!logo) issues.push("Choose a logo.");
  if (selectedProducts.length === 0) issues.push("Select at least one product.");
  if (state.locationMode === "existing" && !selectedLocation) issues.push("Choose a location.");
  if (state.locationMode === "new") {
    if (state.newLocation.images.length === 0) issues.push("Upload at least one location image.");
    if (!state.newLocation.name.trim()) issues.push("Name the new location.");
  }
  const canGenerate = issues.length === 0 && !generating && !!brand && !!logo;

  // ---- Handlers ----
  const onPickLogo = (brandId: string, logoId: string) => {
    if (brandId !== state.brandId) dispatch({ type: "set-brand", brandId });
    dispatch({ type: "set-logo", logoId });
  };
  const onSettings = (patch: Partial<typeof state.settings>) => dispatch({ type: "set-settings", patch });

  const handleGenerate = async () => {
    if (!brand || !logo || !canGenerate || !composeInput) return;

    let location = composeLocation;
    const uploadedAssets: UploadedAssetRef[] = [];
    if (state.locationMode === "new") {
      state.newLocation.images.forEach((img) =>
        uploadedAssets.push({ id: img.id, name: img.name, url: img.url, mimeType: img.mimeType, size: img.size, role: "location" }),
      );
      if (state.newLocation.save) {
        const saved = locationRepository.addLocation({
          name: state.newLocation.name,
          brandId: brand.id,
          usage: state.newLocation.usage,
          images: state.newLocation.images,
          mainImageId: mainLocationImageId,
          description: state.newLocation.description || undefined,
          preservationInstructions: state.newLocation.preservationInstructions || undefined,
          saved: true,
        });
        location = saved;
        toast.success(`Saved location "${saved.name}"`);
      }
    }

    const request = buildGenerationRequest({ ...composeInput, location, mainLocationImage, uploadedAssets });
    const isUnsavedLocation = state.locationMode === "new" && !state.newLocation.save;
    const finalRequest = {
      ...request,
      locationId: isUnsavedLocation ? undefined : location?.id || undefined,
    };

    const validation = validateGenerationRequest(finalRequest);
    if (validation.length > 0) {
      validation.forEach((v) => toast.error(v.message));
      return;
    }

    const snapshot: ResultSnapshot = {
      brandId: brand.id,
      brandName: brand.name,
      brandAccent: brand.accentColor,
      logoId: logo.id,
      logoUrl: logo.asset.url,
      productIds: selectedProductIds,
      productNames: selectedProducts.map((p) => p.name),
      locationId: finalRequest.locationId,
      locationName: location?.name,
      locationImageUrl: mainLocationImageUrl ?? undefined,
      locationDraft: isUnsavedLocation
        ? {
            name: state.newLocation.name,
            usage: state.newLocation.usage,
            images: state.newLocation.images,
            mainImageId: mainLocationImageId,
            description: state.newLocation.description || undefined,
            preservationInstructions: state.newLocation.preservationInstructions || undefined,
          }
        : undefined,
      settings: finalRequest.settings,
      instructions: finalRequest.instructions,
      notes: finalRequest.notes,
    };

    setGenerating(true);
    setJob(null);
    try {
      const finished = await startGeneration({ request: finalRequest, snapshot, onUpdate: setJob });
      if (finished.status === "completed" && finished.resultIds[0]) {
        toast.success("Mockup ready");
        router.push(`/gallery/${finished.resultIds[0]}`);
      } else if (finished.status === "failed") {
        toast.error(finished.error ?? "Generation failed");
      }
    } finally {
      setGenerating(false);
    }
  };

  // ---- Generation progress view (reuses the cooking animation) ----
  if (generating) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <PageHeader title="Generating your mockup" description="Hang tight — building a realistic placement." />
        <CanvasPreview
          settings={state.settings}
          brand={brand}
          logo={logo}
          products={selectedProducts}
          locationImageUrl={mainLocationImageUrl}
          locationName={composeLocation?.name ?? null}
          job={job}
        />
      </div>
    );
  }

  const generateButton = (
    <Button size="lg" onClick={handleGenerate} disabled={!canGenerate} className="w-full">
      <Sparkles />
      Generate Mockup
    </Button>
  );

  return (
    <div className="space-y-6" data-testid="home-generator">
      <PageHeader
        title="Create a mockup"
        description="Pick a logo, products and a location, then generate a realistic placement."
        actions={
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "reset" })}>
            <RotateCcw />
            Reset
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        {/* Form — mobile order: Logo, Products, Location, Style, Position, Aspect, Notes, Generate. */}
        <Card className="lg:order-1">
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2" data-testid="picker-logo">
              <Label>Logo</Label>
              <LogoChoice logos={logoOptions} value={logo?.id ?? null} onPick={onPickLogo} />
            </div>

            <div data-testid="picker-products">
              <ProductPicker products={brandProducts} selectedIds={selectedProductIds} onToggle={(id) => dispatch({ type: "toggle-product", productId: id })} />
            </div>

            <div data-testid="picker-location">
              <LocationPicker
                locations={locations}
                mode={state.locationMode}
                locationId={state.locationId}
                mainLocationImageId={state.mainLocationImageId}
                newLocation={state.newLocation}
                onSetMode={(mode) => dispatch({ type: "set-location-mode", mode })}
                onSelectLocation={(id) => dispatch({ type: "set-location", locationId: id })}
                onSetMainImage={(id) => dispatch({ type: "set-main-location-image", imageId: id })}
                onUpdateNewLocation={(patch) => dispatch({ type: "update-new-location", patch })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ControlField label="Style">
                <SettingSelect value={state.settings.visualStyle} onChange={(v) => onSettings({ visualStyle: v })} options={VISUAL_STYLE_OPTIONS} />
              </ControlField>
              <ControlField label="Position">
                <SegmentedControl value={state.settings.placement} onChange={(v) => onSettings({ placement: v })} options={POSITION_OPTIONS} />
              </ControlField>
            </div>

            <ControlField label="Aspect ratio">
              <SegmentedControl value={state.settings.aspectRatio} onChange={(v) => onSettings({ aspectRatio: v })} options={ASPECT_OPTIONS} />
            </ControlField>

            <ControlField label="Notes" description="Optional. Added after the permanent preservation rules.">
              <Textarea
                value={state.notes}
                onChange={(e) => dispatch({ type: "set-notes", notes: e.target.value })}
                placeholder="Anything specific to emphasize…"
                className="min-h-20"
              />
            </ControlField>

            {/* Mobile generate button — directly after Notes, no preview in between. */}
            <div className="space-y-2 lg:hidden">
              {issues.length > 0 && (
                <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                  <TriangleAlert className="text-warning size-4 shrink-0" />
                  <span className="truncate">{issues[0]}</span>
                </p>
              )}
              {generateButton}
            </div>
          </CardContent>
        </Card>

        {/* Desktop side: live preview + generate. Hidden on mobile so the generator stays first. */}
        <aside className="top-20 hidden space-y-3 lg:sticky lg:order-2 lg:block">
          <CanvasPreview
            settings={state.settings}
            brand={brand}
            logo={logo}
            products={selectedProducts}
            locationImageUrl={mainLocationImageUrl}
            locationName={composeLocation?.name ?? null}
            job={job}
          />
          {generateButton}
          {issues.length === 0 ? (
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Sparkles className="text-brand size-3.5" />
              Ready · {selectedProducts.length} product{selectedProducts.length === 1 ? "" : "s"}
            </p>
          ) : (
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <TriangleAlert className="text-warning size-3.5 shrink-0" />
              <span className="truncate">{issues[0]}</span>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
