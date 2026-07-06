import type { Product } from "../types";

export type ProductSortBy = "genre" | "name" | "code" | "manual";

export function sortProducts(
  products: Product[],
  categories: string[],
  sortBy: ProductSortBy,
  productOrder?: string[],
): Product[] {
  const list = [...products];

  if (sortBy === "manual") {
    const orderMap = new Map(
      (productOrder ?? []).map((code, index) => [code, index]),
    );
    list.sort((a, b) => {
      const ia = orderMap.get(a.code) ?? Number.MAX_SAFE_INTEGER;
      const ib = orderMap.get(b.code) ?? Number.MAX_SAFE_INTEGER;
      if (ia !== ib) return ia - ib;
      return a.code.localeCompare(b.code, "ja");
    });
    return list;
  }

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
