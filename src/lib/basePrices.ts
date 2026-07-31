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

/** 基本表の単価を手入力客先の下書き用に返す（客先別単価とは別物） */
export function basePriceEntriesForCustomer(
  data: PriceData,
): { code: string; price: number }[] {
  return data.basePrices.map((p) => ({ code: p.code, price: p.price }));
}

/** 基本価格表からだけ外す（品目マスタ・客先別単価は残す） */
export function removeBasePrice(data: PriceData, code: string): PriceData {
  return {
    ...data,
    basePrices: data.basePrices.filter((p) => p.code !== code),
    meta: {
      ...data.meta,
      updatedAt: today(),
    },
  };
}

/** 基本価格表の単価をすべてクリア（品目マスタ・客先別単価は残す） */
export function clearAllBasePrices(data: PriceData): PriceData {
  return {
    ...data,
    basePrices: [],
    meta: {
      ...data.meta,
      updatedAt: today(),
    },
  };
}
