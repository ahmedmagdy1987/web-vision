"use client";

import * as React from "react";
import { Archive, FolderKanban, Images, MapPin, MoreVertical, Pencil, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import type { Location } from "@/lib/domain";
import { LOCATION_USAGE_LABELS } from "@/lib/domain";
import { useResults } from "@/lib/hooks";
import { locationRepository } from "@/lib/repositories";
import { isLocationReferenced } from "@/lib/services/asset-references";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import { AspectFrame } from "@/components/common/aspect-frame";
import { AssetImage } from "@/components/common/asset-image";
import { DeleteAssetDialog } from "@/components/common/delete-asset-dialog";
import { ImageLightbox } from "@/components/common/image-lightbox";

interface LocationCardProps {
  location: Location;
  projectName?: string;
  onEdit: (location: Location) => void;
  onUseInStudio: (location: Location) => void;
}

export function LocationCard({ location, projectName, onEdit, onUseInStudio }: LocationCardProps) {
  const main = location.images.find((i) => i.id === location.mainImageId) ?? location.images[0];

  const images = React.useMemo(() => {
    const ordered = [...location.images].sort((a, b) =>
      a.id === location.mainImageId ? -1 : b.id === location.mainImageId ? 1 : 0,
    );
    return ordered.filter((i) => i.url).map((i) => ({ url: i.url, alt: location.name }));
  }, [location.images, location.mainImageId, location.name]);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const archived = location.status === "archived";
  const referenced = isLocationReferenced(useResults(), location.id);

  return (
    <>
    <Card
      className={`group relative gap-0 overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:border-brand-border hover:shadow-md${
        archived ? " opacity-60" : ""
      }`}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => images.length > 0 && setLightboxOpen(true)}
          aria-label={`View ${location.name} image`}
          className="block w-full cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
        >
          <AspectFrame ratio="1:1" className="bg-muted">
            <AssetImage
              src={main?.url}
              alt={location.name}
              fallbackIcon={MapPin}
              fallbackLabel="No image uploaded"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </AspectFrame>
        </button>

        <div className="absolute top-2 right-2 rounded-md bg-background/80 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${location.name}`}>
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onUseInStudio(location)}>
                <Sparkles />
                Use in mockup
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEdit(location)}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  const next = archived ? "active" : "archived";
                  locationRepository.setStatus(location.id, next);
                  toast.success(
                    next === "active"
                      ? `${location.name} restored`
                      : `${location.name} removed from active library`,
                  );
                }}
              >
                {archived ? (
                  <>
                    <RotateCcw />
                    Restore
                  </>
                ) : (
                  <>
                    <Archive />
                    Archive
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {location.images.length > 0 && (
          <div
            className="text-foreground absolute right-2 bottom-2 flex items-center gap-1 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur"
            title={`${location.images.length} site photo${location.images.length === 1 ? "" : "s"}`}
          >
            <Images className="size-3" />
            {location.images.length}
          </div>
        )}
      </div>

      <div className="space-y-2 p-4">
        <h3 className="truncate text-sm font-semibold" title={location.name}>
          {location.name}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="muted">
            <MapPin />
            {LOCATION_USAGE_LABELS[location.usage]}
          </Badge>
          {projectName && (
            <Badge variant="outline" title={`In project: ${projectName}`}>
              <FolderKanban />
              {projectName}
            </Badge>
          )}
        </div>
        {location.description && (
          <p className="text-muted-foreground line-clamp-2 text-xs">{location.description}</p>
        )}
      </div>
    </Card>
    <ImageLightbox
      open={lightboxOpen}
      onOpenChange={setLightboxOpen}
      images={images}
      index={lightboxIndex}
      onIndexChange={setLightboxIndex}
    />
    <DeleteAssetDialog
      open={deleteOpen}
      onOpenChange={setDeleteOpen}
      assetType="Location"
      name={location.name}
      thumbnailUrl={main?.url}
      referenced={referenced}
      onArchive={() => {
        locationRepository.setStatus(location.id, "archived");
        toast.success(`${location.name} removed from active library`);
      }}
      onDelete={async () => {
        await locationRepository.deleteLocation(location.id);
        toast.success(`${location.name} deleted`);
      }}
    />
    </>
  );
}
