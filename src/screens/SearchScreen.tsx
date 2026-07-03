import { useMemo, useState } from "react";
import {
  ProductCompactView,
  ProductListView,
  ProductSheetView,
} from "../components/ProductViews";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { useViewMode } from "../hooks/useViewMode";
import type { Customer, PriceEntry, Product } from "../types";
import { normalizeQuery } from "../utils/format";

type Props = {
  customer: Customer;
  products: Product[];
  prices: PriceEntry[];
  categories: string[];
  onSelectProduct: (code: string) => void;
  onBack: () => void;
  onEditPrices?: () => void;
};

export function SearchScreen({
  customer,
  products,
  prices,
  categories,
  onSelectProduct,
  onBack,
  onEditPrices,
}: Props) {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useViewMode("list");

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.code, p])),
    [products],
  );

  const frequentCodes = useMemo(
    () => new Set(customer.frequentCodes),
    [customer.frequentCodes],
  );

  const frequentProducts = useMemo(
    () =>
      customer.frequentCodes
        .map((code) => productMap.get(code))
        .filter((p): p is Product => p !== undefined),
    [customer.frequentCodes, productMap],
  );

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

  const showFrequent = !query.trim() && frequentProducts.length > 0;

  const viewProps = {
    customerId: customer.id,
    prices,
    categories,
    highlightCodes: showFrequent ? frequentCodes : undefined,
    onSelect: onSelectProduct,
  };

  const MainView =
    viewMode === "sheet"
      ? ProductSheetView
      : viewMode === "compact"
        ? ProductCompactView
        : ProductListView;

  const isSheet = viewMode === "sheet";

  return (
    <div className={`screen screen-scroll-layout search-screen${isSheet ? " search-screen--sheet" : ""}`}>
      <div className="screen-scroll-fixed">
        <header className={`screen-header with-back${isSheet ? " screen-header-compact" : ""}`}>
          <button type="button" className="back-button" onClick={onBack}>
            ← 戻る
          </button>
          <div>
            <p className="label">選択中の客先</p>
            <h1 className={isSheet ? "customer-name-sm" : "customer-name"}>
              {customer.name}
            </h1>
          </div>
        </header>

        {customer.manual && onEditPrices && !isSheet && (
          <button type="button" className="btn btn-secondary manual-edit-btn" onClick={onEditPrices}>
            この客先の単価を編集
          </button>
        )}

        <div className="search-box">
          <input
            type="search"
            placeholder="品番 or 商品名で検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <ViewModeToggle value={viewMode} onChange={setViewMode} />

        {showFrequent && viewMode !== "list" && viewMode !== "sheet" && (
          <p className="frequent-hint">よく出す品番は薄い青でハイライト</p>
        )}

        {!isSheet && (
          <p className="result-count">
            {query.trim() ? `検索結果 ${filtered.length}件` : `全品番 ${products.length}件`}
          </p>
        )}

        {isSheet && !query.trim() && (
          <p className="result-count sheet-hint">
            Excelのようにカテゴリ別に並べています（{filtered.length}品目）
          </p>
        )}
      </div>

      <div className="screen-scroll-body">
        {showFrequent && viewMode === "list" && (
          <section className="section">
            <h2 className="section-title">よく出す品番</h2>
            <ProductListView
              products={frequentProducts}
              {...viewProps}
              highlightCodes={frequentCodes}
            />
          </section>
        )}

        <MainView products={filtered} {...viewProps} />
      </div>
    </div>
  );
}
