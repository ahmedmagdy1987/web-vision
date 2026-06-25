"use client";

import * as React from "react";
import { MoreVertical, Pencil, RefreshCw, Star, Trash2 } from "lucide-react";
import type { LogoAsset } from "@/lib/domain";
import { LOGO_KIND_LABELS } from "@/lib/domain";
import { brandRepository } from "@/lib/repositories";
import { filesToImageAssets } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AssetImage } from "@/components/common/asset-image";
import { ImageLightbox } from "@/components/common/image-lightbox";
import { LogoDeleteDialog } from "@/components/logos/logo-delete-dialog";
import { LogoEditDialog } from "./logo-edit-dialog";

interface LogoCardProps {
  logo: LogoAsset;
  brandId: string;
  isDefault: boolean;
  /** Optional logo name shown on the card (used by the flat Logo Library). */
  name?: string;
}

export function LogoCard({ logo, brandId, isDefault, name }: LogoCardProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const replaceRef = React.useRef<HTMLInputElement>(null);

  const archived = logo.status === "archived";

  const handleSetDefault = () => {
    brandRepository.setDefaultLogo(brandId, logo.id);
    toast.success(`Default logo set to ${LOGO_KIND_LABELS[logo.kind]}.`);
  };

  const handleToggleStatus = () => {
    const next = archived ? "active" : "archived";
    brandRepository.setLogoStatus(brandId, logo.id, next);
    toast.success(`Logo ${next === "active" ? "activated" : "archived"}.`);
  };

  const handleReplace = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const { assets, errors } = await filesToImageAssets(Array.from(fileList));
    errors.forEach((err) => toast.error(err));
    if (assets[0]) {
      brandRepository.replaceLogoAsset(brandId, logo.id, assets[0]);
      toast.success("Logo image replaced.");
    }
    if (replaceRef.current) replaceRef.current.value = "";
  };

  return (
    <li
      className={cn(
        "group bg-card relative flex flex-col overflow-hidden rounded-xl border shadow-sm transition-colors",
        isDefault ? "border-brand-border ring-1 ring-brand-border" : "hover:border-brand-border/60",
        archived && "opacity-60",
      )}
    >
      <div className="bg-muted/40 relative">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label={`View ${LOGO_KIND_LABELS[logo.kind]} logo`}
          className="block w-full cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
        >
          <AssetImage
            src={logo.asset.url}
            alt={`${LOGO_KIND_LABELS[logo.kind]} logo`}
            className="aspect-square w-full bg-[linear-gradient(45deg,var(--muted)_25%,transparent_25%),linear-gradient(-45deg,var(--muted)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,var(--muted)_75%),linear-gradient(-45deg,transparent_75%,var(--muted)_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] object-contain p-4"
          />
        </button>
        {isDefault && (
          <span className="bg-brand text-brand-foreground absolute top-2 left-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold">
            <Star className="size-3 fill-current" />
            Default
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon-sm"
              className="absolute top-2 right-2 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
              aria-label="Logo actions"
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil />
              Edit details
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => replaceRef.current?.click()}
            >
              <RefreshCw />
              Replace image
            </DropdownMenuItem>
            {!isDefault && !archived && (
              <DropdownMenuItem onSelect={handleSetDefault}>
                <Star />
                Set as default
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={handleToggleStatus}>
              {archived ? "Activate" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {name && (
          <p className="truncate text-sm font-medium" title={name}>
            {name}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{LOGO_KIND_LABELS[logo.kind]}</Badge>
          {archived ? (
            <Badge variant="muted">Archived</Badge>
          ) : (
            <Badge variant="success">Active</Badge>
          )}
        </div>
        {logo.instructions && (
          <p className="text-muted-foreground line-clamp-2 text-xs" title={logo.instructions}>
            {logo.instructions}
          </p>
        )}

        <div className="mt-auto flex items-center gap-1 pt-1">
          {!isDefault && !archived && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={handleSetDefault} aria-label="Set as default logo">
                  <Star />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Set as default</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)} aria-label="Edit logo details">
                <Pencil />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit details</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => replaceRef.current?.click()}
                aria-label="Replace logo image"
              >
                <RefreshCw />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Replace image</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <input
        ref={replaceRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.svg,.gif,.avif"
        className="sr-only"
        onChange={(e) => void handleReplace(e.target.files)}
      />

      <LogoEditDialog open={editOpen} onOpenChange={setEditOpen} logo={logo} brandId={brandId} />

      <LogoDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        logo={logo}
        brandId={brandId}
        name={name ?? LOGO_KIND_LABELS[logo.kind]}
      />

      <ImageLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        images={[{ url: logo.asset.url, alt: `${LOGO_KIND_LABELS[logo.kind]} logo` }]}
        index={0}
        onIndexChange={() => {}}
      />
    </li>
  );
}
