"use client";

import * as React from "react";
import { Archive, Trash2 } from "lucide-react";
import type { LogoAsset } from "@/lib/domain";
import { brandRepository } from "@/lib/repositories";
import { useResults } from "@/lib/hooks";
import { toast } from "@/components/ui/sonner";
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
 * Safe logo removal. If the logo is referenced by any historical Gallery result
 * it cannot be permanently deleted (that would break history) — instead it is
 * archived ("removed from the active library") and stays available for past
 * mockups. An unreferenced logo is permanently deleted: the asset record and its
 * private Storage object are removed (handled by brandRepository.removeLogo).
 */
export function LogoDeleteDialog({
  open,
  onOpenChange,
  logo,
  brandId,
  name,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  logo: LogoAsset;
  brandId: string;
  name: string;
}) {
  const results = useResults();
  const referenced = React.useMemo(
    () => results.some((r) => r.snapshot.logoId === logo.id),
    [results, logo.id],
  );

  const handleDelete = async () => {
    try {
      await brandRepository.removeLogo(brandId, logo.id);
      toast.success("Logo deleted.");
      onOpenChange(false);
    } catch {
      toast.error("Could not delete this logo. It was not removed — please try again.");
    }
  };

  const handleArchive = () => {
    brandRepository.setLogoStatus(brandId, logo.id, "archived");
    toast.success("Logo removed from the active library.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{referenced ? "Remove this logo?" : "Delete this logo?"}</DialogTitle>
          <DialogDescription>
            {referenced
              ? "This logo is used by mockups in your Gallery, so it can't be permanently deleted. You can remove it from the active library — it stays available for past mockups and is hidden from new-generation pickers."
              : "This permanently deletes the logo image. This action can't be undone."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-lg border p-3">
          <span className="bg-muted/40 size-14 shrink-0 overflow-hidden rounded-md border">
            <AssetImage src={logo.asset.url} alt="" className="size-full object-contain p-1.5" />
          </span>
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{name}</p>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {referenced ? (
            <Button type="button" onClick={handleArchive}>
              <Archive className="size-4" />
              Remove from active library
            </Button>
          ) : (
            <Button type="button" variant="destructive" onClick={() => void handleDelete()}>
              <Trash2 className="size-4" />
              Delete logo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
