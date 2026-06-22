"use client";

import { Boxes } from "lucide-react";
import type { Brand, Location, LogoAsset, Product } from "@/lib/domain";
import { Separator } from "@/components/ui/separator";
import { BrandPicker, LogoPicker } from "./brand-logo-picker";
import { LocationPicker } from "./location-picker";
import { ProductPicker } from "./product-picker";
import type { NewLocationDraft } from "./studio-state";

interface AssetsPanelProps {
  brands: Brand[];
  brandLogos: LogoAsset[];
  brandProducts: Product[];
  locations: Location[];
  brandId: string | null;
  logoId: string | null;
  productIds: string[];
  locationMode: "existing" | "new";
  locationId: string | null;
  mainLocationImageId: string | null;
  newLocation: NewLocationDraft;
  onBrandChange: (id: string) => void;
  onLogoChange: (id: string) => void;
  onToggleProduct: (id: string) => void;
  onSetLocationMode: (mode: "existing" | "new") => void;
  onSelectLocation: (id: string) => void;
  onSetMainImage: (id: string) => void;
  onUpdateNewLocation: (patch: Partial<NewLocationDraft>) => void;
}

export function AssetsPanel(props: AssetsPanelProps) {
  return (
    <section aria-label="Assets" className="space-y-4">
      <div className="flex items-center gap-2">
        <Boxes className="text-muted-foreground size-4" />
        <h2 className="text-sm font-semibold">Assets</h2>
      </div>

      <BrandPicker brands={props.brands} value={props.brandId} onChange={props.onBrandChange} />
      <LogoPicker logos={props.brandLogos} value={props.logoId} onChange={props.onLogoChange} />

      <Separator />

      <ProductPicker products={props.brandProducts} selectedIds={props.productIds} onToggle={props.onToggleProduct} />

      <Separator />

      <LocationPicker
        locations={props.locations}
        mode={props.locationMode}
        locationId={props.locationId}
        mainLocationImageId={props.mainLocationImageId}
        newLocation={props.newLocation}
        onSetMode={props.onSetLocationMode}
        onSelectLocation={props.onSelectLocation}
        onSetMainImage={props.onSetMainImage}
        onUpdateNewLocation={props.onUpdateNewLocation}
      />
    </section>
  );
}
