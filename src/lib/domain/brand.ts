import type { EntityStatus, ID, ImageAsset, Timestamps } from "./common";

/** Classification of a logo asset, used to pick the right mark per context. */
export type LogoKind = "primary" | "secondary" | "icon" | "light" | "dark";

export type LogoStatus = "active" | "archived";

export interface LogoAsset extends Timestamps {
  id: ID;
  brandId: ID;
  asset: ImageAsset;
  kind: LogoKind;
  status: LogoStatus;
  /** Per-logo placement / clear-space guidance for generation. */
  instructions?: string;
}

export interface Brand extends Timestamps {
  id: ID;
  name: string;
  /** Hex accent color, e.g. "#6d28d9". Drives the dynamic UI accent. */
  accentColor: string;
  /** Short tagline / description. */
  description?: string;
  /** Brand-level generation instructions (tone, do/don't, identity rules). */
  instructions?: string;
  logos: LogoAsset[];
  /** Id of the default logo, if set. */
  defaultLogoId?: ID;
  status: EntityStatus;
}

export const LOGO_KIND_LABELS: Record<LogoKind, string> = {
  primary: "Primary",
  secondary: "Secondary",
  icon: "Icon",
  light: "Light",
  dark: "Dark",
};

/** The brand's default logo, falling back to its first logo. */
export function getDefaultLogo(brand: Brand): LogoAsset | undefined {
  return brand.logos.find((l) => l.id === brand.defaultLogoId) ?? brand.logos[0];
}
