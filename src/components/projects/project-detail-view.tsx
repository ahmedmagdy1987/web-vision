"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Archive, ArrowLeft, FolderKanban, ImageIcon, MapPin, Package2, Palette, Pencil } from "lucide-react";
import { useBrands, useLocations, useMounted, useProducts, useProjects, useResults } from "@/lib/hooks";
import { projectRepository } from "@/lib/repositories";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { toast } from "@/components/ui/sonner";
import { ResultCard } from "@/components/gallery/result-card";
import { ProjectFormDialog } from "./project-form-dialog";
import { ProjectStatusBadge } from "./project-card";

interface AssignRowProps {
  label: string;
  sublabel?: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}

function AssignRow({ label, sublabel, checked, onToggle }: AssignRowProps) {
  return (
    <label className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors">
      <Checkbox checked={checked} onCheckedChange={(c) => onToggle(c === true)} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{label}</span>
        {sublabel && <span className="text-muted-foreground block truncate text-xs">{sublabel}</span>}
      </span>
    </label>
  );
}

export function ProjectDetailView() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const mounted = useMounted();
  const projects = useProjects();
  const brands = useBrands();
  const products = useProducts();
  const locations = useLocations();
  const results = useResults();
  const [editOpen, setEditOpen] = React.useState(false);

  const project = projects.find((p) => p.id === id) ?? null;
  const projectResults = React.useMemo(() => results.filter((r) => r.projectId === id), [results, id]);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/projects">
            <ArrowLeft className="size-4" />
            Back to projects
          </Link>
        </Button>
        <EmptyState icon={FolderKanban} title="Project not found" description="This project may have been removed." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/projects">
          <ArrowLeft className="size-4" />
          Back to projects
        </Link>
      </Button>

      <PageHeader
        title={project.name}
        description={project.clientName ? `Client · ${project.clientName}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              Edit
            </Button>
            {project.status !== "archived" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  projectRepository.setStatus(project.id, "archived");
                  toast.success(`“${project.name}” archived.`);
                }}
              >
                <Archive className="size-4" />
                Archive
              </Button>
            )}
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="brands">Brands</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="work">Generated work</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { icon: Palette, label: "Brands", value: project.brandIds.length },
              { icon: Package2, label: "Products", value: project.productIds.length },
              { icon: MapPin, label: "Locations", value: project.locationIds.length },
              { icon: ImageIcon, label: "Generated", value: projectResults.length },
            ].map((s) => (
              <Card key={s.label} className="flex flex-row items-center gap-3 p-4">
                <span className="bg-brand-subtle text-brand flex size-9 items-center justify-center rounded-lg">
                  <s.icon className="size-4" />
                </span>
                <span>
                  <span className="block text-lg font-semibold tabular-nums">{s.value}</span>
                  <span className="text-muted-foreground block text-xs">{s.label}</span>
                </span>
              </Card>
            ))}
          </div>
          {project.description && (
            <Card className="p-4">
              <h3 className="mb-1 text-sm font-semibold">Description</h3>
              <p className="text-muted-foreground text-sm">{project.description}</p>
            </Card>
          )}
          {project.notes && (
            <Card className="p-4">
              <h3 className="mb-1 text-sm font-semibold">Notes</h3>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">{project.notes}</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="brands" className="space-y-2">
          <p className="text-muted-foreground text-sm">Choose which brands are available in this project.</p>
          {brands.length === 0 ? (
            <EmptyState icon={Palette} title="No brands yet" description="Add a brand in Identity to assign it here." />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {brands.map((b) => (
                <AssignRow
                  key={b.id}
                  label={b.name}
                  checked={project.brandIds.includes(b.id)}
                  onToggle={(c) => projectRepository.assignBrand(project.id, b.id, c)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-2">
          <p className="text-muted-foreground text-sm">Choose which products are available in this project.</p>
          {products.length === 0 ? (
            <EmptyState icon={Package2} title="No products yet" description="Add products to assign them here." />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {products.map((p) => (
                <AssignRow
                  key={p.id}
                  label={p.name}
                  sublabel={p.category}
                  checked={project.productIds.includes(p.id)}
                  onToggle={(c) => projectRepository.assignProduct(project.id, p.id, c)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="locations" className="space-y-2">
          <p className="text-muted-foreground text-sm">Choose which client locations belong to this project.</p>
          {locations.length === 0 ? (
            <EmptyState icon={MapPin} title="No locations yet" description="Upload a client site in Locations to assign it here." />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {locations.map((l) => (
                <AssignRow
                  key={l.id}
                  label={l.name}
                  sublabel={l.usage === "indoor" ? "Indoor" : "Outdoor"}
                  checked={project.locationIds.includes(l.id)}
                  onToggle={(c) => projectRepository.assignLocation(project.id, l.id, c)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="work">
          {projectResults.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="No generated work yet"
              description="Generate visuals in Studio with this project selected to see them here."
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {projectResults.map((r) => (
                <ResultCard key={r.id} result={r} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} selectOnCreate={false} />
    </div>
  );
}
