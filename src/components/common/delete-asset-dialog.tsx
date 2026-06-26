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
  /** How many historical Gallery mockups use this asset (0 = unreferenced). */
  referenceCount: number;
  /** Already archived → skip the archive-first step; allow direct permanent delete. */
  archived?: boolean;
  /** Archive (hide from new-generation pickers; preserve history). */
  onArchive: () => void;
  /** Permanent delete (DB record + Storage images + join rows). */
  onDelete: () => Promise<void>;
}

/**
 * Custom Malahi-styled delete/archive confirmation — never the browser `confirm`,
 * and Delete is NEVER silently turned into Archive.
 *
 *  - ACTIVE + referenced → first explains it's used by N mockups and offers
 *    Cancel / "Remove from active library"; permanent deletion needs an explicit
 *    second step ("Permanently delete anyway" → "Permanently delete").
 *  - ARCHIVED (referenced or not) → goes straight to the permanent-delete
 *    confirmation (no need to restore first).
 *  - ACTIVE + unreferenced → a single explicit permanent-delete confirmation.
 *
 * Permanently deleting a referenced asset is safe: existing Gallery results keep
 * their generated images + denormalized names (the snapshot is self-contained).
 */
export function DeleteAssetDialog({
  open,
  onOpenChange,
  assetType,
  name,
  thumbnailUrl,
  referenceCount,
  archived = false,
  onArchive,
  onDelete,
}: DeleteAssetDialogProps) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmPermanent, setConfirmPermanent] = React.useState(false);
  const lower = assetType.toLowerCase();
  const referenced = referenceCount > 0;
  const mockups = `${referenceCount} previous mockup${referenceCount === 1 ? "" : "s"}`;

  const reset = React.useCallback(() => {
    setConfirmPermanent(false);
    setError(null);
  }, []);

  const close = (next: boolean) => {
    if (busy) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleArchive = () => {
    if (busy) return;
    onArchive();
    reset();
    onOpenChange(false);
  };

  const handlePermanentDelete = async () => {
    setError(null);
    setBusy(true);
    try {
      await onDelete();
      reset();
      onOpenChange(false);
    } catch {
      setError(`Could not delete this ${lower}. It was not removed — please try again.`);
    } finally {
      setBusy(false);
    }
  };

  // Active + referenced assets are protected behind an archive-first step; archived
  // assets (and active unreferenced ones) go straight to the permanent-delete view.
  const showArchiveFirst = !archived && referenced && !confirmPermanent;
  const cameFromArchiveFirst = !archived && referenced && confirmPermanent;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent showClose={!busy} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {showArchiveFirst
              ? `${assetType} is used by existing mockups`
              : referenced
                ? `Permanently delete ${assetType}?`
                : `Delete ${assetType}`}
          </DialogTitle>
          <DialogDescription>
            {showArchiveFirst
              ? `This ${lower} is used by ${mockups} and can't be permanently deleted without affecting history.`
              : referenced
                ? `The source ${lower} and its uploaded files will be permanently deleted. Existing generated Gallery images and saved names remain available. This can't be undone.`
                : `This permanently deletes the ${lower} and its images. This can't be undone.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-lg border p-3">
          <span className="bg-muted size-14 shrink-0 overflow-hidden rounded-md">
            <AssetImage src={thumbnailUrl} alt={name} className="size-full object-cover" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="text-muted-foreground text-xs">{archived ? `${assetType} · Archived` : assetType}</p>
          </div>
        </div>

        {showArchiveFirst ? (
          <p className="text-muted-foreground text-xs">
            Removing it from the active library hides the {lower} from new mockups but keeps your existing
            Gallery results and downloads intact. You can restore it later.
          </p>
        ) : (
          <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
            <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" />
            {referenced
              ? "Existing mockups keep their generated images — only the source is removed."
              : "Not used by any mockup — safe to delete permanently."}
          </p>
        )}

        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}

        {showArchiveFirst ? (
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive sm:mr-auto"
              onClick={() => setConfirmPermanent(true)}
            >
              Permanently delete anyway
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button onClick={handleArchive}>
                <Archive className="size-4" />
                Remove from active library
              </Button>
            </div>
          </DialogFooter>
        ) : (
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => (cameFromArchiveFirst ? setConfirmPermanent(false) : close(false))}
              disabled={busy}
            >
              {cameFromArchiveFirst ? "Back" : "Cancel"}
            </Button>
            <Button variant="destructive" onClick={() => void handlePermanentDelete()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {referenced ? "Permanently delete" : `Delete ${assetType}`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
