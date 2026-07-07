/**
 * 基本価格表 Excel + 伝票バックアップ → 価格参照用 JSON を生成
 * 使い方: node scripts/restore-base-prices.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const excelCandidates = [
  "C:\\Users\\e--yo\\OneDrive\\Desktop\\かかくひょう　ぶらんく.xlsx",
  join(process.env.USERPROFILE ?? "", "OneDrive", "Desktop", "かかくひょう　ぶらんく.xlsx"),
];

const backupPath =
  "C:\\Users\\e--yo\\Downloads\\pourvous_backup_2026_7_2.json";

function findExcel() {
  for (const p of excelCandidates) {
    try {
      readFileSync(p);
      return p;
    } catch {
      /* try next */
    }
  }
  throw new Error("かかくひょう Excel が見つかりません");
}

function normalizeSheetText(value) {
  if (value == null) return "";
  return String(value).replace(/\u3000/g, " ").replace(/\s+/g, " ").trim();
}

function parsePrice(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = normalizeSheetText(value).replace(/[,，円¥]/g, "");
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

function findHeaderRow(rows) {
  for (let r = 0; r < Math.min(15, rows.length); r++) {
    const cells = rows[r].map((v) => normalizeSheetText(v));
    const hasName = cells.some((c) => c.includes("品") && c.includes("名"));
    const hasPrice = cells.some((c) => c.replace(/\s/g, "").includes("単価"));
    if (hasName && hasPrice) return r;
  }
  return 4;
}

function findBlocks(headerRow) {
  const blocks = [];
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

function parseBaseItems(rows, categories) {
  const headerIndex = findHeaderRow(rows);
  const blocks = findBlocks(rows[headerIndex] ?? []);
  const items = [];
  const seen = new Set();
  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    for (const { nameCol, priceCol } of blocks) {
      const name = normalizeSheetText(row[nameCol]);
      if (!name || name.startsWith("☆")) continue;
      const key = name.replace(/\s/g, "").toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ name, price: parsePrice(row[priceCol]) });
    }
  }
  return items;
}

function guessCategory(name, categories) {
  const n = name.replace(/\s/g, "");
  if (/布団|ふとん|シーツ|毛布/.test(n)) return "布団類";
  if (/ドライ|ジャケット|コート|スーツ/.test(n)) return "ドライ";
  if (/タオル|バス|フェイス/.test(n)) return "タオル類";
  if (/浴衣|着物|帯/.test(n)) return "浴衣・着物";
  if (/白衣|制服|作業着/.test(n)) return "白衣・制服";
  return categories.includes("その他") ? "その他" : categories[categories.length - 1];
}

const categories = ["布団類", "ドライ", "タオル類", "浴衣・着物", "白衣・制服", "その他"];

const excelPath = findExcel();
const workbook = XLSX.read(readFileSync(excelPath), { type: "buffer", cellDates: true });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
const baseItems = parseBaseItems(rows, categories);

const backup = JSON.parse(readFileSync(backupPath, "utf8"));
const nameToId = new Map(backup.customers.map((c) => [c.name, c.id]));

const products = backup.products.map((p) => ({
  code: p.code,
  name: p.name,
  category: guessCategory(p.name, categories),
}));

const productByName = new Map();
for (const p of products) {
  const key = p.name.replace(/\s/g, "").toLowerCase();
  productByName.set(key, p);
}

const basePrices = [];
let priced = 0;
for (const item of baseItems) {
  if (item.price == null) continue;
  const key = item.name.replace(/\s/g, "").toLowerCase();
  let product = productByName.get(key);
  if (!product) {
    for (const [pk, p] of productByName) {
      if (pk.includes(key) || key.includes(pk)) {
        product = p;
        break;
      }
    }
  }
  if (product) {
    basePrices.push({ code: product.code, price: item.price });
    priced++;
  }
}

const today = new Date().toISOString().slice(0, 10);
const prices = backup.prices
  .map((p) => {
    const customerId = nameToId.get(p.customer);
    if (!customerId) return null;
    return { customerId, code: p.code, price: p.price, effectiveFrom: today };
  })
  .filter(Boolean);

const restoreData = {
  meta: {
    effectiveFrom: today,
    revisionName: "復元（伝票JSON + 基本価格表Excel）",
    updatedAt: today,
    source: "import",
    syncedAt: new Date().toISOString(),
  },
  categories,
  customers: backup.customers.map((c) => ({
    id: c.id,
    name: c.name,
    kana: "",
    frequentCodes: [],
  })),
  products,
  basePrices,
  prices,
};

const outPath = join(root, "restore", "price-lookup-restore.json");
writeFileSync(outPath, JSON.stringify(restoreData, null, 2), "utf8");
console.log(`Excel: ${excelPath}`);
console.log(`基本単価: ${priced}件 / Excel品目: ${baseItems.length}件`);
console.log(`客先: ${restoreData.customers.length}件 品番: ${products.length}件`);
console.log(`出力: ${outPath}`);
