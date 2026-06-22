"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import type { ImageAsset, LogoKind } from "@/lib/domain";
import { LOGO_KIND_LABELS } from "@/lib/domain";
import { brandRepository } from "@/lib/repositories";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageDropzone } from "@/components/common/image-dropzone";

const LOGO_KINDS = Object.keys(LOGO_KIND_LABELS) as LogoKind[];

interface LogoUploaderProps {
  brandId: string;
}

/** Upload a single logo asset (with preview), pick its kind, and attach guidance. */
export function LogoUploader({ brandId }: LogoUploaderProps) {
  const [asset, setAsset] = React.useState<ImageAsset[]>([]);
  const [kind, setKind] = React.useState<LogoKind>("primary");
  const [instructions, setInstructions] = React.useState("");

  // Reset the form when switching to a different brand.
  const [lastBrand, setLastBrand] = React.useState(brandId);
  if (brandId !== lastBrand) {
    setLastBrand(brandId);
    setAsset([]);
    setKind("primary");
    setInstructions("");
  }

  const current = asset[0] ?? null;

  const handleAdd = () => {
    if (!current) {
      toast.error("Upload a logo image first.");
      return;
    }
    brandRepository.addLogo(brandId, {
      asset: current,
      kind,
      instructions: instructions.trim() || undefined,
    });
    toast.success(`${LOGO_KIND_LABELS[kind]} logo added.`);
    setAsset([]);
    setKind("primary");
    setInstructions("");
  };

  return (
    <div className="border-brand-border/60 bg-brand-subtle/30 space-y-4 rounded-xl border border-dashed p-4">
      <div className="space-y-1.5">
        <Label>Logo image</Label>
        <ImageDropzone
          value={asset}
          onChange={setAsset}
          multiple={false}
          label="Drop a logo or click to upload"
          hint="Transparent PNG or SVG works best"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="logo-kind">Kind</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as LogoKind)}>
            <SelectTrigger id="logo-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOGO_KINDS.map((value) => (
                <SelectItem key={value} value={value}>
                  {LOGO_KIND_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="button" onClick={handleAdd} disabled={!current} className="w-full">
            <Plus />
            Add logo
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="logo-instructions">Placement guidance</Label>
        <Textarea
          id="logo-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Optional clear-space or placement notes for this logo."
          className="min-h-16"
        />
      </div>
    </div>
  );
}
