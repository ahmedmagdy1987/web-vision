"use client";

import { MapPin } from "lucide-react";
import type { ImageAsset, Location } from "@/lib/domain";
import { LOCATION_USAGE_LABELS } from "@/lib/domain";
import { AssetImage } from "@/components/common/asset-image";
import { ImageDropzone } from "@/components/common/image-dropzone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { NewLocationDraft } from "./studio-state";

interface LocationPickerProps {
  locations: Location[];
  mode: "existing" | "new";
  locationId: string | null;
  mainLocationImageId: string | null;
  newLocation: NewLocationDraft;
  onSetMode: (mode: "existing" | "new") => void;
  onSelectLocation: (id: string) => void;
  onSetMainImage: (imageId: string) => void;
  onUpdateNewLocation: (patch: Partial<NewLocationDraft>) => void;
}

export function LocationPicker({
  locations,
  mode,
  locationId,
  mainLocationImageId,
  newLocation,
  onSetMode,
  onSelectLocation,
  onSetMainImage,
  onUpdateNewLocation,
}: LocationPickerProps) {
  const selected = locations.find((l) => l.id === locationId) ?? null;
  const effectiveMainId = mainLocationImageId ?? selected?.mainImageId ?? selected?.images[0]?.id ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Location</Label>
        <ToggleGroup
          type="single"
          size="sm"
          value={mode}
          onValueChange={(v) => v && onSetMode(v as "existing" | "new")}
          aria-label="Location source"
        >
          <ToggleGroupItem value="existing">Existing</ToggleGroupItem>
          <ToggleGroupItem value="new">Upload new</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {mode === "existing" ? (
        <div className="space-y-3">
          {locations.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed px-3 py-6 text-center text-sm">
              <MapPin className="size-5" />
              No saved locations yet. Switch to “Upload new”.
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-2">
              {locations.map((location) => {
                const isSelected = location.id === locationId;
                const main = location.images.find((i) => i.id === location.mainImageId) ?? location.images[0];
                return (
                  <li key={location.id}>
                    <button
                      type="button"
                      onClick={() => onSelectLocation(location.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        "group w-full overflow-hidden rounded-lg border text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                        isSelected ? "border-brand ring-2 ring-brand/30" : "border-border hover:border-brand-border",
                      )}
                    >
                      <span className="bg-muted block aspect-[4/3] w-full overflow-hidden">
                        <AssetImage src={main?.url} alt="" className="size-full object-cover" />
                      </span>
                      <span className="flex items-center justify-between gap-1 px-2 py-1.5">
                        <span className="min-w-0 truncate text-xs font-medium">{location.name}</span>
                        <span className="text-muted-foreground shrink-0 text-[10px] uppercase">
                          {LOCATION_USAGE_LABELS[location.usage]}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {selected && selected.images.length > 1 && (
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs">Primary image</p>
              <div className="flex flex-wrap gap-1.5">
                {selected.images.map((image: ImageAsset) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => onSetMainImage(image.id)}
                    aria-label={`Use ${image.name} as primary`}
                    aria-pressed={image.id === effectiveMainId}
                    className={cn(
                      "size-12 overflow-hidden rounded-md border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                      image.id === effectiveMainId ? "border-brand ring-2 ring-brand/30" : "border-border",
                    )}
                  >
                    <AssetImage src={image.url} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-loc-name">Location name</Label>
            <Input
              id="new-loc-name"
              value={newLocation.name}
              onChange={(e) => onUpdateNewLocation({ name: e.target.value })}
              placeholder="e.g. Downtown flagship store"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Indoor or outdoor</Label>
            <ToggleGroup
              type="single"
              size="sm"
              value={newLocation.usage}
              onValueChange={(v) => v && onUpdateNewLocation({ usage: v as NewLocationDraft["usage"] })}
              aria-label="Indoor or outdoor"
            >
              <ToggleGroupItem value="indoor" className="flex-1">
                Indoor
              </ToggleGroupItem>
              <ToggleGroupItem value="outdoor" className="flex-1">
                Outdoor
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-1.5">
            <Label>Location images</Label>
            <ImageDropzone
              value={newLocation.images}
              onChange={(images) => onUpdateNewLocation({ images })}
              mainImageId={newLocation.mainImageId ?? undefined}
              onSetMain={(id) => onUpdateNewLocation({ mainImageId: id })}
              label="Drop location photos or click to upload"
              hint="Pick a primary image with the star · up to 8MB each"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-loc-notes">Preservation instructions</Label>
            <Textarea
              id="new-loc-notes"
              value={newLocation.preservationInstructions}
              onChange={(e) => onUpdateNewLocation({ preservationInstructions: e.target.value })}
              placeholder="What must stay unchanged (architecture, windows, layout)…"
              className="min-h-16"
            />
          </div>

          <label className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
            <span className="text-sm font-medium">Save location for reuse</span>
            <Switch
              checked={newLocation.save}
              onCheckedChange={(checked) => onUpdateNewLocation({ save: checked })}
              aria-label="Save location for reuse"
            />
          </label>
        </div>
      )}
    </div>
  );
}
