import type { ID, Product } from "@/lib/domain";
import { newId, nowIso } from "@/lib/ids";
import { buildSeed } from "@/lib/seed/seed-data";
import { ObservableCollection } from "./observable-store";
import type { ProductInput, ProductRepositoryApi } from "./types";

export type { ProductInput } from "./types";

export class ProductRepository extends ObservableCollection<Product> implements ProductRepositoryApi {
  constructor() {
    super("products", () => buildSeed().products);
  }

  addProduct(input: ProductInput): Product {
    const ts = nowIso();
    return this.create({
      id: newId("prod"),
      brandId: input.brandId,
      name: input.name.trim(),
      category: input.category.trim(),
      tags: input.tags,
      description: input.description?.trim() || undefined,
      dimensions: input.dimensions,
      usage: input.usage,
      mainImage: input.mainImage,
      referenceImages: input.referenceImages,
      preservationInstructions: input.preservationInstructions?.trim() || undefined,
      status: "active",
      createdAt: ts,
      updatedAt: ts,
    });
  }

  updateProduct(id: ID, input: Partial<ProductInput>): Product | undefined {
    return this.update(id, (p) => ({
      ...p,
      ...input,
      name: input.name?.trim() ?? p.name,
      category: input.category?.trim() ?? p.category,
      updatedAt: nowIso(),
    }));
  }

  setStatus(id: ID, status: Product["status"]): Product | undefined {
    return this.update(id, (p) => ({ ...p, status, updatedAt: nowIso() }));
  }

  async deleteProduct(id: ID): Promise<void> {
    this.remove(id);
  }

  // The local store is the source of truth (no remote) — already current.
  async refresh(): Promise<void> {}
}

export const productRepository = new ProductRepository();
