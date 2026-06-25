"use client";

import * as React from "react";
import { AlertTriangle, Archive, Loader2, Trash2 } from "lucide-react";
import { AssetImage } from "@/components/common/asset-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Capitalized type label, e.g. "Product" or "Location". */
  assetType: string;
  name: string;
  thumbnailUrl?: string;
  /** True → the asset is used by history; only archiving is offered. */
  referenced: boolean;
  /** Archive (hide from new-generation pickers; preserve history). */
  onArchive: () => void;
  /** Permanent delete (only reached when NOT referenced). */
  onDelete: () => Promise<void>;
}

/**
 * Custom Malahi-styled delete/archive confirmation — never the browser `confirm`.
 * Referenced assets are protected (archive only, clearly explained); unreferenced
 * assets can be permanently deleted. Shows a loading state and a safe failure
 * state that leaves the asset untouched.
 */
export function DeleteAssetDialog({
  open,
  onOpenChange,
  assetType,
  name,
  thumbnailUrl,
  referenced,
  onArchive,
  onDelete,
}: DeleteAssetDialogProps) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const lower = assetType.toLowerCase();

  const close = (next: boolean) => {
    if (busy) return;
    setError(null);
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    setError(null);
    if (referenced) {
      onArchive();
      onOpenChange(false);
      return;
    }
    setBusy(true);
    try {
      await onDelete();
      onOpenChange(false);
    } catch {
      setError(`Could not delete this ${lower}. It was not removed — please try again.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent showClose={!busy} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {referenced ? `Remove ${assetType} from active library` : `Delete ${assetType}`}
          </DialogTitle>
          <DialogDescription>
            {referenced
              ? `This ${lower} is used by previous mockups and cannot be permanently deleted.`
              : `This permanently deletes the ${lower} and its images. This cannot be undone.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-lg border p-3">
          <span className="bg-muted size-14 shrink-0 overflow-hidden rounded-md">
            <AssetImage src={thumbnailUrl} alt={name} className="size-full object-cover" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="text-muted-foreground text-xs">{assetType}</p>
          </div>
        </div>

        {referenced ? (
          <p className="text-muted-foreground text-xs">
            Removing it hides the {lower} from new mockups but keeps your existing Gallery results and
            downloads intact. You can restore it later.
          </p>
        ) : (
          <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
            <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" />
            Not used by any mockup yet — safe to delete permanently.
          </p>
        )}

        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant={referenced ? "default" : "destructive"} onClick={handleConfirm} disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : referenced ? (
              <Archive className="size-4" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {referenced ? "Remove from active library" : `Delete ${assetType}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
