import type { Product } from "../types";

export type ProductSortBy = "genre" | "name" | "code";

export function sortProducts(
  products: Product[],
  categories: string[],
  sortBy: ProductSortBy,
): Product[] {
  const list = [...products];
  const catOrder = new Map(categories.map((c, i) => [c, i]));

  list.sort((a, b) => {
    if (sortBy === "genre") {
      const ca = catOrder.get(a.category) ?? 9999;
      const cb = catOrder.get(b.category) ?? 9999;
      if (ca !== cb) return ca - cb;
      return a.name.localeCompare(b.name, "ja");
    }
    if (sortBy === "name") {
      return a.name.localeCompare(b.name, "ja");
    }
    return a.code.localeCompare(b.code, "ja");
  });

  return list;
}
