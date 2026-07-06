import type { PriceData, Product } from "../types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 保存済みの手動順＋未登録品目を末尾に付与 */
export function getProductOrder(data: PriceData): string[] {
  const codeSet = new Set(data.products.map((p) => p.code));
  const saved = (data.productOrder ?? []).filter((c) => codeSet.has(c));
  const savedSet = new Set(saved);
  const trailing = data.products
    .map((p) => p.code)
    .filter((c) => !savedSet.has(c));
  return [...saved, ...trailing];
}

export function setProductOrder(data: PriceData, order: string[]): PriceData {
  const codeSet = new Set(data.products.map((p) => p.code));
  const cleaned = order.filter((c) => codeSet.has(c));
  const cleanedSet = new Set(cleaned);
  const trailing = data.products
    .map((p) => p.code)
    .filter((c) => !cleanedSet.has(c));

  return {
    ...data,
    productOrder: [...cleaned, ...trailing],
    meta: { ...data.meta, updatedAt: today() },
  };
}

export function initProductOrderFromProducts(
  data: PriceData,
  products: Product[],
): PriceData {
  return setProductOrder(data, products.map((p) => p.code));
}

export function reorderDisplayedProducts(
  data: PriceData,
  displayCodes: string[],
  from: number,
  to: number,
): PriceData {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= displayCodes.length ||
    to >= displayCodes.length
  ) {
    return data;
  }

  const nextDisplay = [...displayCodes];
  const [moved] = nextDisplay.splice(from, 1);
  nextDisplay.splice(to, 0, moved);

  const displaySet = new Set(displayCodes);
  const fullOrder = getProductOrder(data);
  const result: string[] = [];
  let displayIdx = 0;

  for (const code of fullOrder) {
    if (displaySet.has(code)) {
      result.push(nextDisplay[displayIdx++]);
    } else {
      result.push(code);
    }
  }

  return setProductOrder(data, result);
}

export function appendProductToOrder(data: PriceData, code: string): string[] {
  const order = getProductOrder(data);
  if (!order.includes(code)) order.push(code);
  return order;
}

export function removeProductFromOrder(
  order: string[] | undefined,
  code: string,
): string[] | undefined {
  if (!order?.length) return order;
  const next = order.filter((c) => c !== code);
  return next.length > 0 ? next : undefined;
}

export function replaceCodeInOrder(
  order: string[] | undefined,
  oldCode: string,
  newCode: string,
): string[] | undefined {
  if (!order?.length) return order;
  return order.map((c) => (c === oldCode ? newCode : c));
}

export function mergeProductOrder(
  existing: PriceData | null,
  products: Product[],
): string[] | undefined {
  if (!existing?.productOrder?.length) return existing?.productOrder;

  const codes = new Set(products.map((p) => p.code));
  const order = existing.productOrder.filter((c) => codes.has(c));
  const orderSet = new Set(order);

  for (const p of products) {
    if (!orderSet.has(p.code)) {
      order.push(p.code);
      orderSet.add(p.code);
    }
  }

  return order.length > 0 ? order : undefined;
}
