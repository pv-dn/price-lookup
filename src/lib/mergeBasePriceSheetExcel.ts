import { guessCategory } from "../constants/productCategories";
import type { ParsedPriceSheetItem, PriceData, Product } from "../types";
import { normalizeSheetText } from "./parsePriceSheetExcel";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeNameKey(value: string): string {
  return normalizeSheetText(value).replace(/\s/g, "").toLowerCase();
}

function findProductByName(products: Product[], name: string): Product | undefined {
  const key = normalizeNameKey(name);
  const exact = products.find((p) => normalizeNameKey(p.name) === key);
  if (exact) return exact;

  return products.find((p) => {
    const pk = normalizeNameKey(p.name);
    return pk.includes(key) || key.includes(pk);
  });
}

function makeExcelCode(name: string, used: Set<string>): string {
  const slug =
    normalizeNameKey(name)
      .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff-]/gi, "")
      .slice(0, 16) || "item";
  let code = `EX-${slug}`;
  let n = 1;
  while (used.has(code)) {
    code = `EX-${slug}-${n++}`;
  }
  return code;
}

export function mergeBasePriceSheetExcel(
  data: PriceData,
  items: ParsedPriceSheetItem[],
): { data: PriceData; pricedCount: number; matchedCount: number } {
  const usedCodes = new Set(data.products.map((p) => p.code));
  const products = [...data.products];
  const baseMap = new Map(data.basePrices.map((p) => [p.code, p.price]));
  let pricedCount = 0;
  let matchedCount = 0;

  for (const item of items) {
    let product = findProductByName(products, item.name);
    if (!product) {
      product = {
        code: makeExcelCode(item.name, usedCodes),
        name: item.name,
        category: guessCategory(item.name, data.categories),
      };
      usedCodes.add(product.code);
      products.push(product);
    } else {
      matchedCount++;
    }

    if (item.price != null) {
      baseMap.set(product.code, item.price);
      pricedCount++;
    }
  }

  const basePrices = [...baseMap.entries()].map(([code, price]) => ({ code, price }));

  return {
    pricedCount,
    matchedCount,
    data: {
      ...data,
      meta: {
        ...data.meta,
        updatedAt: today(),
        revisionName: "基本価格表（Excel取込）",
      },
      products,
      basePrices,
    },
  };
}

export function mergeBasePriceSheetExcelResult(
  data: PriceData,
  items: ParsedPriceSheetItem[],
): { data: PriceData; message: string } {
  const { data: merged, pricedCount, matchedCount } = mergeBasePriceSheetExcel(data, items);
  const message = `取込完了（品目${items.length}件・マスタ一致${matchedCount}件${
    pricedCount > 0 ? `・基本単価${pricedCount}件` : "・単価は未入力"
  }）`;
  return { data: merged, message };
}
