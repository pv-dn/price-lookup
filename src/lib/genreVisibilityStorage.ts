const STORAGE_KEY = "price-lookup-hidden-genres";

export function loadHiddenGenres(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* ignore */
  }
  return [];
}

export function saveHiddenGenres(labels: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
  } catch {
    /* localStorage unavailable */
  }
}
