"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, FolderKanban, MapPin, Wand2 } from "lucide-react";
import type { AspectRatio, VisualizationType } from "@/lib/domain";
import {
  ASPECT_RATIO_OPTIONS,
  DEFAULT_GENERATION_SETTINGS,
  LOGO_KIND_LABELS,
  VISUALIZATION_TYPE_OPTIONS,
  getDefaultLogo,
} from "@/lib/domain";
import { appStore, useActiveProject, useBrands, useLocations, useMounted, useProducts } from "@/lib/hooks";
import { studioPrefill } from "@/lib/store/studio-draft";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const NONE = "__none__";

/** Explanatory empty-dropdown state with a direct action — never a blank select. */
function EmptyHint({ message, href, action }: { message: string; href: string; action: string }) {
  return (
    <div className="border-border bg-muted/30 text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
      {message}{" "}
      <Link href={href} className="text-brand font-medium underline-offset-2 hover:underline">
        {action}
      </Link>
    </div>
  );
}

export function QuickStartCard() {
  const mounted = useMounted();
  const router = useRouter();
  const { project, projects } = useActiveProject();
  const brands = useBrands();
  const products = useProducts();
  const locations = useLocations();

  const [brandId, setBrandId] = useState<string | null>(null);
  const [logoId, setLogoId] = useState<string>(NONE);
  const [productId, setProductId] = useState<string>(NONE);
  const [locationId, setLocationId] = useState<string>(NONE);
  const [visualizationType, setVisualizationType] = useState<VisualizationType>(
    DEFAULT_GENERATION_SETTINGS.visualizationType,
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(DEFAULT_GENERATION_SETTINGS.aspectRatio);
  const [notes, setNotes] = useState("");

  const selectableProjects = projects.filter((p) => p.status !== "archived");

  // Options cascade from the active project's assigned assets.
  const projectBrands = brands.filter((b) => b.status === "active" && !!project && project.brandIds.includes(b.id));
  const effectiveBrandId = projectBrands.some((b) => b.id === brandId) ? brandId : (projectBrands[0]?.id ?? null);
  const effectiveBrand = projectBrands.find((b) => b.id === effectiveBrandId) ?? null;

  const logos = effectiveBrand ? effectiveBrand.logos.filter((l) => l.status === "active") : [];
  const defaultLogoId = effectiveBrand ? (getDefaultLogo(effectiveBrand)?.id ?? NONE) : NONE;
  const effectiveLogoId = logos.some((l) => l.id === logoId) ? logoId : defaultLogoId;

  const projectProducts = products.filter(
    (p) => p.status === "active" && p.brandId === effectiveBrandId && !!project && project.productIds.includes(p.id),
  );
  const effectiveProductId = projectProducts.some((p) => p.id === productId) ? productId : NONE;

  const projectLocations = locations.filter((l) => l.saved && !!project && project.locationIds.includes(l.id));
  const effectiveLocationId = projectLocations.some((l) => l.id === locationId) ? locationId : NONE;

  const missing: string[] = [];
  if (!project) missing.push("a project");
  else {
    if (!effectiveBrandId) missing.push("a brand");
    if (effectiveProductId === NONE) missing.push("a product");
    if (effectiveLocationId === NONE) missing.push("a location");
  }
  const ready = missing.length === 0;

  function continueInStudio() {
    if (!ready || !project) return;
    appStore.setSelectedProject(project.id);
    studioPrefill.set({
      brandId: effectiveBrandId ?? undefined,
      logoId: effectiveLogoId === NONE ? undefined : effectiveLogoId,
      productIds: effectiveProductId === NONE ? undefined : [effectiveProductId],
      locationId: effectiveLocationId === NONE ? undefined : effectiveLocationId,
      settings: { visualizationType, aspectRatio },
      notes: notes.trim() || undefined,
      source: "home-quick-start",
    });
    router.push("/studio");
  }

  return (
    <Card className="border-brand-border overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="bg-brand-subtle text-brand flex size-8 items-center justify-center rounded-md">
            <Wand2 className="size-4" />
          </span>
          <div>
            <CardTitle className="text-base">Quick create</CardTitle>
            <CardDescription>Pick a project and the essentials, then continue into Studio.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!mounted ? (
          <div className="space-y-4">
            <Skeleton className="h-9 w-full rounded-md" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ) : selectableProjects.length === 0 ? (
          <EmptyHint message="No projects available." href="/projects" action="Create a project first" />
        ) : (
          <>
            {/* Project */}
            <div className="space-y-1.5">
              <Label htmlFor="qs-project">Project</Label>
              <Select value={project?.id} onValueChange={(id) => appStore.setSelectedProject(id)}>
                <SelectTrigger id="qs-project" aria-label="Project">
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {selectableProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <FolderKanban className="size-3.5 opacity-60" />
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Brand */}
              <div className="space-y-1.5">
                <Label htmlFor="qs-brand">Brand</Label>
                {projectBrands.length === 0 ? (
                  <EmptyHint message="No brands available for this project." href="/identity" action="Add a brand in Identity" />
                ) : (
                  <Select value={effectiveBrandId ?? undefined} onValueChange={setBrandId}>
                    <SelectTrigger id="qs-brand" aria-label="Brand">
                      <SelectValue placeholder="Choose a brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectBrands.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          <span className="size-3 rounded-full" style={{ backgroundColor: b.accentColor }} />
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Logo (optional) */}
              <div className="space-y-1.5">
                <Label htmlFor="qs-logo">Logo</Label>
                {logos.length === 0 ? (
                  <EmptyHint message="No logos on this brand." href="/identity" action="Add logos in Identity" />
                ) : (
                  <Select value={effectiveLogoId} onValueChange={setLogoId}>
                    <SelectTrigger id="qs-logo" aria-label="Logo">
                      <SelectValue placeholder="Default logo" />
                    </SelectTrigger>
                    <SelectContent>
                      {logos.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {LOGO_KIND_LABELS[l.kind]}
                          {l.id === defaultLogoId ? " · default" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Product */}
              <div className="space-y-1.5">
                <Label htmlFor="qs-product">Product</Label>
                {projectProducts.length === 0 ? (
                  <EmptyHint message="No products available for this project." href="/products" action="Add products in Products" />
                ) : (
                  <Select value={effectiveProductId === NONE ? undefined : effectiveProductId} onValueChange={setProductId}>
                    <SelectTrigger id="qs-product" aria-label="Product">
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectProducts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <Label htmlFor="qs-location">Location</Label>
                {projectLocations.length === 0 ? (
                  <EmptyHint message="No locations available for this project." href="/locations" action="Add a location in Locations" />
                ) : (
                  <Select value={effectiveLocationId === NONE ? undefined : effectiveLocationId} onValueChange={setLocationId}>
                    <SelectTrigger id="qs-location" aria-label="Location">
                      <SelectValue placeholder="Choose a location" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectLocations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          <MapPin className="size-3.5 opacity-60" />
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Visualization type */}
              <div className="space-y-1.5">
                <Label htmlFor="qs-viz">Visualization type</Label>
                <Select value={visualizationType} onValueChange={(v) => setVisualizationType(v as VisualizationType)}>
                  <SelectTrigger id="qs-viz" aria-label="Visualization type">
                    <SelectValue placeholder="Choose a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {VISUALIZATION_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Aspect ratio */}
            <div className="space-y-1.5">
              <Label>Aspect ratio</Label>
              <ToggleGroup
                type="single"
                value={aspectRatio}
                onValueChange={(v) => {
                  if (v) setAspectRatio(v as AspectRatio);
                }}
                className="flex w-full flex-wrap"
                aria-label="Aspect ratio"
              >
                {ASPECT_RATIO_OPTIONS.map((option) => (
                  <ToggleGroupItem key={option.value} value={option.value} aria-label={`${option.label} ${option.description ?? ""}`.trim()}>
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="qs-notes">Notes (optional)</Label>
              <Textarea
                id="qs-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything specific for this visualization…"
                rows={2}
              />
            </div>

            <Button onClick={continueInStudio} size="lg" className="w-full" disabled={!ready}>
              Continue in Studio
              <ArrowRight className="size-4" />
            </Button>
            {!ready && (
              <p className="text-muted-foreground text-center text-xs">Select {missing.join(", ")} to continue.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
