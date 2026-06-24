"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, MapPin, Package, Search, Sparkles } from "lucide-react";
import { appStore, useBrands, useLocations, useProducts, useResults } from "@/lib/hooks";
import { studioPrefill } from "@/lib/store/studio-draft";
import { AssetImage } from "@/components/common/asset-image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchHit {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const brands = useBrands();
  const products = useProducts();
  const locations = useLocations();
  const results = useResults();

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const term = query.trim().toLowerCase();
  const has = (value: string | undefined) => (value ?? "").toLowerCase().includes(term);

  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const navigate = (fn: () => void) => {
    fn();
    close();
  };

  const brandHits: SearchHit[] = term
    ? brands
        .filter((b) => has(b.name) || has(b.description))
        .slice(0, 5)
        .map((b) => ({
          id: b.id,
          title: b.name,
          subtitle: b.status === "archived" ? "Logo · archived" : "Logo",
          icon: <span className="size-3 rounded-full" style={{ backgroundColor: b.accentColor }} />,
          onSelect: () =>
            navigate(() => {
              appStore.setSelectedBrand(b.id);
              router.push("/identity");
            }),
        }))
    : [];

  const productHits: SearchHit[] = term
    ? products
        .filter((p) => has(p.name) || has(p.category) || p.tags.some(has))
        .slice(0, 6)
        .map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: `Product · ${p.category}`,
          icon: <Package className="size-4" />,
          onSelect: () =>
            navigate(() => {
              appStore.setSelectedBrand(p.brandId);
              router.push("/products");
            }),
        }))
    : [];

  const locationHits: SearchHit[] = term
    ? locations
        .filter((l) => has(l.name))
        .slice(0, 5)
        .map((l) => ({
          id: l.id,
          title: l.name,
          subtitle: `Location · ${l.usage}`,
          icon: <MapPin className="size-4" />,
          onSelect: () =>
            navigate(() => {
              studioPrefill.set({ locationId: l.id, brandId: l.brandId, source: "search" });
              router.push("/");
            }),
        }))
    : [];

  const resultHits: SearchHit[] = term
    ? results
        .filter((r) => has(r.snapshot.brandName) || has(r.snapshot.locationName) || r.snapshot.productNames.some(has))
        .slice(0, 6)
        .map((r) => ({
          id: r.id,
          title: r.snapshot.brandName,
          subtitle: `Mockup · ${r.snapshot.locationName ?? "result"}`,
          icon: (
            <span className="bg-muted size-6 shrink-0 overflow-hidden rounded">
              <AssetImage src={r.image.url} alt="" className="size-full object-cover" />
            </span>
          ),
          onSelect: () => navigate(() => router.push(`/gallery/${r.id}`)),
        }))
    : [];

  const groups: { label: string; icon: React.ReactNode; hits: SearchHit[] }[] = [
    { label: "Logos", icon: <Sparkles className="size-3.5" />, hits: brandHits },
    { label: "Products", icon: <Package className="size-3.5" />, hits: productHits },
    { label: "Locations", icon: <MapPin className="size-3.5" />, hits: locationHits },
    { label: "Gallery", icon: <ImageIcon className="size-3.5" />, hits: resultHits },
  ].filter((g) => g.hits.length > 0);

  const totalHits = groups.reduce((sum, g) => sum + g.hits.length, 0);

  return (
    <>
      {/* Desktop trigger (search-box style) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:bg-accent/50 ml-1 hidden h-9 max-w-md flex-1 items-center gap-2 rounded-md border bg-background px-3 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:flex"
        aria-label="Search logos, products, locations and gallery"
      >
        <Search className="size-4" />
        <span>Search…</span>
        <kbd className="bg-muted text-muted-foreground ml-auto hidden rounded px-1.5 py-0.5 text-[10px] font-medium lg:inline">
          ⌘K
        </kbd>
      </button>

      {/* Mobile trigger (icon) */}
      <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Search" onClick={() => setOpen(true)}>
        <Search className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showClose={false} className="top-[12%] max-w-xl translate-y-0 gap-0 p-0">
          <DialogTitle className="sr-only">Global search</DialogTitle>
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="text-muted-foreground size-4 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search logos, products, locations, gallery…"
              className="placeholder:text-muted-foreground h-12 w-full bg-transparent text-sm outline-none"
              aria-label="Search query"
            />
          </div>

          <div className="max-h-[60dvh] overflow-y-auto p-2">
            {term.length === 0 ? (
              <p className="text-muted-foreground px-2 py-6 text-center text-sm">
                Search across logos, products, locations and gallery.
              </p>
            ) : totalHits === 0 ? (
              <p className="text-muted-foreground px-2 py-6 text-center text-sm">No matches for “{query}”.</p>
            ) : (
              groups.map((group) => (
                <div key={group.label} className="mb-1">
                  <p className="text-muted-foreground flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium">
                    {group.icon}
                    {group.label}
                  </p>
                  <ul>
                    {group.hits.map((hit) => (
                      <li key={hit.id}>
                        <button
                          type="button"
                          onClick={hit.onSelect}
                          className={cn(
                            "hover:bg-accent flex w-full items-center gap-3 rounded-md px-2 py-2 text-left outline-none focus-visible:bg-accent",
                          )}
                        >
                          <span className="text-muted-foreground flex size-6 shrink-0 items-center justify-center">
                            {hit.icon}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{hit.title}</span>
                            <span className="text-muted-foreground block truncate text-xs">{hit.subtitle}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
