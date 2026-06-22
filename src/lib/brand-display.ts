import { type Brand, getDefaultLogo } from "@/lib/domain";
import { brandMarkDataUrl } from "@/lib/placeholders";

/**
 * Resolve a brand's representative logo URL: its default/first logo, or a
 * generated monogram mark as a fallback. Single source of truth so every
 * surface renders the same brand mark.
 */
export function brandLogoUrl(brand: Brand): string {
  return getDefaultLogo(brand)?.asset.url ?? brandMarkDataUrl(brand.name, brand.accentColor, "primary");
}
