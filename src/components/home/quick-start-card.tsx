"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPin, Wand2 } from "lucide-react";
import type { AspectRatio, Brand, Location, VisualizationType } from "@/lib/domain";
import {
  ASPECT_RATIO_OPTIONS,
  DEFAULT_GENERATION_SETTINGS,
  VISUALIZATION_TYPE_OPTIONS,
} from "@/lib/domain";
import { useLocations } from "@/lib/hooks";
import { studioPrefill } from "@/lib/store/studio-draft";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const NO_LOCATION = "__none__";

interface QuickStartCardProps {
  brand: Brand | null;
}

export function QuickStartCard({ brand }: QuickStartCardProps) {
  const locations = useLocations();
  const router = useRouter();

  const [locationId, setLocationId] = useState<string>(NO_LOCATION);
  const [visualizationType, setVisualizationType] = useState<VisualizationType>(
    DEFAULT_GENERATION_SETTINGS.visualizationType,
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    DEFAULT_GENERATION_SETTINGS.aspectRatio,
  );

  const savedLocations: Location[] = locations.filter((l) => l.saved);

  function openInStudio() {
    studioPrefill.set({
      brandId: brand?.id,
      locationId: locationId === NO_LOCATION ? undefined : locationId,
      settings: { visualizationType, aspectRatio },
      source: "home-quick-start",
    });
    router.push("/studio");
  }

  return (
    <Card className="overflow-hidden border-brand-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-brand-subtle text-brand">
            <Wand2 className="size-4" />
          </span>
          <div>
            <CardTitle className="text-base">Quick start</CardTitle>
            <CardDescription>Pick a setup and jump straight into Studio.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="qs-location">Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger id="qs-location" aria-label="Location">
                <SelectValue placeholder="Choose a location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_LOCATION}>
                  <span className="text-muted-foreground">No location (set in Studio)</span>
                </SelectItem>
                {savedLocations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    <MapPin className="size-3.5 opacity-60" />
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visualization type */}
          <div className="space-y-1.5">
            <Label htmlFor="qs-viz">Visualization type</Label>
            <Select
              value={visualizationType}
              onValueChange={(v) => setVisualizationType(v as VisualizationType)}
            >
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
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                aria-label={`${option.label} ${option.description ?? ""}`.trim()}
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <Button onClick={openInStudio} size="lg" className="w-full">
          Open in Studio
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
