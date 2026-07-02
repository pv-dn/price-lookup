import type { PriceEntry, Product } from "../types";
import { displayPrice, displayPriceHint } from "../utils/price";
import { groupProductsByCategory } from "../utils/productGroups";

export type ProductViewProps = {
  products: Product[];
  customerId: string;
  prices: PriceEntry[];
  categories?: string[];
  highlightCodes?: Set<string>;
  onSelect: (code: string) => void;
};

function getPrice(
  prices: PriceEntry[],
  customerId: string,
  code: string,
): PriceEntry | undefined {
  return prices.find((p) => p.customerId === customerId && p.code === code);
}

function PriceCell({ price, accent }: { price?: PriceEntry; accent?: boolean }) {
  const hint = displayPriceHint(price);
  return (
    <span className={`list-item-price${accent ? " accent" : ""}`}>
      {displayPrice(price)}
      {hint && <span className="price-hint">{hint}</span>}
    </span>
  );
}

export function ProductListView({
  products,
  customerId,
  prices,
  highlightCodes,
  onSelect,
}: ProductViewProps) {
  return (
    <ul className="list">
      {products.map((product) => {
        const price = getPrice(prices, customerId, product.code);
        const highlighted = highlightCodes?.has(product.code);
        return (
          <li key={product.code}>
            <button
              type="button"
              className={`list-item list-item-with-price${highlighted ? " highlighted" : ""}`}
              onClick={() => onSelect(product.code)}
            >
              <span className="list-item-body">
                <span className="list-item-code">{product.code}</span>
                <span className="list-item-title">{product.name}</span>
              </span>
              <PriceCell price={price} accent={highlighted} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ProductSheetView({
  products,
  customerId,
  prices,
  categories = [],
  highlightCodes,
  onSelect,
}: ProductViewProps) {
  const groups = groupProductsByCategory(products, categories);

  return (
    <div className="sheet-grid">
      {groups.map((group) => (
        <div key={group.label} className="sheet-column">
          <div className="sheet-column-title">{group.label}</div>
          <table className="sheet-table">
            <thead>
              <tr>
                <th>品名</th>
                <th className="col-price">単価</th>
              </tr>
            </thead>
            <tbody>
              {group.products.map((product) => {
                const price = getPrice(prices, customerId, product.code);
                const highlighted = highlightCodes?.has(product.code);
                return (
                  <tr
                    key={product.code}
                    className={highlighted ? "highlighted" : undefined}
                    onClick={() => onSelect(product.code)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(product.code);
                      }
                    }}
                  >
                    <td className="sheet-name">{product.name}</td>
                    <td className="sheet-price">{displayPrice(price)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export function ProductCompactView({
  products,
  customerId,
  prices,
  highlightCodes,
  onSelect,
}: ProductViewProps) {
  return (
    <ul className="compact-list">
      {products.map((product) => {
        const price = getPrice(prices, customerId, product.code);
        const highlighted = highlightCodes?.has(product.code);
        return (
          <li key={product.code}>
            <button
              type="button"
              className={`compact-item${highlighted ? " highlighted" : ""}`}
              onClick={() => onSelect(product.code)}
            >
              <span className="compact-code">{product.code}</span>
              <span className="compact-name">{product.name}</span>
              <span className="compact-price">{displayPrice(price)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
