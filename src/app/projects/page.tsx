"use client";

import * as React from "react";
import { FolderKanban, FolderPlus } from "lucide-react";
import type { ProjectStatus } from "@/lib/domain";
import { useMounted, useProjects, useResults } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";

type StatusFilter = ProjectStatus | "all";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

export default function ProjectsPage() {
  const mounted = useMounted();
  const projects = useProjects();
  const results = useResults();
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<StatusFilter>("active");
  const [createOpen, setCreateOpen] = React.useState(false);

  const counts = React.useMemo(() => {
    const c: Record<StatusFilter, number> = { active: 0, draft: 0, completed: 0, archived: 0, all: projects.length };
    for (const p of projects) c[p.status] += 1;
    return c;
  }, [projects]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter(
      (p) =>
        (filter === "all" || p.status === filter) &&
        (!q || p.name.toLowerCase().includes(q) || (p.clientName ?? "").toLowerCase().includes(q)),
    );
  }, [projects, search, filter]);

  const resultCountFor = React.useCallback(
    (projectId: string) => results.filter((r) => r.projectId === projectId).length,
    [results],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Organize brands, products, locations, and generated work by client engagement."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <FolderPlus />
            New project
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Search projects…"
          containerClassName="sm:max-w-xs"
        />
        <div className="text-muted-foreground inline-flex h-9 w-fit items-center rounded-lg bg-muted p-1">
          {FILTERS.map((f) => {
            const selected = filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={selected}
                className={cn(
                  "focus-visible:ring-ring/50 inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-2",
                  selected ? "bg-background text-foreground shadow-sm" : "hover:text-foreground",
                )}
              >
                {f.label}
                <span className="text-[11px] tabular-nums opacity-70">{counts[f.value]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!mounted ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={projects.length === 0 ? "No projects yet" : "No projects match"}
          description={
            projects.length === 0
              ? "Create your first project to start organizing assets and visualizations."
              : "Try a different search or status filter."
          }
          action={
            projects.length === 0 ? (
              <Button onClick={() => setCreateOpen(true)}>
                <FolderPlus />
                New project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              brandCount={p.brandIds.length}
              productCount={p.productIds.length}
              locationCount={p.locationIds.length}
              resultCount={resultCountFor(p.id)}
            />
          ))}
        </div>
      )}

      <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
