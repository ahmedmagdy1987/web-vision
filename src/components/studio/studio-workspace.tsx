"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import type { ComposeInput } from "@/lib/services/instruction-composer";
import type { Location, ResultSnapshot, UploadedAssetRef } from "@/lib/domain";
import { appStore, useActiveProject, useBrands, useIsMobile, useLocations, useProducts } from "@/lib/hooks";
import { useActiveBrand } from "@/lib/hooks";
import { locationRepository } from "@/lib/repositories";
import { buildGenerationRequest, composeInstructions } from "@/lib/services/instruction-composer";
import { startGeneration } from "@/lib/services/generation-service";
import { validateGenerationRequest } from "@/lib/services/validation";
import { studioPrefill, type StudioPrefill } from "@/lib/store/studio-draft";
import { nowIso } from "@/lib/ids";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { toast } from "@/components/ui/sonner";
import type { GenerationJob } from "@/lib/domain";
import { AssetsPanel } from "./assets-panel";
import { CanvasPreview } from "./canvas-preview";
import { ControlsPanel } from "./controls-panel";
import { InstructionsPreview } from "./instructions-preview";
import { ReadinessSummary, type ReadinessItem } from "./readiness-summary";
import { StudioMobile } from "./studio-mobile";
import { StudioReadiness, type StudioReadinessRow } from "./studio-readiness";
import { createInitialState, studioReducer } from "./studio-state";

// Module-scoped one-shot guard so the prefill handoff is consumed exactly once
// per navigation (robust against React StrictMode double-invocation).
let prefillConsumed = false;
function takePrefillOnce(): StudioPrefill | null {
  if (prefillConsumed) return null;
  prefillConsumed = true;
  return studioPrefill.consume();
}

export function StudioWorkspace() {
  const router = useRouter();
  const brands = useBrands();
  const products = useProducts();
  const locations = useLocations();
  const isMobile = useIsMobile();
  const { brand: fallbackBrand } = useActiveBrand();
  const { project: activeProject } = useActiveProject();

  const [prefill] = React.useState(takePrefillOnce);
  const [state, dispatch] = React.useReducer(studioReducer, prefill, createInitialState);
  const [job, setJob] = React.useState<GenerationJob | null>(null);
  const [generating, setGenerating] = React.useState(false);

  React.useEffect(() => {
    if (prefill?.brandId) appStore.setSelectedBrand(prefill.brandId);
    // Allow a future navigation into Studio to consume a fresh prefill.
    prefillConsumed = false;
  }, [prefill]);

  // ---- Derive effective selections -------------------------------------
  // Scope selectable assets to the active project (demo-safe: fall back to all
  // when there is no active project).
  const projectBrands = activeProject ? brands.filter((b) => activeProject.brandIds.includes(b.id)) : brands;
  const brand = brands.find((b) => b.id === state.brandId) ?? fallbackBrand;
  const brandLogos = brand ? brand.logos.filter((l) => l.status === "active") : [];
  const logo =
    brandLogos.find((l) => l.id === state.logoId) ??
    brandLogos.find((l) => l.id === brand?.defaultLogoId) ??
    brandLogos[0] ??
    null;
  const brandProducts = brand
    ? products.filter(
        (p) =>
          p.brandId === brand.id &&
          p.status === "active" &&
          (!activeProject || activeProject.productIds.includes(p.id)),
      )
    : [];
  const selectedProducts = brandProducts.filter((p) => state.productIds.includes(p.id));
  const selectedProductIds = selectedProducts.map((p) => p.id);

  const savedLocations = activeProject ? locations.filter((l) => activeProject.locationIds.includes(l.id)) : locations;
  const selectedLocation = savedLocations.find((l) => l.id === state.locationId) ?? null;

  // Resolve the location + main image used for preview/compose.
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

  // ---- Composed instructions (live preview) ----------------------------
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

  // composeInstructions is a cheap pure transform; recompute per render.
  const instructions = composeInput ? composeInstructions(composeInput) : null;

  // ---- Validation ------------------------------------------------------
  const issues: string[] = [];
  if (!brand) issues.push("Select a brand.");
  if (selectedProducts.length === 0) issues.push("Select at least one product.");
  if (state.locationMode === "existing" && !selectedLocation) issues.push("Select a location.");
  if (state.locationMode === "new") {
    if (state.newLocation.images.length === 0) issues.push("Upload at least one location image.");
    if (!state.newLocation.name.trim()) issues.push("Name the new location.");
  }
  const canGenerate = issues.length === 0 && !generating && !!brand;

  const locationReady =
    state.locationMode === "existing"
      ? !!selectedLocation
      : state.newLocation.images.length > 0 && !!state.newLocation.name.trim();
  const readinessItems: ReadinessItem[] = [
    { label: "Project", done: !!activeProject },
    { label: "Brand", done: !!brand },
    { label: "Logo", done: !!logo },
    {
      label: selectedProducts.length > 0 ? `${selectedProducts.length} product${selectedProducts.length === 1 ? "" : "s"}` : "Products",
      done: selectedProducts.length > 0,
    },
    { label: "Location", done: locationReady },
    {
      label: `${state.settings.outputCount} output${state.settings.outputCount === 1 ? "" : "s"}`,
      done: state.settings.outputCount >= 1,
    },
  ];

  // ---- Generate --------------------------------------------------------
  const handleGenerate = async () => {
    if (!brand || !canGenerate || !composeInput) return;

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
    // For an unsaved new location there is no persisted id to reference.
    const finalRequest = {
      ...request,
      projectId: activeProject?.id,
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
      logoId: logo?.id,
      logoUrl: logo?.asset.url,
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
        toast.success("Generation complete");
        router.push(`/gallery/${finished.resultIds[0]}`);
      } else if (finished.status === "failed") {
        toast.error(finished.error ?? "Generation failed");
      }
    } finally {
      setGenerating(false);
    }
  };

  // Shared selection handlers (used by both desktop and mobile layouts).
  const onBrandChange = (id: string) => {
    dispatch({ type: "set-brand", brandId: id });
    appStore.setSelectedBrand(id);
  };
  const onLogoChange = (id: string) => dispatch({ type: "set-logo", logoId: id });
  const onToggleProduct = (id: string) => dispatch({ type: "toggle-product", productId: id });
  const onSetLocationMode = (mode: "existing" | "new") => dispatch({ type: "set-location-mode", mode });
  const onSelectLocation = (id: string) => dispatch({ type: "set-location", locationId: id });
  const onSetMainImage = (id: string) => dispatch({ type: "set-main-location-image", imageId: id });
  const onUpdateNewLocation = (patch: Partial<typeof state.newLocation>) =>
    dispatch({ type: "update-new-location", patch });
  const onSettingsChange = (patch: Partial<typeof state.settings>) => dispatch({ type: "set-settings", patch });
  const onNotesChange = (notes: string) => dispatch({ type: "set-notes", notes });

  if (!brand) {
    const rows: StudioReadinessRow[] = [
      {
        label: "Project",
        done: !!activeProject,
        why: "Pick a project from the header to organize this work.",
        actionHref: "/projects",
        actionLabel: "Projects",
      },
      {
        label: "Brand & logo",
        done: false,
        why: activeProject
          ? "No brands available for this project. Add a brand in Identity to continue."
          : "Add a brand and logos in Identity.",
        actionHref: "/identity?new=1",
        actionLabel: "Add brand",
      },
      {
        label: "Products",
        done: false,
        why: "Add the games or products to place in the scene.",
        actionHref: "/products",
        actionLabel: "Products",
      },
      {
        label: "Location",
        done: false,
        why: "Upload a client site in Locations to visualize against.",
        actionHref: "/locations",
        actionLabel: "Locations",
      },
    ];
    return (
      <div className="space-y-6">
        <PageHeader title="Studio" description="Compose a brief and generate realistic client mockups." />
        <StudioReadiness rows={rows} />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Studio"
          description="Compose a brief and generate realistic client mockups."
          actions={
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "reset" })} disabled={generating}>
              <RotateCcw />
              Reset
            </Button>
          }
        />
        <StudioMobile
          brands={projectBrands}
          brandLogos={brandLogos}
          brandProducts={brandProducts}
          locations={savedLocations}
          brand={brand}
          logo={logo}
          selectedProducts={selectedProducts}
          selectedProductIds={selectedProductIds}
          state={state}
          mainLocationImageUrl={mainLocationImageUrl}
          composeLocationName={composeLocation?.name ?? null}
          instructions={instructions}
          readinessItems={readinessItems}
          issues={issues}
          locationReady={locationReady}
          canGenerate={canGenerate}
          generating={generating}
          job={job}
          onBrandChange={onBrandChange}
          onLogoChange={onLogoChange}
          onToggleProduct={onToggleProduct}
          onSetLocationMode={onSetLocationMode}
          onSelectLocation={onSelectLocation}
          onSetMainImage={onSetMainImage}
          onUpdateNewLocation={onUpdateNewLocation}
          onSettingsChange={onSettingsChange}
          onNotesChange={onNotesChange}
          onGenerate={handleGenerate}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title="Studio"
        description="Compose a brief and generate realistic client mockups."
        actions={
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "reset" })} disabled={generating}>
            <RotateCcw />
            Reset
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)_21rem]">
        <Card className="h-fit xl:order-1">
          <CardContent className="pt-6">
            <AssetsPanel
              brands={projectBrands}
              brandLogos={brandLogos}
              brandProducts={brandProducts}
              locations={savedLocations}
              brandId={brand.id}
              logoId={logo?.id ?? null}
              productIds={selectedProductIds}
              locationMode={state.locationMode}
              locationId={state.locationId}
              mainLocationImageId={state.mainLocationImageId}
              newLocation={state.newLocation}
              onBrandChange={onBrandChange}
              onLogoChange={onLogoChange}
              onToggleProduct={onToggleProduct}
              onSetLocationMode={onSetLocationMode}
              onSelectLocation={onSelectLocation}
              onSetMainImage={onSetMainImage}
              onUpdateNewLocation={onUpdateNewLocation}
            />
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-6 xl:order-2">
          <ReadinessSummary items={readinessItems} />
          <CanvasPreview
            settings={state.settings}
            brand={brand}
            logo={logo}
            products={selectedProducts}
            locationImageUrl={mainLocationImageUrl}
            locationName={composeLocation?.name ?? null}
            job={job}
          />
          {instructions && <InstructionsPreview instructions={instructions} />}
        </div>

        <Card className="h-fit xl:order-3">
          <CardContent className="pt-6">
            <ControlsPanel
              settings={state.settings}
              onChange={onSettingsChange}
              notes={state.notes}
              onNotesChange={onNotesChange}
            />
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-4 z-20">
        <div className="bg-background/95 flex flex-col gap-3 rounded-xl border p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm">
            {issues.length === 0 ? (
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="text-brand size-4" />
                Ready · {selectedProducts.length} product{selectedProducts.length === 1 ? "" : "s"} ·{" "}
                {state.settings.outputCount} output{state.settings.outputCount === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="text-muted-foreground flex items-center gap-1.5">
                <TriangleAlert className="text-warning size-4 shrink-0" />
                <span className="truncate">{issues[0]}</span>
              </span>
            )}
          </div>
          <Button size="lg" onClick={handleGenerate} disabled={!canGenerate} className="shrink-0">
            {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {generating ? "Generating…" : "Generate"}
          </Button>
        </div>
      </div>
    </div>
  );
}
