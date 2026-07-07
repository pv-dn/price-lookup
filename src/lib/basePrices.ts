import type { BasePriceEntry, PriceData } from "../types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getBasePrice(
  data: PriceData,
  code: string,
): BasePriceEntry | undefined {
  return data.basePrices.find((p) => p.code === code);
}

export function setBasePrices(
  data: PriceData,
  entries: { code: string; price: number }[],
  effectiveFrom?: string,
): PriceData {
  const basePrices: BasePriceEntry[] = entries.map((e) => ({
    code: e.code,
    price: e.price,
  }));

  return {
    ...data,
    basePrices,
    meta: {
      ...data.meta,
      updatedAt: today(),
      effectiveFrom: effectiveFrom?.trim() || data.meta.effectiveFrom || today(),
    },
  };
}

/** 基本表の単価を手入力客先の下書き用に返す */
export function basePriceEntriesForCustomer(
  data: PriceData,
): { code: string; price: number }[] {
  return data.basePrices.map((p) => ({ code: p.code, price: p.price }));
}

/** 客先別単価の最頻値から基本単価を推定（復元用） */
export function deriveBasePricesFromCustomerPrices(
  data: PriceData,
): BasePriceEntry[] {
  const byCode = new Map<string, number[]>();
  for (const entry of data.prices) {
    if (!Number.isFinite(entry.price) || entry.price <= 0) continue;
    const list = byCode.get(entry.code) ?? [];
    list.push(entry.price);
    byCode.set(entry.code, list);
  }

  const basePrices: BasePriceEntry[] = [];
  for (const product of data.products) {
    const values = byCode.get(product.code);
    if (!values?.length) continue;

    const freq = new Map<number, number>();
    for (const price of values) {
      freq.set(price, (freq.get(price) ?? 0) + 1);
    }
    let bestPrice = values[0];
    let bestCount = 0;
    for (const [price, count] of freq) {
      if (count > bestCount) {
        bestPrice = price;
        bestCount = count;
      }
    }
    basePrices.push({ code: product.code, price: bestPrice });
  }

  return basePrices;
}

export function withDerivedBasePricesIfEmpty(data: PriceData): PriceData {
  if (data.basePrices.length > 0 || data.prices.length === 0) return data;

  const basePrices = deriveBasePricesFromCustomerPrices(data);
  if (basePrices.length === 0) return data;

  return {
    ...data,
    basePrices,
    meta: {
      ...data.meta,
      revisionName: `${data.meta.revisionName}（基本単価は客先単価から推定）`,
    },
  };
}
