"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
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
import { cn } from "@/lib/utils";

const USAGE_VALUES: LocationUsage[] = ["indoor", "outdoor"];

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this location, otherwise creates a new one. */
  location?: Location | null;
  /** Active project a newly-created location is assigned to. */
  activeProjectId?: string;
}

/**
 * Simplified location capture: Name + scene photos (the starred photo is the main
 * scene; the rest are optional extra angles). Environment, site notes and
 * preservation live in a collapsed "Advanced details" section.
 */
export function LocationFormDialog({ open, onOpenChange, location, activeProjectId }: LocationFormDialogProps) {
  const [name, setName] = React.useState("");
  const [usage, setUsage] = React.useState<LocationUsage>("indoor");
  const [description, setDescription] = React.useState("");
  const [images, setImages] = React.useState<ImageAsset[]>([]);
  const [mainImageId, setMainImageId] = React.useState<string | undefined>(undefined);
  const [notes, setNotes] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

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
      setAdvancedOpen(false);
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
  const imageError = images.length === 0;
  const isValid = !nameError && !imageError;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!isValid) {
      toast.error(imageError ? "Add at least one scene photo." : "Enter a site name.");
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
      <DialogContent
        className={cn(
          "flex flex-col gap-0 p-0 sm:max-w-lg sm:max-h-[92dvh]",
          "max-sm:inset-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0",
        )}
      >
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>{location ? "Edit location" : "Add location"}</DialogTitle>
          <DialogDescription>
            {location
              ? "Update this client site."
              : "Add a client site photo to visualize products against."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {/* Name (required) */}
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

            {/* Main image + additional angles (required) */}
            <div className="space-y-1.5">
              <Label>
                Scene photos <span className="text-destructive">*</span>
              </Label>
              <ImageDropzone
                value={images}
                onChange={handleImagesChange}
                mainImageId={mainImageId}
                onSetMain={setMainImageId}
                label="Drop the main scene photo (and optional extra angles)"
                hint="Star the main scene · additional angles are optional"
              />
              {submitted && imageError && (
                <p className="text-destructive text-xs">At least one scene photo is required.</p>
              )}
            </div>

            {/* Advanced details — optional (collapsed) */}
            <div className="rounded-lg border">
              <button
                type="button"
                onClick={() => setAdvancedOpen((o) => !o)}
                aria-expanded={advancedOpen}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                Advanced details — optional
                <ChevronDown
                  className={cn("text-muted-foreground size-4 shrink-0 transition-transform", advancedOpen && "rotate-180")}
                />
              </button>
              {advancedOpen && (
                <div className="space-y-4 border-t px-3 py-4">
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
                    <Label htmlFor="loc-notes">Preservation notes</Label>
                    <Textarea
                      id="loc-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Architecture or scene details to preserve in generated images…"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="bg-background border-t px-5 py-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{location ? "Save changes" : "Save location"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
