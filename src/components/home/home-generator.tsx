"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, MapPin, Package, Plus, RotateCcw, Sparkles, TriangleAlert, UploadCloud, X } from "lucide-react";
import type { AspectRatio, ControlOption, GenerationJob, Placement, ResultSnapshot } from "@/lib/domain";
import { VISUAL_STYLE_OPTIONS } from "@/lib/domain";
import { useBrands, useLocations, useProducts } from "@/lib/hooks";
import { buildGenerationRequest, type ComposeInput } from "@/lib/services/instruction-composer";
import { startGeneration } from "@/lib/services/generation-service";
import { validateGenerationRequest } from "@/lib/services/validation";
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
  { value: "4:5", label: "Portrait" },
  { value: "1:1", label: "Square" },
  { value: "16:9", label: "Wide" },
  { value: "9:16", label: "Story" },
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
  const brands = useBrands();
  const products = useProducts();
  const locations = useLocations();

  const [prefill] = React.useState(takePrefillOnce);
  const [state, dispatch] = React.useReducer(studioReducer, prefill, (p) => {
    const s = createInitialState(p);
    return { ...s, locationMode: "existing" as const, settings: { ...s.settings, outputCount: p?.settings?.outputCount ?? 1 } };
  });
  const [job, setJob] = React.useState<GenerationJob | null>(null);
  const [generating, setGenerating] = React.useState(false);

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
  const brandProducts = brand ? products.filter((p) => p.brandId === brand.id && p.status === "active") : [];
  const selectedProducts = brandProducts.filter((p) => state.productIds.includes(p.id));
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
    if (brandId !== state.brandId) dispatch({ type: "set-brand", brandId });
    dispatch({ type: "set-logo", logoId });
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
        <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
          <AspectFrame ratio={state.settings.aspectRatio} className="bg-muted">
            {mainLocationImageUrl && (
              <AssetImage src={mainLocationImageUrl} alt="" className="absolute inset-0 size-full object-cover" />
            )}
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
  const productItems: PickerItem[] = brandProducts.map((p) => ({
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

      <Card>
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
            <SectionLabel>Products</SectionLabel>
            {selectedProducts.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {selectedProducts.map((p) => (
                  <div key={p.id} className="w-20">
                    <div className="relative">
                      <span className="bg-card block size-20 overflow-hidden rounded-md border">
                        <AssetImage src={p.mainImage?.url} alt="" className="size-full object-cover" />
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
              <p className="text-muted-foreground text-sm">{brand ? "No products selected yet." : "Choose a logo first."}</p>
            )}
            <Button variant="outline" size="sm" onClick={() => setProductPicker(true)} disabled={!brand}>
              <Plus className="size-4" />
              Add products
            </Button>
          </div>

          {/* LOCATION */}
          <div className="space-y-2" data-testid="picker-location">
            <SectionLabel>Location</SectionLabel>
            {selectedLocation ? (
              <div className="space-y-2">
                <div className="overflow-hidden rounded-lg border">
                  <AspectFrame ratio="16:9" className="bg-muted">
                    <AssetImage
                      src={mainLocationImageUrl ?? undefined}
                      alt={selectedLocation.name}
                      className="absolute inset-0 size-full object-cover"
                    />
                  </AspectFrame>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{selectedLocation.name}</p>
                  <div className="flex shrink-0 gap-2">
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
        </CardContent>
      </Card>

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
        onUpload={() => setLogoUpload(true)}
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
        onUpload={() => setProductUpload(true)}
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
        onUpload={() => setLocationUpload(true)}
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
      <ProductFormDialog open={productUpload} onOpenChange={setProductUpload} brands={brands} defaultBrandId={brand?.id} />
      <LocationFormDialog open={locationUpload} onOpenChange={setLocationUpload} />
    </div>
  );
}
