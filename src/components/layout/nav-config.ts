import { Home, Image as ImageIcon, Package, Palette, Wand2, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: Home, description: "Overview & quick start" },
  { label: "Identity", href: "/identity", icon: Palette, description: "Brands & logo assets" },
  { label: "Products", href: "/products", icon: Package, description: "Product catalog" },
  { label: "Studio", href: "/studio", icon: Wand2, description: "Compose & generate" },
  { label: "Gallery", href: "/gallery", icon: ImageIcon, description: "Generation history" },
];

/** Whether a nav item is active for the current pathname. */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
