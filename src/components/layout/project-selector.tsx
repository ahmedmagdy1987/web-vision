"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, FolderKanban, Plus, SlidersHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appStore, useActiveProject, useMounted } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/** Header project context selector (replaces the global brand selector). */
export function ProjectSelector({ className }: { className?: string }) {
  const mounted = useMounted();
  const { project, projects } = useActiveProject();
  const [query, setQuery] = React.useState("");

  const selectable = projects.filter((p) => p.status !== "archived");
  const filtered = selectable.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.clientName ?? "").toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("h-9 min-w-0 justify-between gap-2 px-2 sm:max-w-[240px] sm:px-2.5", className)}
          aria-label="Select project"
        >
          <span className="flex min-w-0 items-center gap-2">
            <FolderKanban className="text-muted-foreground size-4 shrink-0" />
            <span className="hidden min-w-0 truncate text-sm font-medium sm:block">
              {mounted && project ? project.name : "Select project"}
            </span>
          </span>
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[260px]">
        <DropdownMenuLabel>Project</DropdownMenuLabel>
        <div className="px-1.5 pb-1.5">
          {/* stopPropagation keeps the dropdown typeahead from hijacking input */}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Search projects…"
            className="h-8"
            aria-label="Search projects"
          />
        </div>
        {filtered.length === 0 && (
          <p className="text-muted-foreground px-2 py-1.5 text-xs">No active projects.</p>
        )}
        <div className="max-h-64 overflow-y-auto">
          {filtered.map((p) => (
            <DropdownMenuItem key={p.id} onSelect={() => appStore.setSelectedProject(p.id)} className="gap-2">
              <FolderKanban className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {p.id === project?.id && <Check className="text-brand size-4 shrink-0" />}
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/projects">
            <SlidersHorizontal className="size-4" />
            Manage projects
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/projects?new=1">
            <Plus className="size-4" />
            New project
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
