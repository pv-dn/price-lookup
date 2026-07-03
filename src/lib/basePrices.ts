import type { BasePriceEntry, PriceData } from "../types";

export function getBasePrice(
  data: PriceData,
  code: string,
): BasePriceEntry | undefined {
  return data.basePrices.find((p) => p.code === code);
}

export function setBasePrices(
  data: PriceData,
  entries: { code: string; price: number }[],
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
      updatedAt: new Date().toISOString().slice(0, 10),
    },
  };
}

/** 基本表の単価を手入力客先の下書き用に返す */
export function basePriceEntriesForCustomer(
  data: PriceData,
): { code: string; price: number }[] {
  return data.basePrices.map((p) => ({ code: p.code, price: p.price }));
}
