"use client";

import Link from "next/link";
import { FolderKanban, ImageIcon, MapPin, Package2, Palette } from "lucide-react";
import type { Project, ProjectStatus } from "@/lib/domain";
import { PROJECT_STATUS_LABELS } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<ProjectStatus, "success" | "muted" | "outline" | "brand"> = {
  active: "success",
  draft: "muted",
  completed: "brand",
  archived: "outline",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className="font-normal">
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}

interface ProjectCardProps {
  project: Project;
  brandCount: number;
  productCount: number;
  locationCount: number;
  resultCount: number;
}

export function ProjectCard({ project, brandCount, productCount, locationCount, resultCount }: ProjectCardProps) {
  return (
    <div className="group bg-card text-card-foreground hover:border-brand-border focus-within:ring-ring/50 relative flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition-all hover:shadow-md focus-within:ring-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="bg-brand-subtle text-brand flex size-8 shrink-0 items-center justify-center rounded-lg">
              <FolderKanban className="size-4" />
            </span>
            <p className="truncate text-sm font-semibold">{project.name}</p>
          </div>
          {project.clientName && <p className="text-muted-foreground mt-1 truncate text-xs">{project.clientName}</p>}
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      {project.description && <p className="text-muted-foreground line-clamp-2 text-xs">{project.description}</p>}

      <div className="text-muted-foreground mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs">
        <span className="flex items-center gap-1" title="Brands">
          <Palette className="size-3.5" />
          {brandCount}
        </span>
        <span className="flex items-center gap-1" title="Products">
          <Package2 className="size-3.5" />
          {productCount}
        </span>
        <span className="flex items-center gap-1" title="Locations">
          <MapPin className="size-3.5" />
          {locationCount}
        </span>
        <span className="flex items-center gap-1" title="Generated results">
          <ImageIcon className="size-3.5" />
          {resultCount}
        </span>
      </div>

      <Link
        href={`/projects/${project.id}`}
        aria-label={`Open ${project.name}`}
        className="absolute inset-0 rounded-xl outline-none"
      />
    </div>
  );
}
