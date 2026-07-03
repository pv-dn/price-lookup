import { useEffect, useMemo, useState } from "react";
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

type Props = {
  data: PriceData;
  onUpdate: (data: PriceData) => void;
  onBack: () => void;
};

type Tab = "products" | "genres";

export function ProductMasterScreen({ data, onUpdate, onBack }: Props) {
  const [tab, setTab] = useState<Tab>("products");
  const [query, setQuery] = useState("");
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
    let list = [...data.products].sort((a, b) =>
      a.code.localeCompare(b.code, "ja"),
    );
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
    return list;
  }, [data.products, filterCategory, query]);

  const run = (fn: () => PriceData) => {
    setError(null);
    try {
      onUpdate(fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作できませんでした");
    }
  };

  const defaultCategory = data.categories.includes("その他")
    ? "その他"
    : (data.categories[data.categories.length - 1] ?? "その他");

  return (
    <div className="screen product-master-screen">
      <header className="screen-header with-back">
        <button type="button" className="back-button" onClick={onBack}>
          ← 戻る
        </button>
        <h1>品目マスタ</h1>
        <p className="screen-subtitle">
          品目・ジャンルの追加・編集（伝票取込と併用できます）
        </p>
      </header>

      <div className="view-toggle master-tabs">
        <button
          type="button"
          className={`view-toggle-btn${tab === "products" ? " active" : ""}`}
          onClick={() => setTab("products")}
        >
          品目
        </button>
        <button
          type="button"
          className={`view-toggle-btn${tab === "genres" ? " active" : ""}`}
          onClick={() => setTab("genres")}
        >
          ジャンル
        </button>
      </div>

      {error && <div className="notice notice-err">{error}</div>}

      {tab === "products" && (
        <>
          <div className="add-product-box">
            <input
              className="settings-input master-field-code"
              placeholder="品番"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />
            <input
              className="settings-input master-field-name"
              placeholder="品名"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <select
              className="category-select master-field-category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              {data.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!newCode.trim() || !newName.trim()}
              onClick={() => {
                run(() => addProduct(data, newCode, newName, newCategory));
                setNewCode("");
                setNewName("");
                setNewCategory(defaultCategory);
              }}
            >
              品目を追加
            </button>
          </div>

          <div className="category-chips">
            <button
              type="button"
              className={`category-chip${filterCategory === "all" ? " active" : ""}`}
              onClick={() => setFilterCategory("all")}
            >
              すべて ({data.products.length})
            </button>
            {data.categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-chip${filterCategory === cat ? " active" : ""}`}
                onClick={() => setFilterCategory(cat)}
              >
                {cat} ({counts[cat] ?? 0})
              </button>
            ))}
          </div>

          <div className="search-box">
            <input
              type="search"
              placeholder="品番 or 品名で検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <p className="result-count">{filtered.length}件表示</p>

          <div className="master-table-wrap">
            <table className="master-table">
              <thead>
                <tr>
                  <th>品番</th>
                  <th>品名</th>
                  <th>ジャンル</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <ProductRow
                    key={product.code}
                    product={product}
                    categories={data.categories}
                    onUpdate={(updates) =>
                      run(() => updateProduct(data, product.code, updates))
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

          {filtered.length === 0 && (
            <p className="settings-desc" style={{ textAlign: "center", marginTop: 24 }}>
              品目がありません。上のフォームから追加するか、連携画面から伝票データを取込してください。
            </p>
          )}
        </>
      )}

      {tab === "genres" && (
        <>
          <p className="settings-desc">
            ジャンルの名前・並び順を編集します。一覧表の列順に反映されます。
          </p>

          <ul className="genre-list">
            {data.categories.map((genre, index) => (
              <li key={genre} className="genre-row">
                <span className="genre-order">{index + 1}</span>
                {editingGenre === genre ? (
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
              </li>
            ))}
          </ul>

          <div className="add-genre-box">
            <input
              className="settings-input"
              placeholder="新しいジャンル名"
              value={newGenre}
              onChange={(e) => setNewGenre(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={!newGenre.trim()}
              onClick={() => {
                run(() => addCategory(data, newGenre));
                setNewGenre("");
              }}
            >
              ジャンルを追加
            </button>
          </div>
        </>
      )}
    </div>
  );
}

type ProductRowProps = {
  product: PriceData["products"][number];
  categories: string[];
  onUpdate: (updates: { name?: string; category?: string; code?: string }) => void;
  onDelete: () => void;
};

function ProductRow({ product, categories, onUpdate, onDelete }: ProductRowProps) {
  const [code, setCode] = useState(product.code);
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);

  useEffect(() => {
    setCode(product.code);
    setName(product.name);
    setCategory(product.category);
  }, [product.code, product.name, product.category]);

  const saveIfChanged = () => {
    const updates: { name?: string; category?: string; code?: string } = {};
    if (name.trim() !== product.name) updates.name = name;
    if (category !== product.category) updates.category = category;
    if (code.trim() !== product.code) updates.code = code;
    if (Object.keys(updates).length > 0) onUpdate(updates);
  };

  return (
    <tr>
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
            setCategory(e.target.value);
            onUpdate({ category: e.target.value });
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
