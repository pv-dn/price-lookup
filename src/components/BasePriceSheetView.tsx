import { useEffect, useState } from "react";
import type { Product } from "../types";
import { groupProductsByCategory } from "../utils/productGroups";

type Props = {
  products: Product[];
  categories: string[];
  draft: Map<string, string>;
  onSetPrice: (code: string, value: string) => void;
  onEditProduct?: (code: string, updates: { name?: string; category?: string }) => void;
  onDeleteProduct?: (code: string, name: string) => void;
};

export function BasePriceSheetView({
  products,
  categories,
  draft,
  onSetPrice,
  onEditProduct,
  onDeleteProduct,
}: Props) {
  const groups = groupProductsByCategory(products, categories);

  return (
    <div className="sheet-grid">
      {groups.map((group) => (
        <div key={group.label} className="sheet-column">
          <div className="sheet-column-title">{group.label}</div>
          <div className="sheet-column-scroll">
            <table className="sheet-table">
            <thead>
              <tr>
                <th>品名</th>
                <th className="col-price">単価</th>
                {onDeleteProduct && <th className="col-delete" />}
              </tr>
            </thead>
            <tbody>
              {group.products.map((product) => (
                <tr key={product.code}>
                  <td className="sheet-name">
                    {onEditProduct ? (
                      <EditableName
                        name={product.name}
                        onSave={(name) => onEditProduct(product.code, { name })}
                      />
                    ) : (
                      product.name
                    )}
                  </td>
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
                  {onDeleteProduct && (
                    <td className="sheet-delete">
                      <button
                        type="button"
                        className="base-inline-delete-sm"
                        onClick={() => onDeleteProduct(product.code, product.name)}
                        title="削除"
                      >
                        ×
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function EditableName({
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
        className="base-editable-name"
        onClick={() => setEditing(true)}
        title="クリックで品名を編集"
      >
        {name}
      </span>
    );
  }

  return (
    <input
      className="base-inline-name-input base-inline-name-input-sm"
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
