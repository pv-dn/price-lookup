import { guessCategory } from "../constants/productCategories";
import type { Customer, ParsedPriceSheet, PriceData, PriceEntry, Product } from "../types";
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

function upsertCustomer(data: PriceData, sheet: ParsedPriceSheet): Customer {
  const existing = data.customers.find(
    (c) => normalizeNameKey(c.name) === normalizeNameKey(sheet.customerName),
  );
  if (existing) return existing;

  return {
    id: `excel-${Date.now()}`,
    name: sheet.customerName,
    kana: "",
    frequentCodes: [],
    manual: true,
  };
}

export function mergePriceSheetExcel(
  data: PriceData,
  sheet: ParsedPriceSheet,
): { data: PriceData; pricedCount: number } {
  const effectiveFrom = sheet.effectiveDate ?? data.meta.effectiveFrom ?? today();
  const usedCodes = new Set(data.products.map((p) => p.code));
  const products = [...data.products];
  const prices = [...data.prices];
  const frequentCodes: string[] = [];

  let customer = upsertCustomer(data, sheet);
  const customers = customer.id.startsWith("excel-")
    ? [...data.customers, customer]
    : data.customers;

  for (const item of sheet.items) {
    let product = findProductByName(products, item.name);
    if (!product) {
      product = {
        code: makeExcelCode(item.name, usedCodes),
        name: item.name,
        category: guessCategory(item.name, data.categories),
      };
      usedCodes.add(product.code);
      products.push(product);
    }

    if (!frequentCodes.includes(product.code)) {
      frequentCodes.push(product.code);
    }

    if (item.price == null) continue;

    const entry: PriceEntry = {
      customerId: customer.id,
      code: product.code,
      price: item.price,
      effectiveFrom,
    };
    const idx = prices.findIndex(
      (p) => p.customerId === customer.id && p.code === product.code,
    );
    if (idx >= 0) prices[idx] = entry;
    else prices.push(entry);
  }

  customer = {
    ...customer,
    frequentCodes: [...new Set([...customer.frequentCodes, ...frequentCodes])],
  };
  const nextCustomers = customers.map((c) => (c.id === customer.id ? customer : c));
  const pricedCount = sheet.items.filter((i) => i.price != null).length;

  return {
    pricedCount,
    data: {
      ...data,
      meta: {
        ...data.meta,
        effectiveFrom,
        revisionName: `価格表Excel（${sheet.customerName}）`,
        updatedAt: today(),
        source: "excel",
        syncedAt: new Date().toISOString(),
      },
      customers: nextCustomers,
      products,
      prices,
    },
  };
}

export function mergePriceSheetExcelResult(
  data: PriceData,
  sheet: ParsedPriceSheet,
): { data: PriceData; message: string } {
  const { data: merged, pricedCount } = mergePriceSheetExcel(data, sheet);
  const message = `取込完了（${sheet.customerName}・品目${sheet.items.length}件${
    pricedCount > 0 ? `・単価${pricedCount}件` : "・単価は未入力"
  }）`;
  return { data: merged, message };
}
