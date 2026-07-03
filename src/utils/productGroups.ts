import { guessCategory } from "../constants/productCategories";
import type { Product } from "../types";

export type ProductGroup = {
  label: string;
  products: Product[];
};

export function groupProductsByCategory(
  products: Product[],
  categoryOrder: string[],
): ProductGroup[] {
  if (categoryOrder.length === 0) {
    const buckets = new Map<string, Product[]>();
    for (const product of products) {
      const cat = product.category?.trim() || "その他";
      const list = buckets.get(cat) ?? [];
      list.push(product);
      buckets.set(cat, list);
    }
    return [...buckets.entries()].map(([label, items]) => ({
      label,
      products: items,
    }));
  }

  const buckets = new Map<string, Product[]>();

  for (const cat of categoryOrder) {
    buckets.set(cat, []);
  }

  const fallback = categoryOrder.includes("その他")
    ? "その他"
    : categoryOrder[categoryOrder.length - 1];

  for (const product of products) {
    const cat = product.category ?? guessCategory(product.name, categoryOrder);
    if (buckets.has(cat)) {
      buckets.get(cat)!.push(product);
    } else if (fallback) {
      buckets.get(fallback)?.push({ ...product, category: fallback });
    }
  }

  return categoryOrder
    .map((label) => ({
      label,
      products: buckets.get(label) ?? [],
    }))
    .filter((g) => g.products.length > 0);
}
