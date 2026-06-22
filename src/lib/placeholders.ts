/**
 * Deterministic SVG placeholder generators returned as data URLs. Used to seed
 * demo brands/products/locations, to render mock generation previews, and as a
 * fallback when an image asset is missing — keeping the prototype free of any
 * binary assets or external requests. All scene/product placeholders are clearly
 * marked as placeholders.
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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

/** Small "Placeholder" tag in the top-right corner of a scene/product image. */
function placeholderTag(width: number): string {
  const w = Math.max(150, width * 0.16);
  const h = w * 0.3;
  const x = width - w - width * 0.03;
  const y = width * 0.03;
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#000000" fill-opacity="0.32"/>
    <text x="${x + w / 2}" y="${y + h / 2}" dy="0.34em" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="${h * 0.46}" font-weight="700" letter-spacing="2" fill="#ffffff" fill-opacity="0.92">PLACEHOLDER</text>
  </g>`;
}

/** Category-specific white silhouette centered at (cx, cy) within size s. */
function categoryGlyph(category: string, cx: number, cy: number, s: number): string {
  const c = category.toLowerCase();
  const solid = `fill="#ffffff" fill-opacity="0.9"`;
  const line = `fill="none" stroke="#ffffff" stroke-opacity="0.9" stroke-width="${s * 0.045}" stroke-linejoin="round" stroke-linecap="round"`;
  const shadow = `fill="#000000" fill-opacity="0.18"`;

  if (c.includes("arcade")) {
    const w = s * 0.62,
      ht = s * 0.96,
      x = cx - w / 2,
      y = cy - ht / 2;
    return `<rect x="${x}" y="${y}" width="${w}" height="${ht}" rx="${s * 0.07}" ${solid}/>
      <rect x="${x + w * 0.12}" y="${y + ht * 0.12}" width="${w * 0.76}" height="${ht * 0.32}" rx="${s * 0.03}" ${shadow}/>
      <rect x="${x + w * 0.2}" y="${y + ht * 0.55}" width="${w * 0.6}" height="${ht * 0.07}" rx="${s * 0.02}" ${shadow}/>
      <circle cx="${cx - w * 0.16}" cy="${y + ht * 0.74}" r="${s * 0.045}" ${shadow}/>
      <circle cx="${cx + w * 0.16}" cy="${y + ht * 0.74}" r="${s * 0.045}" ${shadow}/>`;
  }
  if (c.includes("sim")) {
    // motion seat + curved screen
    return `<path d="M ${cx - s * 0.5} ${cy - s * 0.45} A ${s * 0.62} ${s * 0.62} 0 0 1 ${cx + s * 0.5} ${cy - s * 0.45}" ${line}/>
      <path d="M ${cx - s * 0.2} ${cy + s * 0.5} L ${cx - s * 0.18} ${cy - s * 0.05} Q ${cx - s * 0.16} ${cy - s * 0.2} ${cx + s * 0.02} ${cy - s * 0.2} L ${cx + s * 0.22} ${cy - s * 0.2} L ${cx + s * 0.22} ${cy + s * 0.06} L ${cx + s * 0.02} ${cy + s * 0.06} L ${cx + s * 0.04} ${cy + s * 0.5} Z" ${solid}/>`;
  }
  if (c.includes("redemption")) {
    const w = s * 0.42,
      x = cx - w / 2,
      yTop = cy - s * 0.5;
    return `<rect x="${x}" y="${yTop}" width="${w}" height="${s}" rx="${s * 0.05}" ${solid}/>
      ${[0.18, 0.36, 0.54, 0.72].map((t) => `<rect x="${x + w * 0.18}" y="${yTop + s * t}" width="${w * 0.64}" height="${s * 0.07}" rx="${s * 0.02}" ${shadow}/>`).join("")}
      <path d="M ${cx} ${yTop - s * 0.18} l ${s * 0.07} ${s * 0.14} l ${s * 0.15} 0.02 l -${s * 0.12} ${s * 0.1} l ${s * 0.05} ${s * 0.15} l -${s * 0.15} -${s * 0.09} l -${s * 0.15} ${s * 0.09} l ${s * 0.05} -${s * 0.15} l -${s * 0.12} -${s * 0.1} l ${s * 0.15} -0.02 Z" ${solid}/>`;
  }
  if (c.includes("ride")) {
    // ferris wheel
    const r = s * 0.5;
    const spokes = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * r}" y2="${cy + Math.sin(a) * r}" ${line}/><circle cx="${cx + Math.cos(a) * r}" cy="${cy + Math.sin(a) * r}" r="${s * 0.07}" ${solid}/>`;
    }).join("");
    return `<circle cx="${cx}" cy="${cy}" r="${r}" ${line}/>${spokes}<circle cx="${cx}" cy="${cy}" r="${s * 0.08}" ${solid}/>`;
  }
  if (c.includes("soft")) {
    // stacked rounded blocks + slide
    return `<rect x="${cx - s * 0.5}" y="${cy + s * 0.1}" width="${s * 0.45}" height="${s * 0.4}" rx="${s * 0.08}" ${solid}/>
      <rect x="${cx - s * 0.42}" y="${cy - s * 0.25}" width="${s * 0.32}" height="${s * 0.35}" rx="${s * 0.07}" ${solid}/>
      <path d="M ${cx - s * 0.05} ${cy - s * 0.35} L ${cx - s * 0.05} ${cy + s * 0.1} Q ${cx - s * 0.05} ${cy + s * 0.5} ${cx + s * 0.5} ${cy + s * 0.5}" ${line}/>`;
  }
  if (c.includes("vr")) {
    // headset
    const w = s,
      ht = s * 0.5,
      x = cx - w / 2,
      y = cy - ht / 2;
    return `<rect x="${x}" y="${y}" width="${w}" height="${ht}" rx="${ht * 0.4}" ${solid}/>
      <path d="M ${x + w * 0.42} ${y + ht} q ${w * 0.08} ${ht * 0.5} ${w * 0.16} 0" fill="none" stroke="#000" stroke-opacity="0.18" stroke-width="${s * 0.05}"/>
      <path d="M ${x} ${y + ht * 0.3} q -${s * 0.16} ${ht * 0.2} 0 ${ht * 0.5}" ${line}/>
      <path d="M ${x + w} ${y + ht * 0.3} q ${s * 0.16} ${ht * 0.2} 0 ${ht * 0.5}" ${line}/>`;
  }
  if (c.includes("sport")) {
    // ball with seams
    const r = s * 0.5;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" ${solid}/>
      <path d="M ${cx - r} ${cy} h ${2 * r} M ${cx} ${cy - r} v ${2 * r}" stroke="#000" stroke-opacity="0.18" stroke-width="${s * 0.05}" fill="none"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.5}" stroke="#000" stroke-opacity="0.18" stroke-width="${s * 0.05}" fill="none"/>`;
  }
  // default: simple boxed product
  return `<rect x="${cx - s * 0.45}" y="${cy - s * 0.4}" width="${s * 0.9}" height="${s * 0.8}" rx="${s * 0.08}" ${solid}/>
    <line x1="${cx - s * 0.45}" y1="${cy - s * 0.12}" x2="${cx + s * 0.45}" y2="${cy - s * 0.12}" stroke="#000" stroke-opacity="0.18" stroke-width="${s * 0.05}"/>`;
}

/** Generate a category-aware product placeholder (4:3) as an SVG data URL. */
export function productPlaceholderDataUrl(options: {
  name: string;
  category: string;
  accent?: string;
  width?: number;
  height?: number;
}): string {
  const { name, category, accent = "#6d28d9", width = 1200, height = 900 } = options;
  const c1 = shade(accent, 24);
  const c2 = shade(accent, -32);
  const s = Math.min(width, height) * 0.42;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs><linearGradient id="bg" gradientTransform="rotate(35)"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    ${categoryGlyph(category, width / 2, height * 0.46, s)}
    <text x="${width * 0.04}" y="${height * 0.12}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="${height * 0.05}" font-weight="600" fill="#ffffff" fill-opacity="0.85">${escapeXml(category)}</text>
    <text x="${width * 0.04}" y="${height - height * 0.07}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="${height * 0.07}" font-weight="700" fill="#ffffff" fill-opacity="0.95">${escapeXml(name)}</text>
    ${placeholderTag(width)}
  </svg>`;
  return toDataUrl(svg);
}

/** Generate a soft gradient scene placeholder (locations, results). */
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
    const x = (seed * 53 + i * 137) % width;
    const y = (seed * 97 + i * 211) % height;
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
    ${placeholderTag(width)}
  </svg>`;
  return toDataUrl(svg);
}
