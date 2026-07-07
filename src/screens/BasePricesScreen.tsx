import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { BasePriceSheetView } from "../components/BasePriceSheetView";
import { GenreVisibilityBar } from "../components/GenreVisibilityBar";
import { ScreenScrollLayout } from "../components/ScreenScrollLayout";
import { useGenreVisibility } from "../hooks/useGenreVisibility";
import { useSheetColumnWidths } from "../hooks/useSheetColumnWidths";
import {
  addCategory,
  addProduct,
  moveCategory,
  removeCategory,
  removeProduct,
  renameCategory,
  updateProduct,
} from "../lib/productMaster";
import type { PriceData } from "../types";
import { formatDate, formatYen, normalizeQuery } from "../utils/format";
import {
  initProductOrderFromProducts,
  reorderDisplayedProducts,
} from "../utils/productOrder";
import { sortProducts, type ProductSortBy } from "../utils/sortProducts";

type ViewMode = "list" | "sheet";

function hasDraftPrice(draft: Map<string, string>, code: string): boolean {
  const raw = draft.get(code)?.trim() ?? "";
  if (!raw) return false;
  const n = parseInt(raw, 10);
  return !Number.isNaN(n) && n > 0;
}

type Props = {
  data: PriceData;
  onUpdate: (data: PriceData) => void;
  onSave: (
    entries: { code: string; price: number }[],
    effectiveFrom: string,
  ) => void;
  onImportExcel: (file: File) => Promise<string>;
};

export function BasePricesScreen({
  data,
  onUpdate,
  onSave,
  onImportExcel,
}: Props) {
  const { products, categories, basePrices, meta } = data;

  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("sheet");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [priceEditMode, setPriceEditMode] = useState(
    () => data.basePrices.length === 0,
  );
  const [sortBy, setSortBy] = useState<ProductSortBy>("genre");
  const [showEditor, setShowEditor] = useState(false);
  const excelRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<Map<string, string>>(() => new Map());
  const [draftEffectiveFrom, setDraftEffectiveFrom] = useState(
    () => meta.effectiveFrom || "",
  );

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState(() => categories[0] ?? "その他");
  const [newGenre, setNewGenre] = useState("");
  const [editingGenre, setEditingGenre] = useState<string | null>(null);
  const [editingGenreName, setEditingGenreName] = useState("");
  const [editorError, setEditorError] = useState<string | null>(null);

  useEffect(() => {
    const m = new Map<string, string>();
    for (const p of basePrices) {
      m.set(p.code, String(p.price));
    }
    setDraft(m);
  }, [basePrices]);

  useEffect(() => {
    setDraftEffectiveFrom(meta.effectiveFrom || "");
  }, [meta.effectiveFrom]);

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

  const displayProducts = useMemo(() => {
    let list = filtered;
    if (!priceEditMode && data.basePrices.length > 0) {
      list = list.filter((p) => hasDraftPrice(draft, p.code));
    }
    return sortProducts(list, categories, sortBy, data.productOrder);
  }, [filtered, priceEditMode, draft, categories, sortBy, data.productOrder, data.basePrices.length]);

  const handleSortChange = (next: ProductSortBy) => {
    if (next === "manual" && !data.productOrder?.length) {
      const current = sortProducts(filtered, categories, sortBy, data.productOrder);
      onUpdate(initProductOrderFromProducts(data, current));
    }
    if (next === "manual") {
      setViewMode("sheet");
    }
    setSortBy(next);
  };

  const handleReorderInGroup = useCallback(
    (_groupLabel: string, codes: string[], from: number, to: number) => {
      onUpdate(reorderDisplayedProducts(data, codes, from, to));
    },
    [data, onUpdate],
  );

  const { getWidth: getColumnWidth, startResize: startColumnResize } =
    useSheetColumnWidths();

  const { hidden, isVisible, toggle, showAll, allVisible } = useGenreVisibility(categories);

  const sheetBrowseLayout = !priceEditMode && viewMode === "sheet";

  const handleSave = () => {
    if (!draftEffectiveFrom.trim()) {
      setNotice({ text: "適用開始日を入力してください", type: "err" });
      return;
    }
    const entries: { code: string; price: number }[] = [];
    for (const [code, raw] of draft) {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n) && n > 0) entries.push({ code, price: n });
    }
    onSave(entries, draftEffectiveFrom.trim());
    setNotice({ text: "基本単価を保存しました（クラウドにも同期します）", type: "ok" });
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

  const run = (fn: () => PriceData) => {
    setEditorError(null);
    try {
      onUpdate(fn());
    } catch (e) {
      setEditorError(e instanceof Error ? e.message : "操作できませんでした");
    }
  };

  const handleEditProduct = (code: string, updates: { name?: string; category?: string }) => {
    setEditorError(null);
    try {
      onUpdate(updateProduct(data, code, updates));
    } catch (e) {
      setEditorError(e instanceof Error ? e.message : "操作できませんでした");
    }
  };

  const handleDeleteProduct = (code: string, name: string) => {
    if (confirm(`「${code} ${name}」を削除しますか？\n単価データも消えます。`)) {
      run(() => removeProduct(data, code));
    }
  };

  const defaultCategory = categories.includes("その他")
    ? "その他"
    : (categories[categories.length - 1] ?? "その他");

  const filledCount = [...draft.values()].filter((v) => v.trim() !== "").length;
  const isSheet = viewMode === "sheet";

  return (
    <ScreenScrollLayout
      paneId={isSheet ? "base-prices-sheet" : "base-prices-list"}
      bodyVariant={isSheet ? "sheet" : "scroll"}
      className={`search-screen${isSheet ? " search-screen--sheet" : ""}${fullscreen ? " base-fullscreen" : ""}`}
      fixed={
        <>
        <div className="base-header-row">
          {!fullscreen && (
            <div className="base-header-title">
              <p className="label">全客先共通</p>
              <h1 className="base-header-name">基本価格表</h1>
              {priceEditMode ? (
                <label className="base-effective-date-edit">
                  <span className="base-effective-date-label">適用開始日</span>
                  <input
                    type="date"
                    className="base-effective-date-input"
                    value={draftEffectiveFrom}
                    onChange={(e) => setDraftEffectiveFrom(e.target.value)}
                  />
                </label>
              ) : (
                meta.effectiveFrom && (
                  <p className="base-effective-date">
                    適用開始日: {formatDate(meta.effectiveFrom)}
                  </p>
                )
              )}
            </div>
          )}

          <label className={`base-btn base-btn-excel${busy ? " disabled" : ""}`}>
            Excel
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

          <div className="search-box base-btn-search">
            <input
              type="search"
              placeholder="検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="base-btn-toggle" role="tablist" aria-label="表示形式">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "sheet"}
              className={`base-toggle-btn${viewMode === "sheet" ? " active" : ""}`}
              onClick={() => setViewMode("sheet")}
            >
              一覧表
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "list"}
              className={`base-toggle-btn${viewMode === "list" ? " active" : ""}`}
              onClick={() => setViewMode("list")}
            >
              リスト
            </button>
          </div>

          <button
            type="button"
            className={`base-btn ${priceEditMode ? "base-btn-editor-active" : "base-btn-edit-price"}`}
            onClick={() => setPriceEditMode((v) => !v)}
          >
            {priceEditMode ? "閲覧" : "編集"}
          </button>

          {priceEditMode && (
            <button type="button" className="base-btn base-btn-save" onClick={handleSave}>
              保存
            </button>
          )}

          <button
            type="button"
            className={`base-btn ${showEditor ? "base-btn-editor-active" : "base-btn-editor"}`}
            onClick={() => setShowEditor((s) => !s)}
            title="品目・ジャンルの追加・編集"
          >
            {showEditor ? "閉じる" : "＋品目"}
          </button>

          <button
            type="button"
            className={`base-btn ${fullscreen ? "base-btn-exit-fs" : "base-btn-fs"}`}
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? "通常表示に戻す" : "全画面表示"}
          >
            {fullscreen ? "戻る" : "全画面"}
          </button>

          <span className="base-count">{filledCount}件</span>
        </div>

        <div className="base-sort-row">
          <span className="pm-sort-label">並替</span>
          <button
            type="button"
            className={`pm-chip${sortBy === "genre" ? " active" : ""}`}
            onClick={() => handleSortChange("genre")}
          >
            ジャンル
          </button>
          <button
            type="button"
            className={`pm-chip${sortBy === "name" ? " active" : ""}`}
            onClick={() => handleSortChange("name")}
          >
            あいうえお
          </button>
          <button
            type="button"
            className={`pm-chip${sortBy === "code" ? " active" : ""}`}
            onClick={() => handleSortChange("code")}
          >
            品番
          </button>
          <button
            type="button"
            className={`pm-chip${sortBy === "manual" ? " active" : ""}`}
            onClick={() => handleSortChange("manual")}
          >
            手動
          </button>
          {sortBy === "manual" && (
            <span className="base-sort-hint">一覧表でドラッグして並替・列幅調整</span>
          )}
        </div>

        {viewMode === "sheet" && (
          <GenreVisibilityBar
            categories={categories}
            isVisible={isVisible}
            onToggle={toggle}
            onShowAll={showAll}
            allVisible={allVisible}
          />
        )}

        {showEditor && (
          <div className="base-editor-panel">
            {editorError && <div className="notice notice-err">{editorError}</div>}

            <div className="base-editor-section">
              <h3 className="base-editor-heading">品目を追加</h3>
              <div className="base-editor-add-row">
                <input
                  className="base-editor-input"
                  placeholder="品番（空欄で自動）"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                />
                <input
                  className="base-editor-input base-editor-input-name"
                  placeholder="品名"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <select
                  className="base-editor-select"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="base-btn base-btn-save"
                  disabled={!newName.trim()}
                  onClick={() => {
                    run(() => addProduct(data, newCode, newName, newCategory));
                    setNewCode("");
                    setNewName("");
                    setNewCategory(defaultCategory);
                  }}
                >
                  追加
                </button>
              </div>
            </div>

            <div className="base-editor-section">
              <h3 className="base-editor-heading">ジャンル</h3>
              <div className="base-editor-genres">
                {categories.map((genre, index) => (
                  <div key={genre} className="base-editor-genre-row">
                    {editingGenre === genre ? (
                      <>
                        <input
                          className="base-editor-input"
                          value={editingGenreName}
                          onChange={(e) => setEditingGenreName(e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="base-editor-genre-btn"
                          onClick={() => {
                            run(() => renameCategory(data, genre, editingGenreName));
                            setEditingGenre(null);
                          }}
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          className="base-editor-genre-btn"
                          onClick={() => setEditingGenre(null)}
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="base-editor-genre-name">{genre}</span>
                        <button
                          type="button"
                          className="base-editor-genre-btn"
                          onClick={() => {
                            setEditingGenre(genre);
                            setEditingGenreName(genre);
                          }}
                          title="名前変更"
                        >
                          変更
                        </button>
                        <button
                          type="button"
                          className="base-editor-genre-btn"
                          disabled={index === 0}
                          onClick={() => run(() => moveCategory(data, index, -1))}
                          title="上に移動"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="base-editor-genre-btn"
                          disabled={index === categories.length - 1}
                          onClick={() => run(() => moveCategory(data, index, 1))}
                          title="下に移動"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="base-editor-genre-btn base-editor-genre-btn-danger"
                          disabled={categories.length <= 1}
                          onClick={() => {
                            if (confirm(`「${genre}」を削除しますか？\n品目は別ジャンルに移されます。`)) {
                              run(() => removeCategory(data, genre));
                            }
                          }}
                          title="削除"
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                ))}
                <div className="base-editor-add-row">
                  <input
                    className="base-editor-input"
                    placeholder="新しいジャンル名"
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                  />
                  <button
                    type="button"
                    className="base-btn base-btn-save"
                    disabled={!newGenre.trim()}
                    onClick={() => {
                      run(() => addCategory(data, newGenre));
                      setNewGenre("");
                    }}
                  >
                    追加
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {notice && (
          <div className={`notice ${notice.type === "ok" ? "notice-ok" : "notice-err"}`}>
            {notice.text}
          </div>
        )}
        </>
      }
      footer={undefined}
    >
        {viewMode === "sheet" ? (
          <BasePriceSheetView
            products={displayProducts}
            categories={categories}
            draft={draft}
            readOnly={!priceEditMode}
            allowRowReorder={sheetBrowseLayout && sortBy === "manual"}
            allowColumnResize={sheetBrowseLayout}
            getColumnWidth={getColumnWidth}
            onColumnResizeStart={startColumnResize}
            onReorderInGroup={handleReorderInGroup}
            onSetPrice={setPrice}
            onEditProduct={showEditor ? handleEditProduct : undefined}
            onDeleteProduct={showEditor ? handleDeleteProduct : undefined}
            hiddenGenres={hidden}
          />
        ) : (
          <ul className="manual-price-list">
            {displayProducts.map((product) => (
              <li key={product.code} className="manual-price-row">
                <div className="manual-price-info">
                  <span className="list-item-code">{product.code}</span>
                  {showEditor ? (
                    <EditableProductName
                      name={product.name}
                      onSave={(name) => handleEditProduct(product.code, { name })}
                    />
                  ) : (
                    <span className="list-item-title">{product.name}</span>
                  )}
                </div>
                {priceEditMode ? (
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
                ) : (
                  <span className="base-price-readonly">
                    {formatYen(parseInt(draft.get(product.code) ?? "0", 10))}
                  </span>
                )}
                {showEditor && (
                  <button
                    type="button"
                    className="base-inline-delete"
                    onClick={() => handleDeleteProduct(product.code, product.name)}
                    title="削除"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
            {displayProducts.length === 0 && (
              <p className="settings-desc master-empty">
                {priceEditMode
                  ? "品目がありません。"
                  : "単価が設定された品目がありません。「編集」から入力できます。"}
              </p>
            )}
          </ul>
        )}
    </ScreenScrollLayout>
  );
}

function EditableProductName({
  name,
  onSave,
}: {
  name: string;
  onSave: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  useEffect(() => {
    setValue(name);
  }, [name]);

  if (!editing) {
    return (
      <span
        className="list-item-title base-editable-name"
        onClick={() => setEditing(true)}
        title="クリックで品名を編集"
      >
        {name}
      </span>
    );
  }

  return (
    <input
      className="base-inline-name-input"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value.trim() && value.trim() !== name) {
          onSave(value.trim());
        } else {
          setValue(name);
        }
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        } else if (e.key === "Escape") {
          setValue(name);
          setEditing(false);
        }
      }}
      autoFocus
    />
  );
}
