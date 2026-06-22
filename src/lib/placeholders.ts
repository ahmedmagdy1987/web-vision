/**
 * Deterministic SVG placeholder generators returned as data URLs. Used to seed
 * demo brands/products/locations, to render mock generation previews, and as a
 * fallback when an image asset is missing — keeping the prototype free of any
 * binary assets or external requests.
 */

function toDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
}

/** Derive up to two uppercase initials from a name. */
export function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Lighten/darken a hex color by a percentage (-100..100). */
function shade(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean.padEnd(6, "0").slice(0, 6);
  const num = parseInt(normalized, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export type LogoVariant = "primary" | "secondary" | "icon" | "light" | "dark";

/** Generate a branded monogram logo as an SVG data URL. */
export function brandMarkDataUrl(name: string, accent: string, variant: LogoVariant = "primary"): string {
  const initials = initialsFromName(name);
  const light = shade(accent, 28);
  const dark = shade(accent, -26);

  let bg = `<rect width="240" height="240" rx="52" fill="url(#g)"/>`;
  let textFill = "#ffffff";
  let gradient = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient>`;
  let extra = "";

  if (variant === "light") {
    bg = `<rect width="240" height="240" rx="52" fill="#f4f4f5"/>`;
    textFill = accent;
  } else if (variant === "dark") {
    bg = `<rect width="240" height="240" rx="52" fill="#18181b"/>`;
    textFill = light;
  } else if (variant === "secondary") {
    gradient = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dark}"/><stop offset="1" stop-color="${accent}"/></linearGradient>`;
  } else if (variant === "icon") {
    bg = `<circle cx="120" cy="120" r="116" fill="url(#g)"/>`;
    extra = `<circle cx="120" cy="120" r="92" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="4"/>`;
  }

  const isIcon = variant === "icon";
  const display = isIcon ? initials.slice(0, 1) : initials;
  const fontSize = isIcon ? 96 : 92;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
    <defs>${gradient}</defs>
    ${bg}
    ${extra}
    <text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="${textFill}" letter-spacing="2">${display}</text>
  </svg>`;
  return toDataUrl(svg);
}

/** Generate a soft gradient scene placeholder (locations, products, results). */
export function scenePlaceholderDataUrl(options: {
  label?: string;
  sublabel?: string;
  accent?: string;
  width?: number;
  height?: number;
  seed?: number;
}): string {
  const { label = "", sublabel = "", accent = "#6d28d9", width = 1200, height = 900, seed = 1 } = options;
  const c1 = shade(accent, 30);
  const c2 = shade(accent, -34);
  const angle = (seed % 6) * 30;
  const dots = Array.from({ length: 7 }, (_, i) => {
    const x = ((seed * 53 + i * 137) % width);
    const y = ((seed * 97 + i * 211) % height);
    const r = 40 + ((seed + i * 31) % 90);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" fill-opacity="0.05"/>`;
  }).join("");

  const labelMarkup = label
    ? `<text x="60" y="${height - 90}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="46" font-weight="700" fill="#ffffff" fill-opacity="0.95">${escapeXml(label)}</text>`
    : "";
  const subMarkup = sublabel
    ? `<text x="60" y="${height - 44}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="28" font-weight="500" fill="#ffffff" fill-opacity="0.7">${escapeXml(sublabel)}</text>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <linearGradient id="bg" gradientTransform="rotate(${angle})"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    ${dots}
    ${labelMarkup}
    ${subMarkup}
  </svg>`;
  return toDataUrl(svg);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
