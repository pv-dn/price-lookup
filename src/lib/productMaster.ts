import {
  defaultCategories,
  guessCategory,
} from "../constants/productCategories";
import type { PriceData, Product } from "../types";
import {
  appendProductToOrder,
  mergeProductOrder,
  removeProductFromOrder,
  replaceCodeInOrder,
} from "../utils/productOrder";
import { getManualCustomers } from "./manualCustomers";

function fallbackCategory(categories: string[]): string {
  if (categories.includes("その他")) return "その他";
  return categories[categories.length - 1] ?? "その他";
}

/** 取込・同期時にジャンル設定・手入力品目・手入力客先を残す */
export function mergePourVousWithLocal(
  imported: PriceData,
  existing: PriceData | null,
): PriceData {
  const categories = existing?.categories?.length
    ? existing.categories
    : imported.categories;
  const products = mergeProducts(
    imported.products,
    existing?.products ?? null,
    categories,
  );

  const base = {
    ...imported,
    categories,
    products,
    basePrices: existing?.basePrices ?? imported.basePrices ?? [],
    productOrder: mergeProductOrder(existing, products),
  };

  if (!existing) return base;

  const importedCodes = new Set(imported.products.map((p) => p.code));
  const localOnlyCodes = new Set(
    existing.products
      .filter((p) => !importedCodes.has(p.code))
      .map((p) => p.code),
  );

  const manualCustomers = getManualCustomers(existing);
  const importedNames = new Set(imported.customers.map((c) => c.name));
  const keptManual = manualCustomers.filter((c) => !importedNames.has(c.name));
  const keptManualIds = new Set(keptManual.map((c) => c.id));

  const importedPriceKeys = new Set(
    imported.prices.map((p) => `${p.customerId}:${p.code}`),
  );
  const keptPrices = existing.prices.filter((p) => {
    if (importedPriceKeys.has(`${p.customerId}:${p.code}`)) return false;
    return keptManualIds.has(p.customerId) || localOnlyCodes.has(p.code);
  });

  return {
    ...base,
    customers:
      keptManual.length > 0
        ? [...imported.customers, ...keptManual]
        : base.customers,
    prices: [...imported.prices, ...keptPrices],
  };
}

function mergeProducts(
  imported: Product[],
  existing: Product[] | null,
  categories: string[],
): Product[] {
  const normalize = (p: Product): Product => ({
    code: p.code,
    name: p.name,
    category: normalizeCategory(
      p.category ?? guessCategory(p.name, categories),
      categories,
    ),
  });

  if (!existing?.length) {
    return imported.map(normalize);
  }

  const importedCodes = new Set(imported.map((p) => p.code));
  const localMap = new Map(existing.map((p) => [p.code, p]));

  const merged = imported.map((p) => {
    const local = localMap.get(p.code);
    const category = local?.category ?? p.category ?? guessCategory(p.name, categories);
    return normalize({ ...p, category });
  });

  const localOnly = existing
    .filter((p) => !importedCodes.has(p.code))
    .map(normalize);

  return [...merged, ...localOnly];
}

function normalizeCategory(category: string, categories: string[]): string {
  if (categories.includes(category)) return category;
  return fallbackCategory(categories);
}

export function updateProductCategory(
  data: PriceData,
  code: string,
  category: string,
): PriceData {
  return {
    ...data,
    products: data.products.map((p) =>
      p.code === code ? { ...p, category: normalizeCategory(category, data.categories) } : p,
    ),
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function replaceProductCode(
  data: PriceData,
  oldCode: string,
  newCode: string,
): PriceData {
  return {
    ...data,
    products: data.products.map((p) =>
      p.code === oldCode ? { ...p, code: newCode } : p,
    ),
    prices: data.prices.map((p) =>
      p.code === oldCode ? { ...p, code: newCode } : p,
    ),
    basePrices: data.basePrices.map((p) =>
      p.code === oldCode ? { ...p, code: newCode } : p,
    ),
    customers: data.customers.map((c) => ({
      ...c,
      frequentCodes: c.frequentCodes.map((fc) => (fc === oldCode ? newCode : fc)),
    })),
    productOrder: replaceCodeInOrder(data.productOrder, oldCode, newCode),
  };
}

function generateAutoCode(existingProducts: PriceData["products"]): string {
  const existing = new Set(existingProducts.map((p) => p.code));
  for (let i = 1; i <= 9999; i++) {
    const candidate = `M${String(i).padStart(3, "0")}`;
    if (!existing.has(candidate)) return candidate;
  }
  throw new Error("自動採番の上限に達しました");
}

export function addProduct(
  data: PriceData,
  code: string,
  name: string,
  category: string,
): PriceData {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("品名を入力してください");

  const trimmedCode = code.trim() || generateAutoCode(data.products);
  if (data.products.some((p) => p.code === trimmedCode)) {
    throw new Error("同じ品番があります");
  }

  return {
    ...data,
    products: [
      ...data.products,
      {
        code: trimmedCode,
        name: trimmedName,
        category: normalizeCategory(category, data.categories),
      },
    ],
    productOrder: appendProductToOrder(data, trimmedCode),
    meta: { ...data.meta, updatedAt: today() },
  };
}

export function updateProduct(
  data: PriceData,
  code: string,
  updates: { name?: string; category?: string; code?: string },
): PriceData {
  if (!data.products.some((p) => p.code === code)) {
    throw new Error("品目が見つかりません");
  }

  let next = data;

  if (updates.name !== undefined) {
    const trimmedName = updates.name.trim();
    if (!trimmedName) throw new Error("品名を入力してください");
    next = {
      ...next,
      products: next.products.map((p) =>
        p.code === code ? { ...p, name: trimmedName } : p,
      ),
    };
  }

  if (updates.category !== undefined) {
    next = updateProductCategory(next, code, updates.category);
  }

  if (updates.code !== undefined) {
    const trimmedCode = updates.code.trim();
    if (!trimmedCode) throw new Error("品番を入力してください");
    if (trimmedCode !== code) {
      if (next.products.some((p) => p.code === trimmedCode)) {
        throw new Error("同じ品番があります");
      }
      next = replaceProductCode(next, code, trimmedCode);
    }
  }

  return {
    ...next,
    meta: { ...next.meta, updatedAt: today() },
  };
}

export function removeProduct(data: PriceData, code: string): PriceData {
  if (!data.products.some((p) => p.code === code)) {
    throw new Error("品目が見つかりません");
  }

  return {
    ...data,
    products: data.products.filter((p) => p.code !== code),
    prices: data.prices.filter((p) => p.code !== code),
    basePrices: data.basePrices.filter((p) => p.code !== code),
    customers: data.customers.map((c) => ({
      ...c,
      frequentCodes: c.frequentCodes.filter((fc) => fc !== code),
    })),
    productOrder: removeProductFromOrder(data.productOrder, code),
    meta: { ...data.meta, updatedAt: today() },
  };
}

export function ensureProductCategories(data: PriceData): PriceData {
  const withBase = { ...data, basePrices: data.basePrices ?? [] };
  const categories =
    withBase.categories?.length > 0 ? withBase.categories : defaultCategories();

  const products = withBase.products.map((p) => ({
    ...p,
    category: normalizeCategory(
      p.category ?? guessCategory(p.name, categories),
      categories,
    ),
  }));

  const categoriesChanged =
    !data.categories?.length ||
    data.categories.length !== categories.length ||
    data.categories.some((c, i) => c !== categories[i]);

  const productsChanged = products.some(
    (p, i) => p.category !== withBase.products[i]?.category,
  );

  if (!categoriesChanged && !productsChanged && data.basePrices !== undefined) {
    return withBase;
  }
  return { ...withBase, categories, products };
}

export function countByCategory(
  products: Product[],
  categories: string[],
): Record<string, number> {
  const counts = Object.fromEntries(categories.map((c) => [c, 0]));

  for (const p of products) {
    const cat = normalizeCategory(
      p.category ?? guessCategory(p.name, categories),
      categories,
    );
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  return counts;
}

export function addCategory(data: PriceData, name: string): PriceData {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("ジャンル名を入力してください");
  if (data.categories.includes(trimmed)) {
    throw new Error("同じジャンル名があります");
  }
  return { ...data, categories: [...data.categories, trimmed] };
}

export function renameCategory(
  data: PriceData,
  oldName: string,
  newName: string,
): PriceData {
  const trimmed = newName.trim();
  if (!trimmed) throw new Error("ジャンル名を入力してください");
  if (!data.categories.includes(oldName)) {
    throw new Error("ジャンルが見つかりません");
  }
  if (trimmed !== oldName && data.categories.includes(trimmed)) {
    throw new Error("同じジャンル名があります");
  }

  return {
    ...data,
    categories: data.categories.map((c) => (c === oldName ? trimmed : c)),
    products: data.products.map((p) =>
      p.category === oldName ? { ...p, category: trimmed } : p,
    ),
  };
}

export function removeCategory(data: PriceData, name: string): PriceData {
  if (data.categories.length <= 1) {
    throw new Error("ジャンルは1つ以上必要です");
  }
  if (!data.categories.includes(name)) {
    throw new Error("ジャンルが見つかりません");
  }

  const nextCategories = data.categories.filter((c) => c !== name);
  const moveTo = fallbackCategory(nextCategories);

  return {
    ...data,
    categories: nextCategories,
    products: data.products.map((p) =>
      p.category === name ? { ...p, category: moveTo } : p,
    ),
  };
}

export function moveCategory(
  data: PriceData,
  index: number,
  direction: -1 | 1,
): PriceData {
  const next = index + direction;
  if (next < 0 || next >= data.categories.length) return data;

  const categories = [...data.categories];
  [categories[index], categories[next]] = [categories[next], categories[index]];
  return { ...data, categories };
}
