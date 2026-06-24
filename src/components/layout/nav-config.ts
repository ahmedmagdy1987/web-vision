import {
  Home,
  Image as ImageIcon,
  MapPin,
  Package,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

// Simplified Malahi navigation: Home holds the full mockup-generation workflow.
// "Logos" is the employee-facing label for the brand/logo library (route kept
// as /identity to avoid breaking existing deep links). Projects, Studio and any
// workspace/org concepts are intentionally absent from the normal UI.
export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: Home, description: "Generate a mockup" },
  { label: "Logos", href: "/identity", icon: Sparkles, description: "Brand logo library" },
  { label: "Products", href: "/products", icon: Package, description: "Games & equipment" },
  { label: "Locations", href: "/locations", icon: MapPin, description: "Client sites & venues" },
  { label: "Gallery", href: "/gallery", icon: ImageIcon, description: "Generated mockups" },
];

/** Whether a nav item is active for the current pathname. */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
