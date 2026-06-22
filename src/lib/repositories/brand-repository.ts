import type { Brand, ID, ImageAsset, LogoAsset, LogoKind, LogoStatus } from "@/lib/domain";
import { newId, nowIso } from "@/lib/ids";
import { buildSeed } from "@/lib/seed/seed-data";
import { ObservableCollection } from "./observable-store";

export interface CreateBrandInput {
  name: string;
  accentColor: string;
  description?: string;
  instructions?: string;
}

export interface CreateLogoInput {
  asset: ImageAsset;
  kind: LogoKind;
  instructions?: string;
}

export class BrandRepository extends ObservableCollection<Brand> {
  constructor() {
    super("brands", () => buildSeed().brands);
  }

  addBrand(input: CreateBrandInput): Brand {
    const ts = nowIso();
    return this.create({
      id: newId("brand"),
      name: input.name.trim(),
      accentColor: input.accentColor,
      description: input.description?.trim() || undefined,
      instructions: input.instructions?.trim() || undefined,
      logos: [],
      defaultLogoId: undefined,
      status: "active",
      createdAt: ts,
      updatedAt: ts,
    });
  }

  updateBrand(id: ID, patch: Partial<Pick<Brand, "name" | "accentColor" | "description" | "instructions">>): Brand | undefined {
    return this.update(id, (b) => ({
      ...b,
      ...patch,
      name: patch.name?.trim() ?? b.name,
      updatedAt: nowIso(),
    }));
  }

  setStatus(id: ID, status: Brand["status"]): Brand | undefined {
    return this.update(id, (b) => ({ ...b, status, updatedAt: nowIso() }));
  }

  /* --------------------------- logos --------------------------- */

  addLogo(brandId: ID, input: CreateLogoInput): LogoAsset | undefined {
    const ts = nowIso();
    const logo: LogoAsset = {
      id: newId("logo"),
      brandId,
      asset: input.asset,
      kind: input.kind,
      status: "active",
      instructions: input.instructions?.trim() || undefined,
      createdAt: ts,
      updatedAt: ts,
    };
    this.update(brandId, (b) => ({
      ...b,
      logos: [...b.logos, logo],
      // First logo becomes the default automatically.
      defaultLogoId: b.defaultLogoId ?? logo.id,
      updatedAt: ts,
    }));
    return logo;
  }

  updateLogo(
    brandId: ID,
    logoId: ID,
    patch: Partial<Pick<LogoAsset, "kind" | "instructions">>,
  ): void {
    this.update(brandId, (b) => ({
      ...b,
      logos: b.logos.map((l) => (l.id === logoId ? { ...l, ...patch, updatedAt: nowIso() } : l)),
      updatedAt: nowIso(),
    }));
  }

  replaceLogoAsset(brandId: ID, logoId: ID, asset: ImageAsset): void {
    this.update(brandId, (b) => ({
      ...b,
      logos: b.logos.map((l) => (l.id === logoId ? { ...l, asset, updatedAt: nowIso() } : l)),
      updatedAt: nowIso(),
    }));
  }

  setLogoStatus(brandId: ID, logoId: ID, status: LogoStatus): void {
    this.update(brandId, (b) => ({
      ...b,
      logos: b.logos.map((l) => (l.id === logoId ? { ...l, status, updatedAt: nowIso() } : l)),
      updatedAt: nowIso(),
    }));
  }

  setDefaultLogo(brandId: ID, logoId: ID): void {
    this.update(brandId, (b) => ({ ...b, defaultLogoId: logoId, updatedAt: nowIso() }));
  }

  removeLogo(brandId: ID, logoId: ID): void {
    this.update(brandId, (b) => {
      const logos = b.logos.filter((l) => l.id !== logoId);
      const defaultLogoId = b.defaultLogoId === logoId ? logos[0]?.id : b.defaultLogoId;
      return { ...b, logos, defaultLogoId, updatedAt: nowIso() };
    });
  }
}

export const brandRepository = new BrandRepository();
