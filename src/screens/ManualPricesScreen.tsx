import { useMemo, useState } from "react";
import type { Customer, PriceEntry, Product } from "../types";
import { normalizeQuery } from "../utils/format";

type Props = {
  customer: Customer;
  products: Product[];
  prices: PriceEntry[];
  onSave: (entries: { code: string; price: number }[]) => void;
  onBack: () => void;
};

export function ManualPricesScreen({
  customer,
  products,
  prices,
  onSave,
  onBack,
}: Props) {
  const [query, setQuery] = useState("");

  const initialMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of prices) {
      if (p.customerId === customer.id) m.set(p.code, String(p.price));
    }
    return m;
  }, [customer.id, prices]);

  const [draft, setDraft] = useState<Map<string, string>>(() => new Map(initialMap));

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
  };

  const setPrice = (code: string, value: string) => {
    setDraft((prev) => {
      const next = new Map(prev);
      if (value.trim() === "") next.delete(code);
      else next.set(code, value);
      return next;
    });
  };

  const filledCount = [...draft.values()].filter((v) => v.trim() !== "").length;

  return (
    <div className="screen">
      <header className="screen-header with-back">
        <button type="button" className="back-button" onClick={onBack}>
          ← 戻る
        </button>
        <div>
          <p className="label">手入力の客先</p>
          <h1 className="customer-name">{customer.name}</h1>
        </div>
      </header>

      <p className="settings-desc">
        品番は伝票アプリのマスタを使います。単価だけ入力してください（{filledCount}件設定中）
      </p>

      <div className="search-box">
        <input
          type="search"
          placeholder="品番 or 商品名で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

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

      <div className="actions sticky-actions">
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          単価を保存
        </button>
      </div>
    </div>
  );
}
