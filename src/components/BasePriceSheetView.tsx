import type { Product } from "../types";
import { groupProductsByCategory } from "../utils/productGroups";

type Props = {
  products: Product[];
  categories: string[];
  draft: Map<string, string>;
  onSetPrice: (code: string, value: string) => void;
};

export function BasePriceSheetView({
  products,
  categories,
  draft,
  onSetPrice,
}: Props) {
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
              {group.products.map((product) => (
                <tr key={product.code}>
                  <td className="sheet-name">{product.name}</td>
                  <td className="sheet-price">
                    <input
                      type="number"
                      className="sheet-price-input"
                      inputMode="numeric"
                      placeholder="—"
                      value={draft.get(product.code) ?? ""}
                      onChange={(e) => onSetPrice(product.code, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
