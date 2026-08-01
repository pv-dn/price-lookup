import type { ParsedPriceSheet, ParsedPriceSheetItem } from "../types";

const PLACEHOLDER_CUSTOMER = /^店名|^コード/i;

export function normalizeSheetText(value: unknown): string {
  if (value == null) return "";
  return String(value)
    .replace(/\u3000/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNameKey(value: string): string {
  return normalizeSheetText(value).replace(/\s/g, "").toLowerCase();
}

function isNameHeader(name: string): boolean {
  const compact = normalizeSheetText(name).replace(/\s/g, "");
  return compact === "品名" || compact === "単価";
}

function isCategoryLabel(name: string, categories: string[]): boolean {
  const n = normalizeSheetText(name);
  if (!n) return true;
  if (n.startsWith("☆")) return true;
  if (/類$|他$/.test(n)) return true;
  if (isNameHeader(n)) return true;
  if (n === "クロス・カバー" || n === "クロスカバー") return true;
  if (/[〇○＝÷×]/.test(n)) return true;
  return categories.some((c) => normalizeNameKey(c) === normalizeNameKey(n));
}

/** 単価なしのセルをジャンル見出しとして扱う */
function isSectionHeader(
  name: string,
  priceRaw: unknown,
  categories: string[],
): boolean {
  if (!name || isNameHeader(name)) return false;
  if (/[〇○＝÷×]/.test(name)) return false;
  if (parsePrice(priceRaw) != null) return false;
  const priceText = normalizeSheetText(priceRaw).replace(/\s/g, "");
  if (priceText.includes("単価")) return false;
  return isCategoryLabel(name, categories) || priceText === "";
}

function parsePrice(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = normalizeSheetText(value).replace(/[,，円¥]/g, "");
  if (!text) return null;
  const slash = text.match(/^(\d+(?:\.\d+)?)\s*[/／]/);
  if (slash) {
    const n = Number(slash[1]);
    return Number.isFinite(n) ? n : null;
  }
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

function parseDate(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + value);
    return epoch.toISOString().slice(0, 10);
  }
  const text = normalizeSheetText(value);
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return undefined;
}

function extractCustomerName(row: unknown[]): string {
  const candidates = [row[0], row[5], row[1], row[6]]
    .map((v) => normalizeSheetText(v))
    .map((v) => v.replace(/様$/u, "").trim())
    .filter((v) => v && !PLACEHOLDER_CUSTOMER.test(v));
  return candidates[0] ?? "";
}

function extractCustomerCode(row: unknown[]): string | undefined {
  const raw = normalizeSheetText(row[4] ?? row[3]);
  if (!raw) return undefined;
  const code = raw.replace(/^コード[:：]?\s*/u, "").trim();
  return code && !PLACEHOLDER_CUSTOMER.test(code) ? code : undefined;
}

function findHeaderRow(rows: unknown[][]): number {
  for (let r = 0; r < Math.min(15, rows.length); r++) {
    const cells = rows[r].map((v) => normalizeSheetText(v));
    const hasName = cells.some((c) => c.includes("品") && c.includes("名"));
    const hasPrice = cells.some((c) => c.replace(/\s/g, "").includes("単価"));
    if (hasName && hasPrice) return r;
  }
  return 4;
}

function findBlocks(headerRow: unknown[]): { nameCol: number; priceCol: number }[] {
  const blocks: { nameCol: number; priceCol: number }[] = [];
  for (let c = 0; c < headerRow.length; c++) {
    const header = normalizeSheetText(headerRow[c]);
    if (!(header.includes("品") && header.includes("名"))) continue;
    const next = normalizeSheetText(headerRow[c + 1]);
    if (next.replace(/\s/g, "").includes("単価")) {
      blocks.push({ nameCol: c, priceCol: c + 1 });
    }
  }
  return blocks;
}

function extractPriceSheetItems(
  rows: unknown[][],
  categories: string[],
  withCategories = false,
): ParsedPriceSheetItem[] {
  const headerIndex = findHeaderRow(rows);
  const blocks = findBlocks(rows[headerIndex] ?? []);
  if (blocks.length === 0) {
    throw new Error("価格表の形式ではありません（品名・単価の列が見つかりません）");
  }

  const items: ParsedPriceSheetItem[] = [];
  const seen = new Set<string>();
  const currentCategory = new Map<number, string>();

  if (withCategories && headerIndex > 0) {
    const genreRow = rows[headerIndex - 1] ?? [];
    for (const { nameCol } of blocks) {
      const genre = normalizeSheetText(genreRow[nameCol]);
      if (genre && !isNameHeader(genre)) {
        currentCategory.set(nameCol, genre);
      }
    }
  }

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    for (const { nameCol, priceCol } of blocks) {
      const name = normalizeSheetText(row[nameCol]);
      if (!name) continue;
      if (isNameHeader(name)) continue;
      if (/[〇○＝÷×]/.test(name)) continue;

      if (withCategories && isSectionHeader(name, row[priceCol], categories)) {
        currentCategory.set(nameCol, name);
        continue;
      }

      const price = parsePrice(row[priceCol]);
      // ジャンル名と同じ品目（例: Ｙシャツ ¥200）は単価があれば品目として残す
      if (price == null && isCategoryLabel(name, categories)) continue;

      const key = normalizeNameKey(name);
      if (seen.has(key)) continue;
      seen.add(key);

      const category = withCategories ? currentCategory.get(nameCol) : undefined;
      items.push({
        name,
        price,
        ...(category ? { category } : {}),
      });
    }
  }

  return items;
}

export function parseBasePriceSheetExcel(
  rows: unknown[][],
  categories: string[],
): { items: ParsedPriceSheetItem[] } {
  if (rows.length < 6) {
    throw new Error("価格表の形式ではありません（行数が足りません）");
  }

  const items = extractPriceSheetItems(rows, categories, true);
  if (items.length === 0) {
    throw new Error("品名が1件も見つかりませんでした");
  }

  return { items };
}

export function parsePriceSheetExcel(
  rows: unknown[][],
  categories: string[],
): ParsedPriceSheet {
  if (rows.length < 6) {
    throw new Error("価格表の形式ではありません（行数が足りません）");
  }

  const customerName = extractCustomerName(rows[1] ?? []);
  if (!customerName) {
    throw new Error("2行目に客先名を入力してから取り込んでください");
  }

  const items = extractPriceSheetItems(rows, categories);
  if (items.length === 0) {
    throw new Error("品名が1件も見つかりませんでした");
  }

  return {
    customerName,
    customerCode: extractCustomerCode(rows[1] ?? []),
    effectiveDate: parseDate(rows[1]?.[9] ?? rows[1]?.[8]),
    items,
  };
}

export async function readPriceSheetExcelFile(
  file: ArrayBuffer,
  categories: string[],
): Promise<ParsedPriceSheet> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(file, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("シートが見つかりません");
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];
  return parsePriceSheetExcel(rows, categories);
}

function orderedBasePriceSheetNames(sheetNames: string[]): string[] {
  const exact = sheetNames.filter((n) => n.trim() === "基本");
  const fuzzy = sheetNames.filter(
    (n) => n.trim() !== "基本" && /基本/.test(n),
  );
  const rest = sheetNames.filter((n) => !/基本/.test(n));
  return [...exact, ...fuzzy, ...rest];
}

function sheetRows(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workbook: { Sheets: Record<string, any> },
  sheetName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  XLSX: any,
): unknown[][] {
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];
}

export async function readBasePriceSheetExcelFile(
  file: ArrayBuffer,
  categories: string[],
): Promise<{ items: ParsedPriceSheetItem[]; sheetName: string }> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(file, { type: "array", cellDates: true });
  if (workbook.SheetNames.length === 0) {
    throw new Error("シートが見つかりません");
  }

  const candidates = orderedBasePriceSheetNames(workbook.SheetNames);
  const errors: string[] = [];

  for (const sheetName of candidates) {
    try {
      const rows = sheetRows(workbook, sheetName, XLSX);
      const parsed = parseBasePriceSheetExcel(rows, categories);
      return { ...parsed, sheetName };
    } catch (e) {
      errors.push(
        `「${sheetName}」: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  throw new Error(
    `基本価格表として取り込めるシートがありません。\n（「基本」シートがあるか確認してください）\n${errors.slice(0, 3).join("\n")}`,
  );
}
