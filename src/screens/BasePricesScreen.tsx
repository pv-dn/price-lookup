import { useEffect, useMemo, useRef, useState } from "react";
import { BasePriceSheetView } from "../components/BasePriceSheetView";
import { ScreenScrollLayout } from "../components/ScreenScrollLayout";
import type { PriceData, Product } from "../types";
import { normalizeQuery } from "../utils/format";

type ViewMode = "list" | "sheet";

type Props = {
  products: Product[];
  categories: string[];
  basePrices: PriceData["basePrices"];
  onSave: (entries: { code: string; price: number }[]) => void;
  onImportExcel: (file: File) => Promise<string>;
};

export function BasePricesScreen({
  products,
  categories,
  basePrices,
  onSave,
  onImportExcel,
}: Props) {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("sheet");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const excelRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    const m = new Map<string, string>();
    for (const p of basePrices) {
      m.set(p.code, String(p.price));
    }
    setDraft(m);
  }, [basePrices]);

  const filtered = useMemo(() => {
    const q = normalizeQuery(query);
    if (!q) return products;
    return products.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.name.includes(query.trim()),
    );
  }, [products, query]);

  const handleSave = () => {
    const entries: { code: string; price: number }[] = [];
    for (const [code, raw] of draft) {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n) && n > 0) entries.push({ code, price: n });
    }
    onSave(entries);
    setNotice({ text: "基本単価を保存しました", type: "ok" });
  };

  const setPrice = (code: string, value: string) => {
    setDraft((prev) => {
      const next = new Map(prev);
      if (value.trim() === "") next.delete(code);
      else next.set(code, value);
      return next;
    });
  };

  const handleExcelImport = async (file: File) => {
    setBusy(true);
    setNotice(null);
    try {
      const message = await onImportExcel(file);
      setNotice({ text: message, type: "ok" });
    } catch (e) {
      setNotice({
        text: e instanceof Error ? e.message : "Excel取込に失敗しました",
        type: "err",
      });
    } finally {
      setBusy(false);
      if (excelRef.current) excelRef.current.value = "";
    }
  };

  const filledCount = [...draft.values()].filter((v) => v.trim() !== "").length;
  const isSheet = viewMode === "sheet";

  return (
    <ScreenScrollLayout
      paneId={isSheet ? "base-prices-sheet" : "base-prices-list"}
      bodyVariant={isSheet ? "sheet" : "scroll"}
      className={`search-screen${isSheet ? " search-screen--sheet" : ""}`}
      fixed={
        <>
        <header className="screen-header">
          <p className="label">全客先共通</p>
          <h1 className="customer-name">基本価格表</h1>
        </header>

        <p className="settings-desc">
          「かかくひょう」ひな型（.xlsx）の読み込みと編集ができます（{filledCount}
          件設定中）。個別の客先価格はこの表をベースに調整します。
        </p>

        <label className={`btn btn-secondary file-label${busy ? " disabled" : ""}`}>
          Excelから読み込む
          <input
            ref={excelRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={busy}
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleExcelImport(f);
            }}
          />
        </label>

        <div className="search-box">
          <input
            type="search"
            placeholder="品番 or 商品名で検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="view-toggle" role="tablist" aria-label="表示形式">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "sheet"}
            className={`view-toggle-btn${viewMode === "sheet" ? " active" : ""}`}
            onClick={() => setViewMode("sheet")}
          >
            一覧表
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "list"}
            className={`view-toggle-btn${viewMode === "list" ? " active" : ""}`}
            onClick={() => setViewMode("list")}
          >
            リスト
          </button>
        </div>

        {isSheet && !query.trim() && (
          <p className="result-count sheet-hint">
            Excelのようにカテゴリ別に並べています（{filtered.length}品目）
          </p>
        )}

        {!isSheet && (
          <p className="result-count">
            {query.trim() ? `検索結果 ${filtered.length}件` : `全品番 ${products.length}件`}
          </p>
        )}

        {notice && (
          <div className={`notice ${notice.type === "ok" ? "notice-ok" : "notice-err"}`}>
            {notice.text}
          </div>
        )}
        </>
      }
      footer={
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          基本単価を保存
        </button>
      }
    >
        {viewMode === "sheet" ? (
          <BasePriceSheetView
            products={filtered}
            categories={categories}
            draft={draft}
            onSetPrice={setPrice}
          />
        ) : (
          <ul className="manual-price-list">
            {filtered.map((product) => (
              <li key={product.code} className="manual-price-row">
                <div className="manual-price-info">
                  <span className="list-item-code">{product.code}</span>
                  <span className="list-item-title">{product.name}</span>
                </div>
                <div className="manual-price-input-wrap">
                  <span className="manual-yen">¥</span>
                  <input
                    type="number"
                    className="manual-price-input"
                    inputMode="numeric"
                    placeholder="—"
                    value={draft.get(product.code) ?? ""}
                    onChange={(e) => setPrice(product.code, e.target.value)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
    </ScreenScrollLayout>
  );
}
