"use client";

import Link from "next/link";
import { Check, ImageOff } from "lucide-react";
import type { Brand, LogoAsset } from "@/lib/domain";
import { LOGO_KIND_LABELS } from "@/lib/domain";
import { AssetImage } from "@/components/common/asset-image";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function BrandPicker({
  brands,
  value,
  onChange,
}: {
  brands: Brand[];
  value: string | null;
  onChange: (brandId: string) => void;
}) {
  const active = brands.filter((b) => b.status === "active");
  return (
    <div className="space-y-2">
      <Label htmlFor="studio-brand">Brand</Label>
      {active.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No active brands.{" "}
          <Link href="/identity?new=1" className="text-brand underline-offset-2 hover:underline">
            Create one
          </Link>
          .
        </p>
      ) : (
        <Select value={value ?? undefined} onValueChange={onChange}>
          <SelectTrigger id="studio-brand" className="w-full">
            <SelectValue placeholder="Select a brand" />
          </SelectTrigger>
          <SelectContent>
            {active.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                <span className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ backgroundColor: brand.accentColor }} />
                  {brand.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export function LogoPicker({
  logos,
  value,
  onChange,
}: {
  logos: LogoAsset[];
  value: string | null;
  onChange: (logoId: string) => void;
}) {
  const active = logos.filter((l) => l.status === "active");
  return (
    <div className="space-y-2">
      <Label>Logo</Label>
      {active.length === 0 ? (
        <div className="text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm">
          <ImageOff className="size-4" />
          No active logos for this brand.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {active.map((logo) => {
            const selected = logo.id === value;
            return (
              <button
                key={logo.id}
                type="button"
                onClick={() => onChange(logo.id)}
                aria-pressed={selected}
                aria-label={`${LOGO_KIND_LABELS[logo.kind]} logo`}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-lg border p-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                  selected ? "border-brand bg-brand-subtle" : "border-border hover:border-brand-border",
                )}
              >
                <span className="bg-card flex size-12 items-center justify-center overflow-hidden rounded-md border">
                  <AssetImage src={logo.asset.url} alt="" className="size-full object-contain p-1" />
                </span>
                <span className="text-[10px] font-medium">{LOGO_KIND_LABELS[logo.kind]}</span>
                {selected && (
                  <span className="bg-brand text-brand-foreground absolute -right-1.5 -top-1.5 rounded-full p-0.5">
                    <Check className="size-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function BrandSummary({ brand }: { brand: Brand }) {
  return (
    <Badge variant="brand" className="gap-1.5">
      <span className="size-2 rounded-full" style={{ backgroundColor: brand.accentColor }} />
      {brand.name}
    </Badge>
  );
}
