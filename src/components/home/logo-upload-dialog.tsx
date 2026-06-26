"use client";

import * as React from "react";
import type { ImageAsset } from "@/lib/domain";
import { brandRepository } from "@/lib/repositories";
import { DEFAULT_ACCENT } from "@/lib/theme/brand-accent";
import { ImageDropzone } from "@/components/common/image-dropzone";
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

/**
 * Direct, single-step logo upload. The employee only provides an image + a name;
 * the backend brand entity (the container for logos) is created transparently —
 * no complex brand form. Calls `onCreated` with the new (brandId, logoId).
 */
export function LogoUploadDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (brandId: string, logoId: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [images, setImages] = React.useState<ImageAsset[]>([]);

  const reset = () => {
    setName("");
    setImages([]);
  };

  const submit = () => {
    const asset = images[0];
    if (!asset || !name.trim()) return;
    const brand = brandRepository.addBrand({ name: name.trim(), accentColor: DEFAULT_ACCENT });
    const logo = brandRepository.addLogo(brand.id, { asset, kind: "primary" });
    if (logo) onCreated?.(brand.id, logo.id);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload logo</DialogTitle>
          <DialogDescription>Add a logo to your library to use in mockups.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <ImageDropzone
            value={images}
            onChange={setImages}
            multiple={false}
            label="Drop a logo or click to upload"
            hint="PNG, JPG, SVG · transparent background preferred"
          />
          <div className="space-y-1.5">
            <Label htmlFor="logo-name">Name</Label>
            <Input
              id="logo-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. client brand name"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!images[0] || !name.trim()}>
            Save logo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
