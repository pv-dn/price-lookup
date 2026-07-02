import type { Customer, PriceData, PriceEntry } from "../types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 取込・同期時に手入力の客先と単価を残す */
export function mergePourVousWithManual(
  imported: PriceData,
  existing: PriceData | null,
): PriceData {
  if (!existing) return imported;

  const manualCustomers = existing.customers.filter((c) => c.manual);
  if (manualCustomers.length === 0) return imported;

  const importedNames = new Set(imported.customers.map((c) => c.name));
  const keptManual = manualCustomers.filter((c) => !importedNames.has(c.name));
  const keptIds = new Set(keptManual.map((c) => c.id));
  const keptPrices = existing.prices.filter((p) => keptIds.has(p.customerId));

  if (keptManual.length === 0) return imported;

  return {
    ...imported,
    customers: [...imported.customers, ...keptManual],
    prices: [...imported.prices, ...keptPrices],
  };
}

export function addManualCustomer(data: PriceData, name: string): PriceData {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("客先名を入力してください");
  if (data.customers.some((c) => c.name === trimmed)) {
    throw new Error("同じ名前の客先がすでにあります");
  }

  const customer: Customer = {
    id: `manual-${Date.now()}`,
    name: trimmed,
    kana: "",
    frequentCodes: [],
    manual: true,
  };

  return {
    ...data,
    customers: [...data.customers, customer],
  };
}

export function removeManualCustomer(data: PriceData, customerId: string): PriceData {
  const target = data.customers.find((c) => c.id === customerId);
  if (!target?.manual) throw new Error("手入力の客先のみ削除できます");

  return {
    ...data,
    customers: data.customers.filter((c) => c.id !== customerId),
    prices: data.prices.filter((p) => p.customerId !== customerId),
  };
}

export function setManualPrices(
  data: PriceData,
  customerId: string,
  entries: { code: string; price: number }[],
): PriceData {
  const target = data.customers.find((c) => c.id === customerId);
  if (!target?.manual) throw new Error("手入力の客先のみ編集できます");

  const effectiveFrom = data.meta.effectiveFrom || today();
  const otherPrices = data.prices.filter((p) => p.customerId !== customerId);
  const newPrices: PriceEntry[] = entries.map((e) => ({
    customerId,
    code: e.code,
    price: e.price,
    effectiveFrom,
  }));

  return {
    ...data,
    prices: [...otherPrices, ...newPrices],
  };
}

export function getManualCustomers(data: PriceData): Customer[] {
  return data.customers.filter((c) => c.manual);
}
