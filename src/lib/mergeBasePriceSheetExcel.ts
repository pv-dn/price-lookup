import { guessCategory } from "../constants/productCategories";
import type { ParsedPriceSheetItem, PriceData, Product } from "../types";
import { normalizeSheetText } from "./parsePriceSheetExcel";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 空白除去＋NFKC（全角英数を半角に揃える）で品名比較 */
function normalizeNameKey(value: string): string {
  return normalizeSheetText(value).normalize("NFKC").replace(/\s/g, "").toLowerCase();
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

function findProductExactName(products: Product[], name: string): Product | undefined {
  const key = normalizeNameKey(name);
  return products.find((p) => normalizeNameKey(p.name) === key);
}

export function mergeBasePriceSheetExcel(
  data: PriceData,
  items: ParsedPriceSheetItem[],
): { data: PriceData; pricedCount: number; matchedCount: number; createdCount: number } {
  const usedCodes = new Set(data.products.map((p) => p.code));
  const products = [...data.products];
  // Excel「基本」が正。あいまい一致は使わない（「Ｙシャツ DX」が「Ｙシャツ」を上書きするのを防ぐ）
  const baseMap = new Map<string, number>();
  let pricedCount = 0;
  let matchedCount = 0;
  let createdCount = 0;

  for (const item of items) {
    let product = findProductExactName(products, item.name);
    if (!product) {
      product = {
        code: makeExcelCode(item.name, usedCodes),
        name: item.name,
        category: guessCategory(item.name, data.categories),
      };
      usedCodes.add(product.code);
      products.push(product);
      createdCount++;
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
    createdCount,
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
  sheetName?: string,
): { data: PriceData; message: string } {
  const { data: merged, pricedCount, matchedCount, createdCount } =
    mergeBasePriceSheetExcel(data, items);
  const sheetLabel = sheetName ? `「${sheetName}」` : "";
  const parts = [`品目${items.length}件`, `マスタ一致${matchedCount}件`];
  if (createdCount > 0) parts.push(`新規${createdCount}件`);
  parts.push(pricedCount > 0 ? `基本単価${merged.basePrices.length}件` : "単価は未入力");
  const message = `取込完了${sheetLabel}（${parts.join("・")}）`;
  return {
    data: {
      ...merged,
      meta: {
        ...merged.meta,
        effectiveFrom: merged.meta.effectiveFrom || "2026-08-01",
        revisionName: "基本価格表（Excel取込）",
      },
    },
    message,
  };
}
