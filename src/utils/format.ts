export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}
