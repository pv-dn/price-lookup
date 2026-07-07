import type { PriceData } from "../types";

const STORAGE_KEY = "price-lookup-data";

export function validatePriceData(value: unknown): value is PriceData {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.customers) &&
    Array.isArray(v.products) &&
    Array.isArray(v.prices) &&
    Array.isArray(v.basePrices) &&
    Array.isArray(v.categories) &&
    typeof v.meta === "object" &&
    v.meta !== null
  );
}

function isPriceData(value: unknown): value is PriceData {
  return validatePriceData(value);
}

export function loadStoredData(): PriceData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPriceData(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredData(data: PriceData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      throw new Error(
        "保存容量がいっぱいです。ブラウザのデータを減らすか、古いデータを削除してください。",
      );
    }
    throw new Error("データを保存できませんでした");
  }
}

export function clearStoredData(): void {
  localStorage.removeItem(STORAGE_KEY);
}
