/**
 * Applies a brand's accent color to the document as CSS variables so the whole
 * neutral UI adopts it. `--brand` drives `--primary`, `--ring` and all
 * brand-tinted surfaces (see globals.css); `--brand-foreground` is chosen for
 * readable contrast against the accent.
 */

export const DEFAULT_ACCENT = "#0d9488";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb | null {
  const clean = hex.replace("#", "").trim();
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  const num = parseInt(normalized, 16);
  return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
}

/** Perceived relative luminance (0–1) per WCAG. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const toLinear = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Pick a readable foreground (near-black or white) for a given accent. */
export function readableForeground(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  return relativeLuminance(rgb) > 0.55 ? "#18181b" : "#ffffff";
}

export function isValidHexColor(hex: string): boolean {
  return hexToRgb(hex) !== null;
}

/** Set the active brand accent on the document root. */
export function applyBrandAccent(accent: string | undefined | null): void {
  if (typeof document === "undefined") return;
  const value = accent && isValidHexColor(accent) ? accent : DEFAULT_ACCENT;
  const root = document.documentElement;
  root.style.setProperty("--brand", value);
  root.style.setProperty("--brand-foreground", readableForeground(value));
}
