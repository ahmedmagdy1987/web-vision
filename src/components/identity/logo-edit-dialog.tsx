"use client";

import * as React from "react";
import type { LogoAsset, LogoKind } from "@/lib/domain";
import { LOGO_KIND_LABELS } from "@/lib/domain";
import { brandRepository } from "@/lib/repositories";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LOGO_KINDS = Object.keys(LOGO_KIND_LABELS) as LogoKind[];

interface LogoEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logo: LogoAsset;
  brandId: string;
}

export function LogoEditDialog({ open, onOpenChange, logo, brandId }: LogoEditDialogProps) {
  // Re-prime when the target logo changes or the dialog re-opens.
  const formKey = `${logo.id}:${open ? "open" : "closed"}`;
  const [lastKey, setLastKey] = React.useState(formKey);
  const [kind, setKind] = React.useState<LogoKind>(logo.kind);
  const [instructions, setInstructions] = React.useState(logo.instructions ?? "");

  if (formKey !== lastKey) {
    setLastKey(formKey);
    setKind(logo.kind);
    setInstructions(logo.instructions ?? "");
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    brandRepository.updateLogo(brandId, logo.id, {
      kind,
      instructions: instructions.trim() || undefined,
    });
    toast.success("Logo details updated.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit logo details</DialogTitle>
          <DialogDescription>Classify the logo and add placement guidance.</DialogDescription>
        </DialogHeader>

        <form id="logo-edit-form" onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="logo-edit-kind">Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as LogoKind)}>
              <SelectTrigger id="logo-edit-kind">
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

          <div className="space-y-1.5">
            <Label htmlFor="logo-edit-instructions">Placement guidance</Label>
            <Textarea
              id="logo-edit-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Clear-space, sizing, or placement notes for this logo."
              className="min-h-20"
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="logo-edit-form">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
