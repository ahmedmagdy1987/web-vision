"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, MapPin, Package, Plus, RotateCcw, Sparkles, TriangleAlert, UploadCloud, X } from "lucide-react";
import type { AspectRatio, ControlOption, GenerationJob, Placement, ResultSnapshot } from "@/lib/domain";
import { VISUAL_STYLE_OPTIONS } from "@/lib/domain";
import { useBrands, useLocations, useProducts } from "@/lib/hooks";
import { buildGenerationRequest, type ComposeInput } from "@/lib/services/instruction-composer";
import { startGeneration } from "@/lib/services/generation-service";
import { requestOpenAIGeneration, GenerationRequestError } from "@/lib/services/generation-client";
import { validateGenerationRequest } from "@/lib/services/validation";
import { useAuth } from "@/lib/auth/auth-context";
import { studioPrefill, type StudioPrefill } from "@/lib/store/studio-draft";
import { AssetImage } from "@/components/common/asset-image";
import { AspectFrame } from "@/components/common/aspect-frame";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { ControlField, SegmentedControl, SettingSelect } from "@/components/studio/control-primitives";
import { GeneratingCanvas } from "@/components/studio/generating-canvas";
import { createInitialState, studioReducer } from "@/components/studio/studio-state";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { LocationFormDialog } from "@/components/locations/location-form-dialog";
import { AssetPickerSheet, type PickerItem } from "./asset-picker-sheet";
import { LogoUploadDialog } from "./logo-upload-dialog";

// Intentionally limited employee-facing controls; the composer expands them.
const POSITION_OPTIONS: ControlOption<Placement>[] = [
  { value: "auto", label: "Auto" },
  { value: "center", label: "Center" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];
const ASPECT_OPTIONS: ControlOption<AspectRatio>[] = [
  { value: "4:5", label: "Portrait · 4:5" },
  { value: "1:1", label: "Square · 1:1" },
  { value: "16:9", label: "Wide · 16:9" },
  { value: "9:16", label: "Story · 9:16" },
];

let prefillConsumed = false;
function takePrefillOnce(): StudioPrefill | null {
  if (prefillConsumed) return null;
  prefillConsumed = true;
  return studioPrefill.consume();
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Label className="text-sm font-semibold">{children}</Label>;
}

export function HomeGenerator() {
  const router = useRouter();
  const { activeOrg } = useAuth();
  const brands = useBrands();
  const products = useProducts();
  const locations = useLocations();

  // Which generation flow to use — server-authoritative (no NEXT_PUBLIC). The
  // client only learns the mode name; the API key never reaches the browser.
  const [providerMode, setProviderMode] = React.useState<"mock" | "openai">("mock");
  React.useEffect(() => {
    let active = true;
    fetch("/api/generation-mode")
      .then((r) => r.json())
      .then((d: { provider?: string }) => {
        if (active && (d.provider === "openai" || d.provider === "mock")) setProviderMode(d.provider);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const [prefill] = React.useState(takePrefillOnce);
  const [state, dispatch] = React.useReducer(studioReducer, prefill, (p) => {
    const s = createInitialState(p);
    return { ...s, locationMode: "existing" as const, settings: { ...s.settings, outputCount: p?.settings?.outputCount ?? 1 } };
  });
  const [job, setJob] = React.useState<GenerationJob | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [genError, setGenError] = React.useState<{ message: string; retryable: boolean } | null>(null);

  const [logoPicker, setLogoPicker] = React.useState(false);
  const [productPicker, setProductPicker] = React.useState(false);
  const [locationPicker, setLocationPicker] = React.useState(false);
  const [logoUpload, setLogoUpload] = React.useState(false);
  const [productUpload, setProductUpload] = React.useState(false);
  const [locationUpload, setLocationUpload] = React.useState(false);

  React.useEffect(() => {
    prefillConsumed = false;
  }, [prefill]);

  // Flat logo library across all active brands (no project gating).
  const logoOptions = React.useMemo(
    () =>
      brands
        .filter((b) => b.status === "active")
        .flatMap((b) => b.logos.filter((l) => l.status === "active").map((logo) => ({ brand: b, logo }))),
    [brands],
  );

  const brand = brands.find((b) => b.id === state.brandId) ?? null;
  const logo = brand?.logos.find((l) => l.id === state.logoId && l.status === "active") ?? null;
  // Any active product can be placed — product selection is independent of the
  // chosen logo (the logo's brand is resolved internally at generation time).
  const selectableProducts = products.filter((p) => p.status === "active");
  const selectedProducts = selectableProducts.filter((p) => state.productIds.includes(p.id));
  const firstActiveBrand = brands.find((b) => b.status === "active") ?? null;
  const selectedProductIds = selectedProducts.map((p) => p.id);

  const selectedLocation = locations.find((l) => l.id === state.locationId) ?? null;
  const mainLocationImage = selectedLocation
    ? selectedLocation.images.find((i) => i.id === (state.mainLocationImageId ?? selectedLocation.mainImageId)) ??
      selectedLocation.images[0]
    : undefined;
  const mainLocationImageUrl = mainLocationImage?.url ?? null;

  const composeInput: ComposeInput | null = brand
    ? {
        brand,
        logo: logo ?? undefined,
        products: selectedProducts,
        location: selectedLocation ?? undefined,
        mainLocationImage,
        settings: state.settings,
        notes: state.notes,
      }
    : null;

  const issues: string[] = [];
  if (!logo) issues.push("Choose a logo.");
  if (selectedProducts.length === 0) issues.push("Add at least one product.");
  if (!selectedLocation) issues.push("Choose a location.");
  const canGenerate = issues.length === 0 && !generating && !!brand && !!logo && !!selectedLocation;

  const onPickLogo = (brandId: string, logoId: string) => {
    // Pick a logo without clearing products/location (any-order selection).
    dispatch({ type: "select-logo", brandId, logoId });
  };
  const onSettings = (patch: Partial<typeof state.settings>) => dispatch({ type: "set-settings", patch });

  const handleGenerate = async () => {
    if (!brand || !logo || !selectedLocation || !canGenerate || !composeInput) return;
    const request = buildGenerationRequest({ ...composeInput, location: selectedLocation, mainLocationImage });
    const finalRequest = { ...request, locationId: selectedLocation.id };

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
      locationId: selectedLocation.id,
      locationName: selectedLocation.name,
      locationImageUrl: mainLocationImageUrl ?? undefined,
      settings: finalRequest.settings,
      instructions: finalRequest.instructions,
      notes: finalRequest.notes,
    };

    setGenerating(true);
    setJob(null);
    setGenError(null);
    try {
      if (providerMode === "openai") {
        // Server-side OpenAI generation: submit ONLY trusted IDs + settings. The
        // server resolves assets, calls OpenAI and persists the Gallery result.
        if (!activeOrg) {
          toast.error("No active organization.");
          return;
        }
        const outcome = await requestOpenAIGeneration({
          organizationId: activeOrg.id,
          brandId: brand.id,
          logoId: logo.id,
          productIds: selectedProductIds,
          locationId: selectedLocation.id,
          settings: { ...finalRequest.settings, outputCount: 1 },
          notes: state.notes.trim() || undefined,
          idempotencyKey: crypto.randomUUID(),
        });
        toast.success("Mockup ready");
        router.push(`/gallery/${outcome.resultId}`);
        return;
      }

      const finished = await startGeneration({ request: finalRequest, snapshot, onUpdate: setJob });
      if (finished.status === "completed" && finished.resultIds[0]) {
        toast.success("Mockup ready");
        router.push(`/gallery/${finished.resultIds[0]}`);
      } else if (finished.status === "failed") {
        toast.error(finished.error ?? "Generation failed");
      }
    } catch (e) {
      if (e instanceof GenerationRequestError) {
        setGenError({ message: e.message, retryable: e.retryable });
      } else {
        setGenError({ message: e instanceof Error ? e.message : "Generation failed.", retryable: true });
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
        <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
          {/* The large area shows the generation animation — not the source location. */}
          <AspectFrame ratio={state.settings.aspectRatio} className="bg-muted">
            <GeneratingCanvas job={job} />
          </AspectFrame>
        </div>
      </div>
    );
  }

  const logoItems: PickerItem[] = logoOptions.map(({ brand: b, logo: l }) => ({
    id: l.id,
    name: b.name,
    thumbnailUrl: l.asset.url,
  }));
  const productItems: PickerItem[] = selectableProducts.map((p) => ({
    id: p.id,
    name: p.name,
    thumbnailUrl: p.mainImage?.url,
    subtitle: p.category,
  }));
  const locationItems: PickerItem[] = locations.map((l) => ({
    id: l.id,
    name: l.name,
    thumbnailUrl: (l.images.find((i) => i.id === l.mainImageId) ?? l.images[0])?.url,
  }));

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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <Card className="lg:order-1">
        <CardContent className="space-y-6 pt-6">
          {/* LOGO */}
          <div className="space-y-2" data-testid="picker-logo">
            <SectionLabel>Logo</SectionLabel>
            {logo ? (
              <div className="flex items-center gap-3">
                <span className="bg-card flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
                  <AssetImage src={logo.asset.url} alt="" className="size-full object-contain p-2" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{brand?.name}</p>
                  <div className="mt-1.5 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setLogoPicker(true)}>
                      Change
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "set-logo", logoId: null })}>
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setLogoPicker(true)}>
                  <ImageIcon className="size-4" />
                  Choose logo
                </Button>
                <Button variant="outline" size="sm" onClick={() => setLogoUpload(true)}>
                  <UploadCloud className="size-4" />
                  Upload logo
                </Button>
              </div>
            )}
          </div>

          {/* PRODUCTS */}
          <div className="space-y-2" data-testid="picker-products">
            <div className="flex items-center justify-between">
              <SectionLabel>Products</SectionLabel>
              {selectedProducts.length > 0 && (
                <span className="text-muted-foreground text-xs">{selectedProducts.length} selected</span>
              )}
            </div>
            {selectedProducts.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {selectedProducts.map((p) => (
                  <div key={p.id} className="w-20">
                    <div className="relative">
                      <span className="bg-card block size-20 overflow-hidden rounded-md border">
                        <AssetImage src={p.mainImage?.url} alt="" fallbackIcon={Package} fallbackLabel="No image" className="size-full object-cover" />
                      </span>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "toggle-product", productId: p.id })}
                        aria-label={`Remove ${p.name}`}
                        className="bg-background absolute -right-1.5 -top-1.5 rounded-full border p-0.5 shadow-sm transition-colors hover:bg-destructive hover:text-white"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                    <span className="mt-1 block truncate text-center text-[10px]">{p.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No products selected yet.</p>
            )}
            <Button variant="outline" size="sm" onClick={() => setProductPicker(true)}>
              <Plus className="size-4" />
              {selectedProducts.length > 0 ? "Add more products" : "Add products"}
            </Button>
          </div>

          {/* LOCATION */}
          <div className="space-y-2" data-testid="picker-location">
            <SectionLabel>Location</SectionLabel>
            {selectedLocation ? (
              <div className="flex items-center gap-3">
                <span className="bg-card flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
                  <AssetImage
                    src={mainLocationImageUrl ?? undefined}
                    alt=""
                    fallbackIcon={MapPin}
                    fallbackLabel="No image"
                    className="size-full object-cover"
                  />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selectedLocation.name}</p>
                  <div className="mt-1.5 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setLocationPicker(true)}>
                      Change
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "set-location", locationId: null })}>
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setLocationPicker(true)}>
                  <MapPin className="size-4" />
                  Choose location
                </Button>
                <Button variant="outline" size="sm" onClick={() => setLocationUpload(true)}>
                  <UploadCloud className="size-4" />
                  Upload location
                </Button>
              </div>
            )}
          </div>

          {/* CONTROLS */}
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

          {issues.length > 0 && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <TriangleAlert className="text-warning size-4 shrink-0" />
              <span className="truncate">{issues[0]}</span>
            </p>
          )}
          {generateButton}
          {genError && (
            <div className="border-destructive/30 bg-destructive/5 space-y-2 rounded-lg border p-3" role="alert">
              <p className="text-destructive flex items-start gap-1.5 text-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{genError.message}</span>
              </p>
              {genError.retryable && (
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={!canGenerate}>
                  Try again
                </Button>
              )}
            </div>
          )}
        </CardContent>
        </Card>

        {/* Result area (desktop) — reserved for the GENERATED mockup, never the
            source location. Before generation: an empty canvas + a compact
            summary of the selected assets. */}
        <aside className="top-20 hidden space-y-3 lg:sticky lg:order-2 lg:block">
          <p className="text-muted-foreground text-sm font-medium">Result</p>
          <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
            <AspectFrame ratio={state.settings.aspectRatio} className="bg-grid bg-muted">
              <div className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                <ImageIcon className="size-7 opacity-50" />
                <p className="text-xs">Your generated mockup will appear here.</p>
              </div>
            </AspectFrame>
          </div>
          {(logo || selectedProducts.length > 0 || selectedLocation) && (
            <div className="space-y-2 rounded-xl border p-3">
              <p className="text-muted-foreground text-xs font-medium">Selected for this mockup</p>
              <div className="flex flex-wrap gap-2">
                {logo && (
                  <span className="bg-card flex size-12 items-center justify-center overflow-hidden rounded-md border" title={brand?.name}>
                    <AssetImage src={logo.asset.url} alt="" className="size-full object-contain p-1" />
                  </span>
                )}
                {selectedProducts.slice(0, 5).map((p) => (
                  <span key={p.id} className="bg-card size-12 overflow-hidden rounded-md border" title={p.name}>
                    <AssetImage src={p.mainImage?.url} alt="" fallbackIcon={Package} className="size-full object-cover" />
                  </span>
                ))}
                {selectedLocation && (
                  <span className="bg-card size-12 overflow-hidden rounded-md border" title={selectedLocation.name}>
                    <AssetImage src={mainLocationImageUrl ?? undefined} alt="" fallbackIcon={MapPin} className="size-full object-cover" />
                  </span>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Visual pickers + direct upload */}
      <AssetPickerSheet
        open={logoPicker}
        onOpenChange={setLogoPicker}
        title="Choose a logo"
        items={logoItems}
        selectedIds={logo ? [logo.id] : []}
        onPick={(id) => {
          const o = logoOptions.find((x) => x.logo.id === id);
          if (o) onPickLogo(o.brand.id, o.logo.id);
        }}
        onUpload={() => {
          // Close the picker sheet before opening the upload dialog so only one
          // modal layer is mounted (avoids the aria-hidden focus warning).
          setLogoPicker(false);
          setLogoUpload(true);
        }}
        uploadLabel="Upload logo"
        searchPlaceholder="Search logos…"
        emptyIcon={ImageIcon}
        emptyTitle="No logos yet"
        emptyHint="Upload a logo to get started."
        fit="contain"
      />
      <AssetPickerSheet
        open={productPicker}
        onOpenChange={setProductPicker}
        title="Add products"
        items={productItems}
        selectedIds={selectedProductIds}
        multi
        onPick={(id) => dispatch({ type: "toggle-product", productId: id })}
        onUpload={() => {
          setProductPicker(false);
          setProductUpload(true);
        }}
        uploadLabel="Upload product"
        searchPlaceholder="Search products…"
        emptyIcon={Package}
        emptyTitle="No products yet"
        emptyHint="Upload a product to place in mockups."
      />
      <AssetPickerSheet
        open={locationPicker}
        onOpenChange={setLocationPicker}
        title="Choose a location"
        items={locationItems}
        selectedIds={selectedLocation ? [selectedLocation.id] : []}
        onPick={(id) => dispatch({ type: "set-location", locationId: id })}
        onUpload={() => {
          setLocationPicker(false);
          setLocationUpload(true);
        }}
        uploadLabel="Upload location"
        searchPlaceholder="Search locations…"
        emptyIcon={MapPin}
        emptyTitle="No locations yet"
        emptyHint="Upload a client site to visualize against."
      />

      <LogoUploadDialog
        open={logoUpload}
        onOpenChange={setLogoUpload}
        onCreated={(brandId, logoId) => {
          onPickLogo(brandId, logoId);
          setLogoPicker(false);
        }}
      />
      <ProductFormDialog open={productUpload} onOpenChange={setProductUpload} brands={brands} defaultBrandId={brand?.id ?? firstActiveBrand?.id} />
      <LocationFormDialog open={locationUpload} onOpenChange={setLocationUpload} />
    </div>
  );
}
