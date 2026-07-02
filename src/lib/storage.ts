import type { PriceData } from "../types";

const STORAGE_KEY = "price-lookup-data";

export function loadStoredData(): PriceData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PriceData;
  } catch {
    return null;
  }
}

export function saveStoredData(data: PriceData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearStoredData(): void {
  localStorage.removeItem(STORAGE_KEY);
}
