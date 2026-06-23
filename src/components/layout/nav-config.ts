import {
  FolderKanban,
  Home,
  Image as ImageIcon,
  MapPin,
  Package,
  Palette,
  Wand2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: Home, description: "Overview & quick start" },
  { label: "Projects", href: "/projects", icon: FolderKanban, description: "Client engagements & work" },
  { label: "Identity", href: "/identity", icon: Palette, description: "Brands & logo assets" },
  { label: "Products", href: "/products", icon: Package, description: "Games & equipment" },
  { label: "Locations", href: "/locations", icon: MapPin, description: "Client sites & venues" },
  { label: "Studio", href: "/studio", icon: Wand2, description: "Compose & generate" },
  { label: "Gallery", href: "/gallery", icon: ImageIcon, description: "Generation history" },
];

/** Whether a nav item is active for the current pathname. */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
