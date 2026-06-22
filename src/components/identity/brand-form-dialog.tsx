"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import type { Brand } from "@/lib/domain";
import { brandRepository } from "@/lib/repositories";
import { DEFAULT_ACCENT, isValidHexColor } from "@/lib/theme/brand-accent";
import { appStore } from "@/lib/hooks";
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
import { ColorPicker } from "@/components/common/color-picker";

interface BrandFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog edits this brand; otherwise it creates a new one. */
  brand?: Brand | null;
  /** Select the brand after a successful create. */
  selectOnCreate?: boolean;
}

const EMPTY = { name: "", accent: DEFAULT_ACCENT, description: "", instructions: "" };

export function BrandFormDialog({ open, onOpenChange, brand, selectOnCreate = true }: BrandFormDialogProps) {
  const isEdit = brand != null;

  // Re-prime the form whenever the target entity (or create-mode) changes, using
  // the adjust-state-during-render pattern keyed off a stable identity token.
  const formKey = `${brand?.id ?? "new"}:${open ? "open" : "closed"}`;
  const [lastKey, setLastKey] = React.useState(formKey);
  const [name, setName] = React.useState(brand?.name ?? EMPTY.name);
  const [accent, setAccent] = React.useState(brand?.accentColor ?? EMPTY.accent);
  const [description, setDescription] = React.useState(brand?.description ?? EMPTY.description);
  const [instructions, setInstructions] = React.useState(brand?.instructions ?? EMPTY.instructions);
  const [submitted, setSubmitted] = React.useState(false);

  if (formKey !== lastKey) {
    setLastKey(formKey);
    setName(brand?.name ?? EMPTY.name);
    setAccent(brand?.accentColor ?? EMPTY.accent);
    setDescription(brand?.description ?? EMPTY.description);
    setInstructions(brand?.instructions ?? EMPTY.instructions);
    setSubmitted(false);
  }

  const trimmedName = name.trim();
  const nameValid = trimmedName.length > 0;
  const accentValid = isValidHexColor(accent);
  const formValid = nameValid && accentValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!formValid) {
      toast.error("Fix the highlighted fields before saving.");
      return;
    }

    if (isEdit && brand) {
      brandRepository.updateBrand(brand.id, {
        name: trimmedName,
        accentColor: accent,
        description: description.trim() || undefined,
        instructions: instructions.trim() || undefined,
      });
      toast.success(`“${trimmedName}” updated.`);
    } else {
      const created = brandRepository.addBrand({
        name: trimmedName,
        accentColor: accent,
        description: description.trim() || undefined,
        instructions: instructions.trim() || undefined,
      });
      if (selectOnCreate) appStore.setSelectedBrand(created.id);
      toast.success(`“${created.name}” added.`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit brand" : "Add a brand"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the brand identity, accent, and generation guidance."
              : "Create a new brand identity. The accent drives the workspace theme."}
          </DialogDescription>
        </DialogHeader>

        <form id="brand-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="brand-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="brand-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aurora Living"
              autoFocus
              aria-invalid={submitted && !nameValid}
              aria-describedby={submitted && !nameValid ? "brand-name-error" : undefined}
            />
            {submitted && !nameValid && (
              <p id="brand-name-error" className="text-destructive text-xs">
                A brand name is required.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand-accent">Accent color</Label>
            <ColorPicker id="brand-accent" value={accent} onChange={setAccent} />
            {!accentValid && (
              <p className="text-destructive text-xs">Enter a valid hex color (e.g. #6366f1).</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand-description">Description</Label>
            <Textarea
              id="brand-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short tagline that captures the brand voice."
              className="min-h-16"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand-instructions" className="gap-1.5">
              <Sparkles className="text-brand size-3.5" />
              Generation instructions
            </Label>
            <Textarea
              id="brand-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Identity rules, tone, do's and don'ts applied to every generation for this brand."
              className="min-h-24"
            />
            <p className="text-muted-foreground text-xs">
              Applied to every visual generated for this brand.
            </p>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="brand-form" disabled={submitted && !formValid}>
            {isEdit ? "Save changes" : "Create brand"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
