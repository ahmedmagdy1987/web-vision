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
  /** Archive (hide from new-generation pickers; preserve history). */
  onArchive: () => void;
  /** Permanent delete (DB record + Storage images + join rows). */
  onDelete: () => Promise<void>;
}

/**
 * Custom Malahi-styled delete/archive confirmation — never the browser `confirm`,
 * and Delete is NEVER silently turned into Archive.
 *
 *  - Unreferenced asset → a single, explicit permanent-delete confirmation.
 *  - Referenced asset → first explains it's used by N mockups and offers Cancel /
 *    "Remove from active library" (archive). Permanent deletion is still possible
 *    via a clearly-labeled second step ("Permanently delete anyway"): the existing
 *    mockups keep their generated images + details (the snapshot is self-contained),
 *    so only the source asset and its uploaded images are removed.
 */
export function DeleteAssetDialog({
  open,
  onOpenChange,
  assetType,
  name,
  thumbnailUrl,
  referenceCount,
  onArchive,
  onDelete,
}: DeleteAssetDialogProps) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // For a referenced asset, the user must explicitly escalate past the archive
  // option to reach permanent deletion.
  const [confirmPermanent, setConfirmPermanent] = React.useState(false);
  const lower = assetType.toLowerCase();
  const referenced = referenceCount > 0;
  const mockups = `${referenceCount} previous mockup${referenceCount === 1 ? "" : "s"}`;

  // Reset transient state on every close path so the next open starts clean.
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

  // The permanent-delete view is shown for unreferenced assets, or once a
  // referenced asset has been escalated.
  const showPermanent = !referenced || confirmPermanent;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent showClose={!busy} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {showPermanent
              ? `${referenced ? "Permanently delete" : "Delete"} ${assetType}${referenced ? "?" : ""}`
              : `${assetType} is used by existing mockups`}
          </DialogTitle>
          <DialogDescription>
            {showPermanent && referenced
              ? `Your ${mockups} keep their generated images and details. Only this source ${lower} and its uploaded images are removed. This can't be undone.`
              : showPermanent
                ? `This permanently deletes the ${lower} and its images. This can't be undone.`
                : `This ${lower} is used by ${mockups} and can't be permanently deleted without affecting history.`}
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

        {!showPermanent ? (
          <p className="text-muted-foreground text-xs">
            Removing it from the active library hides the {lower} from new mockups but keeps your existing
            Gallery results and downloads intact. You can restore it later.
          </p>
        ) : (
          <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
            <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" />
            {referenced
              ? "Existing mockups are unaffected — only the source asset is removed."
              : `Not used by any mockup yet — safe to delete permanently.`}
          </p>
        )}

        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}

        {showPermanent ? (
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => (referenced ? setConfirmPermanent(false) : close(false))}
              disabled={busy}
            >
              {referenced ? "Back" : "Cancel"}
            </Button>
            <Button variant="destructive" onClick={() => void handlePermanentDelete()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {referenced ? "Permanently delete" : `Delete ${assetType}`}
            </Button>
          </DialogFooter>
        ) : (
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
        )}
      </DialogContent>
    </Dialog>
  );
}
