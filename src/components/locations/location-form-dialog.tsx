"use client";

import * as React from "react";
import type { ImageAsset, Location, LocationUsage } from "@/lib/domain";
import { LOCATION_USAGE_LABELS } from "@/lib/domain";
import { locationRepository, projectRepository, type LocationInput } from "@/lib/repositories";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ImageDropzone } from "@/components/common/image-dropzone";

// Richer fields (city, explicit environment type, dimensions, address) map onto
// the existing Location fields for now (usage = indoor/outdoor, description =
// site notes/address); a domain expansion is deferred to a later phase.
const USAGE_VALUES: LocationUsage[] = ["indoor", "outdoor"];

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this location, otherwise creates a new one. */
  location?: Location | null;
  /** Active project a newly-created location is assigned to. */
  activeProjectId?: string;
}

export function LocationFormDialog({ open, onOpenChange, location, activeProjectId }: LocationFormDialogProps) {
  const [name, setName] = React.useState("");
  const [usage, setUsage] = React.useState<LocationUsage>("indoor");
  const [description, setDescription] = React.useState("");
  const [images, setImages] = React.useState<ImageAsset[]>([]);
  const [mainImageId, setMainImageId] = React.useState<string | undefined>(undefined);
  const [notes, setNotes] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  // Reset on open / target change (adjust-during-render, no setState-in-effect).
  const formKey = `${open ? "open" : "closed"}:${location?.id ?? "new"}:${location?.updatedAt ?? ""}`;
  const [lastKey, setLastKey] = React.useState<string | null>(null);
  if (lastKey !== formKey) {
    setLastKey(formKey);
    if (open) {
      setName(location?.name ?? "");
      setUsage(location?.usage ?? "indoor");
      setDescription(location?.description ?? "");
      setImages(location?.images ?? []);
      setMainImageId(location?.mainImageId ?? location?.images[0]?.id);
      setNotes(location?.preservationInstructions ?? "");
    }
    setSubmitted(false);
  }

  // Keep the primary image valid as the image set changes.
  const handleImagesChange = (next: ImageAsset[]) => {
    setImages(next);
    if (next.length === 0) setMainImageId(undefined);
    else if (!mainImageId || !next.some((i) => i.id === mainImageId)) setMainImageId(next[0].id);
  };

  const trimmedName = name.trim();
  const nameError = trimmedName.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (nameError) {
      toast.error("A site name is required.");
      return;
    }
    const input: LocationInput = {
      name: trimmedName,
      usage,
      images,
      mainImageId: mainImageId ?? images[0]?.id,
      description: description.trim() || undefined,
      preservationInstructions: notes.trim() || undefined,
      saved: true,
    };
    if (location) {
      locationRepository.updateLocation(location.id, input);
      toast.success(`Updated “${trimmedName}”.`);
    } else {
      const created = locationRepository.addLocation(input);
      if (activeProjectId && created) projectRepository.assignLocation(activeProjectId, created.id, true);
      toast.success(`Added “${trimmedName}”.`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{location ? "Edit location" : "Add location"}</DialogTitle>
          <DialogDescription>
            {location
              ? "Update this client site."
              : "Add a client site or venue where games and products are visualized."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="loc-name">
              Site / venue name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="loc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grand Mall Atrium"
              aria-invalid={submitted && nameError}
              autoFocus
            />
            {submitted && nameError && <p className="text-destructive text-xs">A site name is required.</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Environment</Label>
            <ToggleGroup
              type="single"
              value={usage}
              onValueChange={(v) => {
                if (v) setUsage(v as LocationUsage);
              }}
              className="justify-start"
            >
              {USAGE_VALUES.map((u) => (
                <ToggleGroupItem key={u} value={u}>
                  {LOCATION_USAGE_LABELS[u]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="loc-desc">Site notes / address</Label>
            <Textarea
              id="loc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="City, address or context for this site…"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Site photos</Label>
            <ImageDropzone
              value={images}
              onChange={handleImagesChange}
              mainImageId={mainImageId}
              onSetMain={setMainImageId}
              label="Drop site photos or click to upload"
              hint="Upload multiple camera angles · star the primary image"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="loc-notes">Preservation notes</Label>
            <Textarea
              id="loc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Architecture or scene details to preserve in generated images…"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{location ? "Save changes" : "Add location"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
