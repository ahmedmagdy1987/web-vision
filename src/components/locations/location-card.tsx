"use client";

import { FolderKanban, Images, MapPin, MoreVertical, Pencil, Sparkles } from "lucide-react";
import type { Location } from "@/lib/domain";
import { LOCATION_USAGE_LABELS } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AspectFrame } from "@/components/common/aspect-frame";
import { AssetImage } from "@/components/common/asset-image";

interface LocationCardProps {
  location: Location;
  projectName?: string;
  onEdit: (location: Location) => void;
  onUseInStudio: (location: Location) => void;
}

export function LocationCard({ location, projectName, onEdit, onUseInStudio }: LocationCardProps) {
  const main = location.images.find((i) => i.id === location.mainImageId) ?? location.images[0];

  return (
    <Card className="group relative gap-0 overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:border-brand-border hover:shadow-md">
      <div className="relative">
        <AspectFrame ratio="4:3" className="bg-muted">
          <AssetImage
            src={main?.url}
            alt={location.name}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </AspectFrame>

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
                Use in Studio
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEdit(location)}>
                <Pencil />
                Edit
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
  );
}
