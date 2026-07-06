import { useCallback, useEffect, useMemo, useState } from "react";
import { ScreenScrollLayout } from "../components/ScreenScrollLayout";
import { useDragReorder } from "../hooks/useDragReorder";
import {
  addCategory,
  addProduct,
  countByCategory,
  moveCategory,
  removeCategory,
  removeProduct,
  renameCategory,
  updateProduct,
} from "../lib/productMaster";
import type { PriceData } from "../types";
import { normalizeQuery } from "../utils/format";
import {
  initProductOrderFromProducts,
  reorderDisplayedProducts,
} from "../utils/productOrder";
import { sortProducts, type ProductSortBy } from "../utils/sortProducts";

type Props = {
  data: PriceData;
  onUpdate: (data: PriceData) => void;
  onBack: () => void;
};

type Tab = "products" | "genres";

export function ProductMasterScreen({ data, onUpdate, onBack }: Props) {
  const [tab, setTab] = useState<Tab>("products");
  const [editMode, setEditMode] = useState(false);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<ProductSortBy>("genre");
  const [filterCategory, setFilterCategory] = useState<string | "all">("all");
  const [newGenre, setNewGenre] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState(
    () => data.categories[0] ?? "その他",
  );
  const [editingGenre, setEditingGenre] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(
    () => countByCategory(data.products, data.categories),
    [data.products, data.categories],
  );

  const filtered = useMemo(() => {
    let list = [...data.products];

    if (filterCategory !== "all") {
      list = list.filter((p) => p.category === filterCategory);
    }
    const q = normalizeQuery(query);
    if (q) {
      list = list.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.name.includes(query.trim()),
      );
    }

    return sortProducts(list, data.categories, sortBy, data.productOrder);
  }, [data.products, data.categories, data.productOrder, filterCategory, query, sortBy]);

  const handleSortChange = (next: ProductSortBy) => {
    if (next === "manual" && !data.productOrder?.length) {
      const current = sortProducts(
        filtered,
        data.categories,
        sortBy,
        data.productOrder,
      );
      onUpdate(initProductOrderFromProducts(data, current));
    }
    setSortBy(next);
  };

  const displayCodes = useMemo(
    () => filtered.map((p) => p.code),
    [filtered],
  );

  const handleReorder = useCallback(
    (from: number, to: number) => {
      onUpdate(reorderDisplayedProducts(data, displayCodes, from, to));
    },
    [data, displayCodes, onUpdate],
  );

  const getDragProps = useDragReorder(handleReorder);

  const run = (fn: () => PriceData) => {
    setError(null);
    try {
      onUpdate(fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作できませんでした");
    }
  };

  const tryUpdate = (fn: () => PriceData): boolean => {
    setError(null);
    try {
      onUpdate(fn());
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作できませんでした");
      return false;
    }
  };

  const defaultCategory = data.categories.includes("その他")
    ? "その他"
    : (data.categories[data.categories.length - 1] ?? "その他");

  return (
    <ScreenScrollLayout
      paneId="product-master"
      className="product-master-screen pm-fullscreen"
      fixed={
        <>
        <div className="pm-header-row">
          <button type="button" className="pm-back" onClick={onBack}>
            ← 客先へ
          </button>
          <h1 className="pm-title">品目マスタ</h1>

          <div className="pm-tab-toggle">
            <button
              type="button"
              className={`pm-tab-btn${tab === "products" ? " active" : ""}`}
              onClick={() => setTab("products")}
            >
              品目（{data.products.length}）
            </button>
            <button
              type="button"
              className={`pm-tab-btn pm-tab-btn-genre${tab === "genres" ? " active" : ""}`}
              onClick={() => setTab("genres")}
            >
              ジャンル（{data.categories.length}）
            </button>
          </div>

          <button
            type="button"
            className={`base-btn ${editMode ? "base-btn-editor-active" : "base-btn-editor"}`}
            onClick={() => setEditMode((v) => !v)}
          >
            {editMode ? "閲覧に戻す" : "編集"}
          </button>
        </div>

        {error && <div className="notice notice-err">{error}</div>}

        {tab === "products" && (
          <div className="pm-product-toolbar">
            {editMode && (
              <>
                <input
                  className="pm-input pm-input-code"
                  placeholder="品番（空欄で自動）"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                />
                <input
                  className="pm-input pm-input-name"
                  placeholder="品名"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <select
                  className="pm-select"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  {data.categories.map((cat) => (
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
              </>
            )}

            <div className="pm-search">
              <input
                type="search"
                placeholder="検索"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="pm-sort-toggle">
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
                <span className="base-sort-hint">ドラッグで並替</span>
              )}
            </div>

            <div className="pm-filter-chips">
              <button
                type="button"
                className={`pm-chip${filterCategory === "all" ? " active" : ""}`}
                onClick={() => setFilterCategory("all")}
              >
                全て
              </button>
              {data.categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`pm-chip${filterCategory === cat ? " active" : ""}`}
                  onClick={() => setFilterCategory(cat)}
                >
                  {cat}({counts[cat] ?? 0})
                </button>
              ))}
            </div>

            <span className="pm-count">{filtered.length}件</span>
          </div>
        )}

        {tab === "genres" && editMode && (
          <div className="pm-genre-toolbar">
            <input
              className="pm-input"
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
            <span className="pm-genre-hint">
              並び順は一覧表の列順に反映されます
            </span>
          </div>
        )}
        </>
      }
      footer={undefined}
    >
        {tab === "products" && (
          <>
            {editMode ? (
              <div className="master-table-wrap">
                <table className={`master-table${sortBy === "manual" ? " master-table--draggable" : ""}`}>
                  <thead>
                    <tr>
                      {sortBy === "manual" && <th className="col-drag" aria-label="並替" />}
                      <th>品番</th>
                      <th>品名</th>
                      <th>ジャンル</th>
                      <th aria-label="操作" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((product, index) => (
                      <ProductRow
                        key={product.code}
                        product={product}
                        categories={data.categories}
                        draggable={sortBy === "manual"}
                        dragProps={sortBy === "manual" ? getDragProps(index) : undefined}
                        onUpdate={(updates) =>
                          tryUpdate(() => updateProduct(data, product.code, updates))
                        }
                        onDelete={() => {
                          if (
                            confirm(
                              `「${product.code} ${product.name}」を削除しますか？\n単価データも消えます。`,
                            )
                          ) {
                            run(() => removeProduct(data, product.code));
                          }
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : sortBy === "manual" ? (
              <DraggableProductList
                products={filtered}
                getDragProps={getDragProps}
              />
            ) : (
              <ReadonlyProductColumns products={filtered} />
            )}

            {filtered.length === 0 && (
              <p className="settings-desc master-empty">
                品目がありません。上のフォームから追加するか、連携画面から伝票データを取込してください。
              </p>
            )}
          </>
        )}

        {tab === "genres" && (
          <ul className="genre-list">
            {data.categories.map((genre, index) => (
              <li key={genre} className="genre-row">
                <span className="genre-order">{index + 1}</span>
                {editMode && editingGenre === genre ? (
                  <input
                    className="settings-input genre-rename-input"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <span className="genre-name">
                    {genre}
                    <span className="genre-count">
                      （{counts[genre] ?? 0}品目）
                    </span>
                  </span>
                )}
                {editMode && (
                <div className="genre-actions">
                  {editingGenre === genre ? (
                    <>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => {
                          run(() => renameCategory(data, genre, editingName));
                          setEditingGenre(null);
                        }}
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => setEditingGenre(null)}
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn-icon"
                        disabled={index === 0}
                        onClick={() => run(() => moveCategory(data, index, -1))}
                        aria-label="上へ"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        disabled={index === data.categories.length - 1}
                        onClick={() => run(() => moveCategory(data, index, 1))}
                        aria-label="下へ"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => {
                          setEditingGenre(genre);
                          setEditingName(genre);
                        }}
                      >
                        名前変更
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-icon-danger"
                        onClick={() => {
                          if (
                            confirm(
                              `「${genre}」を削除しますか？\n品目は「その他」などに移されます。`,
                            )
                          ) {
                            run(() => removeCategory(data, genre));
                          }
                        }}
                      >
                        削除
                      </button>
                    </>
                  )}
                </div>
                )}
              </li>
            ))}
          </ul>
        )}
    </ScreenScrollLayout>
  );
}

type ProductRowProps = {
  product: PriceData["products"][number];
  categories: string[];
  draggable?: boolean;
  dragProps?: {
    draggable: boolean;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
  onUpdate: (updates: {
    name?: string;
    category?: string;
    code?: string;
  }) => boolean;
  onDelete: () => void;
};

function ProductRow({
  product,
  categories,
  draggable = false,
  dragProps,
  onUpdate,
  onDelete,
}: ProductRowProps) {
  const [code, setCode] = useState(product.code);
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);

  useEffect(() => {
    setCode(product.code);
    setName(product.name);
    setCategory(product.category);
  }, [product.code, product.name, product.category]);

  const revert = () => {
    setCode(product.code);
    setName(product.name);
    setCategory(product.category);
  };

  const saveIfChanged = () => {
    const updates: { name?: string; category?: string; code?: string } = {};
    if (name.trim() !== product.name) updates.name = name;
    if (category !== product.category) updates.category = category;
    if (code.trim() !== product.code) updates.code = code;
    if (Object.keys(updates).length > 0 && !onUpdate(updates)) {
      revert();
    }
  };

  return (
    <tr
      className={draggable ? "master-row--draggable" : undefined}
      {...(dragProps ?? {})}
    >
      {draggable && (
        <td className="col-drag">
          <span className="drag-handle" aria-hidden="true">
            ⋮⋮
          </span>
        </td>
      )}
      <td className="master-code">
        <input
          className="master-field-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onBlur={saveIfChanged}
        />
      </td>
      <td className="master-name">
        <input
          className="master-field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveIfChanged}
        />
      </td>
      <td className="master-category">
        <select
          className="category-select"
          value={category}
          onChange={(e) => {
            const next = e.target.value;
            setCategory(next);
            if (!onUpdate({ category: next })) {
              setCategory(product.category);
            }
          }}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </td>
      <td className="master-actions">
        <button type="button" className="btn-delete-small" onClick={onDelete}>
          削除
        </button>
      </td>
    </tr>
  );
}

function DraggableProductList({
  products,
  getDragProps,
}: {
  products: PriceData["products"];
  getDragProps: (index: number) => {
    draggable: boolean;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
}) {
  return (
    <div className="master-table-wrap">
      <table className="master-table master-table--draggable">
        <thead>
          <tr>
            <th className="col-drag" aria-label="並替" />
            <th>品番</th>
            <th>品名</th>
            <th>ジャンル</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, index) => (
            <tr
              key={p.code}
              className="master-row--draggable"
              {...getDragProps(index)}
            >
              <td className="col-drag">
                <span className="drag-handle" aria-hidden="true">
                  ⋮⋮
                </span>
              </td>
              <td className="master-code">{p.code}</td>
              <td className="master-name">{p.name}</td>
              <td className="master-category">{p.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReadonlyProductColumns({ products }: { products: PriceData["products"] }) {
  const half = Math.ceil(products.length / 2);
  const left = products.slice(0, half);
  const right = products.slice(half);

  const renderTable = (items: PriceData["products"]) => (
    <div className="master-table-wrap master-table-col">
      <table className="master-table">
        <thead>
          <tr>
            <th>品番</th>
            <th>品名</th>
            <th>ジャンル</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.code}>
              <td className="master-code">{p.code}</td>
              <td className="master-name">{p.name}</td>
              <td className="master-category">{p.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="master-two-col">
      {renderTable(left)}
      {renderTable(right)}
    </div>
  );
}
