"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin, Package2, Sparkles } from "lucide-react";
import type {
  Brand,
  ComposedInstructions,
  GenerationJob,
  GenerationSettings,
  Location,
  LogoAsset,
  Product,
} from "@/lib/domain";
import { LOGO_KIND_LABELS } from "@/lib/domain";
import { AssetImage } from "@/components/common/asset-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BrandPicker, LogoPicker } from "./brand-logo-picker";
import { CanvasPreview } from "./canvas-preview";
import { ControlsPanel } from "./controls-panel";
import { InstructionsPreview } from "./instructions-preview";
import { LocationPicker } from "./location-picker";
import { ProductPicker } from "./product-picker";
import { ReadinessSummary, type ReadinessItem } from "./readiness-summary";
import type { NewLocationDraft, StudioState } from "./studio-state";

export interface StudioMobileProps {
  brands: Brand[];
  brandLogos: LogoAsset[];
  brandProducts: Product[];
  locations: Location[];
  brand: Brand;
  logo: LogoAsset | null;
  selectedProducts: Product[];
  selectedProductIds: string[];
  state: StudioState;
  mainLocationImageUrl: string | null;
  composeLocationName: string | null;
  instructions: ComposedInstructions | null;
  readinessItems: ReadinessItem[];
  issues: string[];
  locationReady: boolean;
  canGenerate: boolean;
  generating: boolean;
  job: GenerationJob | null;
  onBrandChange: (id: string) => void;
  onLogoChange: (id: string) => void;
  onToggleProduct: (id: string) => void;
  onSetLocationMode: (mode: "existing" | "new") => void;
  onSelectLocation: (id: string) => void;
  onSetMainImage: (id: string) => void;
  onUpdateNewLocation: (patch: Partial<NewLocationDraft>) => void;
  onSettingsChange: (patch: Partial<GenerationSettings>) => void;
  onNotesChange: (notes: string) => void;
  onGenerate: () => void;
}

const STEPS = ["Assets", "Location", "Settings", "Review"] as const;

function StepIndicator({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-1" aria-label="Studio steps">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-1">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                active && "bg-brand text-brand-foreground",
                done && "bg-brand/20 text-brand",
                !active && !done && "bg-muted text-muted-foreground",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cn("truncate text-[11px] font-medium", active ? "text-foreground" : "text-muted-foreground")}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="bg-border h-px flex-1" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function ReviewRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-muted-foreground flex items-center gap-2 text-xs">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="truncate text-right text-sm font-medium">{value}</span>
    </div>
  );
}

export function StudioMobile(props: StudioMobileProps) {
  const [step, setStep] = React.useState(0);

  const canContinue = step === 0 ? props.selectedProductIds.length > 0 : step === 1 ? props.locationReady : true;
  const hint =
    step === 0 && props.selectedProductIds.length === 0
      ? "Select at least one product to continue."
      : step === 1 && !props.locationReady
        ? "Choose or upload a location to continue."
        : null;

  const isReview = step === STEPS.length - 1;

  return (
    <div>
      <div className="bg-background/95 sticky top-14 z-10 -mx-4 border-b px-4 py-3 backdrop-blur">
        <StepIndicator step={step} />
      </div>

      <div className="space-y-4 pt-4 pb-4">
        {step === 0 && (
          <Card>
            <CardContent className="space-y-5 pt-6">
              <BrandPicker brands={props.brands} value={props.brand.id} onChange={props.onBrandChange} />
              <LogoPicker logos={props.brandLogos} value={props.logo?.id ?? null} onChange={props.onLogoChange} />
              <ProductPicker
                products={props.brandProducts}
                selectedIds={props.selectedProductIds}
                onToggle={props.onToggleProduct}
              />
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardContent className="pt-6">
              <LocationPicker
                locations={props.locations}
                mode={props.state.locationMode}
                locationId={props.state.locationId}
                mainLocationImageId={props.state.mainLocationImageId}
                newLocation={props.state.newLocation}
                onSetMode={props.onSetLocationMode}
                onSelectLocation={props.onSelectLocation}
                onSetMainImage={props.onSetMainImage}
                onUpdateNewLocation={props.onUpdateNewLocation}
              />
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardContent className="pt-6">
              <ControlsPanel
                settings={props.state.settings}
                onChange={props.onSettingsChange}
                notes={props.state.notes}
                onNotesChange={props.onNotesChange}
              />
            </CardContent>
          </Card>
        )}

        {isReview && (
          <div className="space-y-4">
            <ReadinessSummary items={props.readinessItems} />
            <CanvasPreview
              settings={props.state.settings}
              brand={props.brand}
              logo={props.logo}
              products={props.selectedProducts}
              locationImageUrl={props.mainLocationImageUrl}
              locationName={props.composeLocationName}
              job={props.job}
            />
            <Card>
              <CardContent className="divide-border divide-y pt-6">
                <div className="flex items-center justify-between gap-3 pb-2">
                  <span className="text-muted-foreground flex items-center gap-2 text-xs">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: props.brand.accentColor }} />
                    Brand
                  </span>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {props.logo && (
                      <span className="bg-card size-5 overflow-hidden rounded">
                        <AssetImage src={props.logo.asset.url} alt="" className="size-full object-contain" />
                      </span>
                    )}
                    {props.brand.name}
                  </span>
                </div>
                <ReviewRow icon={Sparkles} label="Logo" value={props.logo ? LOGO_KIND_LABELS[props.logo.kind] : "None"} />
                <ReviewRow
                  icon={Package2}
                  label="Products"
                  value={
                    props.selectedProducts.length > 0
                      ? props.selectedProducts.map((p) => p.name).join(", ")
                      : "None"
                  }
                />
                <ReviewRow icon={MapPin} label="Location" value={props.composeLocationName ?? "None"} />
                <ReviewRow
                  icon={Sparkles}
                  label="Output"
                  value={`${props.state.settings.outputCount} × ${props.state.settings.aspectRatio}`}
                />
              </CardContent>
            </Card>
            {props.instructions && <InstructionsPreview instructions={props.instructions} />}
          </div>
        )}
      </div>

      {/* Single sticky action bar, offset above the bottom navigation. */}
      <div
        data-testid="studio-step-footer"
        className="bg-background/95 sticky bottom-20 z-30 -mx-4 border-t px-4 py-3 backdrop-blur"
      >
        {hint && (
          <p className="text-muted-foreground mb-2 text-center text-xs">{hint}</p>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          {isReview ? (
            <Button className="flex-[2]" onClick={props.onGenerate} disabled={!props.canGenerate}>
              {props.generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {props.generating ? "Generating…" : "Generate"}
            </Button>
          ) : (
            <Button className="flex-[2]" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!canContinue}>
              Continue
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
