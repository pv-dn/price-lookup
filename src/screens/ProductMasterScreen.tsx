import { useMemo, useState } from "react";
import {
  addCategory,
  countByCategory,
  moveCategory,
  removeCategory,
  renameCategory,
  updateProductCategory,
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

  return (
    <div className="screen product-master-screen">
      <header className="screen-header with-back">
        <button type="button" className="back-button" onClick={onBack}>
          ← 戻る
        </button>
        <h1>品目マスタ</h1>
        <p className="screen-subtitle">
          品番・品名は伝票から取込。ジャンルはここで編集
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
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.code}>
                    <td className="master-code">{product.code}</td>
                    <td className="master-name">{product.name}</td>
                    <td className="master-category">
                      <select
                        className="category-select"
                        value={product.category}
                        onChange={(e) =>
                          run(() =>
                            updateProductCategory(
                              data,
                              product.code,
                              e.target.value,
                            ),
                          )
                        }
                      >
                        {data.categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <p className="settings-desc" style={{ textAlign: "center", marginTop: 24 }}>
              品目がありません。連携画面から伝票データを取込してください。
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
