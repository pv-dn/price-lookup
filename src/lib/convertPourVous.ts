import type { PourVousBackup, PriceData } from "../types";
import { defaultCategories, guessCategory } from "../constants/productCategories";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseUpdatedAt(exportDate?: string): string {
  if (!exportDate) return today();
  try {
    return new Date(exportDate).toISOString().slice(0, 10);
  } catch {
    return today();
  }
}

function frequentCodesForCustomer(
  customerName: string,
  prices: NonNullable<PourVousBackup["prices"]>,
): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const p of prices) {
    if (p.customer !== customerName || seen.has(p.code)) continue;
    seen.add(p.code);
    codes.push(p.code);
    if (codes.length >= 5) break;
  }
  return codes;
}

export function convertPourVousBackup(
  backup: PourVousBackup,
  source: "import" | "firestore",
): PriceData {
  const pvCustomers = backup.customers ?? [];
  const pvProducts = backup.products ?? [];
  const pvPrices = backup.prices ?? [];

  const nameToId = new Map(pvCustomers.map((c) => [c.name, c.id]));

  const customers = pvCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    kana: "",
    frequentCodes: frequentCodesForCustomer(c.name, pvPrices),
  }));

  const categories = defaultCategories();

  const products = pvProducts.map((p) => ({
    code: p.code,
    name: p.name,
    category: guessCategory(p.name, categories),
  }));

  const effectiveFrom = today();
  const updatedAt = parseUpdatedAt(backup.exportDate);

  const prices = pvPrices
    .map((p) => {
      const customerId = nameToId.get(p.customer);
      if (!customerId) return null;
      const entry = {
        customerId,
        code: p.code,
        price: p.price,
        effectiveFrom,
        ...(p.qtyTiers?.length ? { qtyTiers: p.qtyTiers } : {}),
      };
      return entry;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return {
    meta: {
      effectiveFrom,
      revisionName:
        source === "firestore" ? "プゥルヴー伝票（同期）" : "プゥルヴー伝票（取込）",
      updatedAt,
      source,
      syncedAt: new Date().toISOString(),
    },
    customers,
    categories,
    products,
    prices,
  };
}

export function validatePourVousBackup(data: unknown): data is PourVousBackup {
  if (!data || typeof data !== "object") return false;
  const d = data as PourVousBackup;
  return (
    Array.isArray(d.customers) &&
    Array.isArray(d.products) &&
    Array.isArray(d.prices)
  );
}
