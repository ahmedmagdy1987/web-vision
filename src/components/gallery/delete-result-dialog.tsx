"use client";

import * as React from "react";
import { CalendarClock, ImageIcon, Loader2, MapPin, Package2, Trash2 } from "lucide-react";
import type { GenerationResult } from "@/lib/domain";
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

/**
 * Custom Malahi confirmation for permanently deleting a generated Gallery result.
 * Shows the result preview, name, creation date and the logo/product/location it
 * used, and warns that the generated image is permanently removed. The SOURCE
 * logo/products/location are NOT affected.
 */
export function DeleteResultDialog({
  open,
  onOpenChange,
  result,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: GenerationResult;
  onDelete: () => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { snapshot } = result;
  const created = new Date(result.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const products = snapshot.productNames.length ? snapshot.productNames.join(", ") : "No products";

  const close = (next: boolean) => {
    if (busy) return;
    if (!next) setError(null);
    onOpenChange(next);
  };

  const handleDelete = async () => {
    setError(null);
    setBusy(true);
    try {
      await onDelete();
      onOpenChange(false);
    } catch {
      setError("Could not delete this mockup. It was not removed — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent showClose={!busy} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this mockup?</DialogTitle>
          <DialogDescription>
            The generated image will be permanently removed from your Gallery and private storage. The source
            logo, products and location are not affected. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 rounded-lg border p-3">
          <span className="bg-muted size-16 shrink-0 overflow-hidden rounded-md">
            <AssetImage
              src={result.image.url}
              alt={`${snapshot.brandName} mockup`}
              fallbackIcon={ImageIcon}
              className="size-full object-cover"
            />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-sm font-medium">{snapshot.brandName} mockup</p>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <CalendarClock className="size-3 shrink-0" />
              {created}
            </p>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Package2 className="size-3 shrink-0" />
              <span className="truncate">{products}</span>
            </p>
            {snapshot.locationName && (
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{snapshot.locationName}</span>
              </p>
            )}
          </div>
        </div>

        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => close(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void handleDelete()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Delete mockup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
