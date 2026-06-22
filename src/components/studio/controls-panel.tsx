"use client";

import type { GenerationSettings } from "@/lib/domain";
import {
  ASPECT_RATIO_OPTIONS,
  BRAND_VISIBILITY_OPTIONS,
  CAMERA_ANGLE_OPTIONS,
  ENVIRONMENT_TYPE_OPTIONS,
  LIGHTING_OPTIONS,
  MAX_OUTPUT_COUNT,
  MIN_OUTPUT_COUNT,
  PEOPLE_IN_SCENE_OPTIONS,
  PLACEMENT_OPTIONS,
  PRODUCT_SCALE_OPTIONS,
  VISUAL_STYLE_OPTIONS,
  VISUALIZATION_TYPE_OPTIONS,
  creativityLabel,
} from "@/lib/domain";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ControlField, SegmentedControl, SettingSelect } from "./control-primitives";

interface ControlsPanelProps {
  settings: GenerationSettings;
  onChange: (patch: Partial<GenerationSettings>) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">{children}</h3>;
}

function SwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
      <span className="space-y-0.5">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="text-muted-foreground block text-xs">{description}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}

const OUTPUT_OPTIONS = Array.from({ length: MAX_OUTPUT_COUNT - MIN_OUTPUT_COUNT + 1 }, (_, i) => MIN_OUTPUT_COUNT + i);

export function ControlsPanel({ settings, onChange, notes, onNotesChange }: ControlsPanelProps) {
  return (
    <section aria-label="Generation controls" className="space-y-5">
      <div className="space-y-4">
        <GroupTitle>Composition</GroupTitle>
        <ControlField label="Visualization type" htmlFor="ctl-viz">
          <SettingSelect
            id="ctl-viz"
            value={settings.visualizationType}
            onChange={(v) => onChange({ visualizationType: v })}
            options={VISUALIZATION_TYPE_OPTIONS}
          />
        </ControlField>
        <div className="grid grid-cols-2 gap-3">
          <ControlField label="Placement" htmlFor="ctl-place">
            <SettingSelect id="ctl-place" value={settings.placement} onChange={(v) => onChange({ placement: v })} options={PLACEMENT_OPTIONS} />
          </ControlField>
          <ControlField label="Camera angle" htmlFor="ctl-cam">
            <SettingSelect id="ctl-cam" value={settings.cameraAngle} onChange={(v) => onChange({ cameraAngle: v })} options={CAMERA_ANGLE_OPTIONS} />
          </ControlField>
        </div>
        <ControlField label="Environment" htmlFor="ctl-env">
          <SettingSelect id="ctl-env" value={settings.environmentType} onChange={(v) => onChange({ environmentType: v })} options={ENVIRONMENT_TYPE_OPTIONS} />
        </ControlField>
      </div>

      <Separator />

      <div className="space-y-4">
        <GroupTitle>Style &amp; light</GroupTitle>
        <div className="grid grid-cols-2 gap-3">
          <ControlField label="Visual style" htmlFor="ctl-style">
            <SettingSelect id="ctl-style" value={settings.visualStyle} onChange={(v) => onChange({ visualStyle: v })} options={VISUAL_STYLE_OPTIONS} />
          </ControlField>
          <ControlField label="Lighting" htmlFor="ctl-light">
            <SettingSelect id="ctl-light" value={settings.lighting} onChange={(v) => onChange({ lighting: v })} options={LIGHTING_OPTIONS} />
          </ControlField>
        </div>
        <ControlField label="Creativity" valueLabel={`${creativityLabel(settings.creativity)} · ${settings.creativity}`}>
          <Slider
            value={[settings.creativity]}
            min={0}
            max={100}
            step={5}
            onValueChange={([v]) => onChange({ creativity: v })}
            aria-label="Creativity level"
          />
        </ControlField>
      </div>

      <Separator />

      <div className="space-y-4">
        <GroupTitle>Output</GroupTitle>
        <ControlField label="Aspect ratio">
          <SegmentedControl
            value={settings.aspectRatio}
            onChange={(v) => onChange({ aspectRatio: v })}
            options={ASPECT_RATIO_OPTIONS}
          />
        </ControlField>
        <div className="grid grid-cols-2 gap-3">
          <ControlField label="Outputs">
            <ToggleGroup
              type="single"
              size="sm"
              value={String(settings.outputCount)}
              onValueChange={(v) => v && onChange({ outputCount: Number(v) })}
              className="flex w-full"
              aria-label="Output count"
            >
              {OUTPUT_OPTIONS.map((n) => (
                <ToggleGroupItem key={n} value={String(n)} className="flex-1" aria-label={`${n} outputs`}>
                  {n}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </ControlField>
          <ControlField label="People in scene" htmlFor="ctl-people">
            <SettingSelect id="ctl-people" value={settings.peopleInScene} onChange={(v) => onChange({ peopleInScene: v })} options={PEOPLE_IN_SCENE_OPTIONS} />
          </ControlField>
        </div>
        <ControlField label="Product scale">
          <SegmentedControl value={settings.productScale} onChange={(v) => onChange({ productScale: v })} options={PRODUCT_SCALE_OPTIONS} />
        </ControlField>
        <ControlField label="Brand visibility">
          <SegmentedControl value={settings.brandVisibility} onChange={(v) => onChange({ brandVisibility: v })} options={BRAND_VISIBILITY_OPTIONS} />
        </ControlField>
      </div>

      <Separator />

      <div className="space-y-3">
        <GroupTitle>Scene rules</GroupTitle>
        <SwitchRow
          label="Preserve architecture"
          description="Keep the location's structure intact"
          checked={settings.preserveArchitecture}
          onChange={(v) => onChange({ preserveArchitecture: v })}
        />
        <SwitchRow
          label="Remove existing objects"
          description="Clear clutter from the scene"
          checked={settings.removeExistingObjects}
          onChange={(v) => onChange({ removeExistingObjects: v })}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="ctl-notes">Notes (optional)</Label>
        <Textarea
          id="ctl-notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Any extra direction for this generation…"
          className="min-h-20"
        />
      </div>
    </section>
  );
}
