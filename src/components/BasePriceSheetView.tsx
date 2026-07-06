import { useEffect, useState } from "react";
import type { Product } from "../types";
import { formatYen } from "../utils/format";
import { groupProductsByCategory } from "../utils/productGroups";
import { useDragReorder } from "../hooks/useDragReorder";

type Props = {
  products: Product[];
  categories: string[];
  draft: Map<string, string>;
  readOnly?: boolean;
  allowRowReorder?: boolean;
  allowColumnResize?: boolean;
  getColumnWidth?: (label: string) => number;
  onColumnResizeStart?: (label: string, clientX: number) => void;
  onReorderInGroup?: (
    groupLabel: string,
    codes: string[],
    from: number,
    to: number,
  ) => void;
  onSetPrice: (code: string, value: string) => void;
  onEditProduct?: (code: string, updates: { name?: string; category?: string }) => void;
  onDeleteProduct?: (code: string, name: string) => void;
};

export function BasePriceSheetView({
  products,
  categories,
  draft,
  readOnly = false,
  allowRowReorder = false,
  allowColumnResize = false,
  getColumnWidth,
  onColumnResizeStart,
  onReorderInGroup,
  onSetPrice,
  onEditProduct,
  onDeleteProduct,
}: Props) {
  const groups = groupProductsByCategory(products, categories);

  return (
    <div className="sheet-grid">
      {groups.map((group) => (
        <SheetColumn
          key={group.label}
          group={group}
          width={getColumnWidth?.(group.label)}
          draft={draft}
          readOnly={readOnly}
          allowRowReorder={allowRowReorder}
          allowColumnResize={allowColumnResize}
          onColumnResizeStart={onColumnResizeStart}
          onReorderInGroup={onReorderInGroup}
          onSetPrice={onSetPrice}
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
        />
      ))}
    </div>
  );
}

type SheetColumnProps = {
  group: { label: string; products: Product[] };
  width?: number;
  draft: Map<string, string>;
  readOnly: boolean;
  allowRowReorder: boolean;
  allowColumnResize: boolean;
  onColumnResizeStart?: (label: string, clientX: number) => void;
  onReorderInGroup?: (
    groupLabel: string,
    codes: string[],
    from: number,
    to: number,
  ) => void;
  onSetPrice: (code: string, value: string) => void;
  onEditProduct?: (code: string, updates: { name?: string; category?: string }) => void;
  onDeleteProduct?: (code: string, name: string) => void;
};

function SheetColumn({
  group,
  width,
  draft,
  readOnly,
  allowRowReorder,
  allowColumnResize,
  onColumnResizeStart,
  onReorderInGroup,
  onSetPrice,
  onEditProduct,
  onDeleteProduct,
}: SheetColumnProps) {
  const codes = group.products.map((p) => p.code);

  const handleReorder = (from: number, to: number) => {
    onReorderInGroup?.(group.label, codes, from, to);
  };

  const getDragProps = useDragReorder(handleReorder);

  return (
    <div
      className="sheet-column-wrap"
      style={width ? { flex: `0 0 ${width}px`, width: `${width}px` } : undefined}
    >
      <div className="sheet-column">
        <div className="sheet-column-title">{group.label}</div>
        <div className="sheet-column-scroll">
          <table className="sheet-table">
            <thead>
              <tr>
                {allowRowReorder && <th className="col-drag" aria-label="並替" />}
                <th>品名</th>
                <th className="col-price">単価</th>
                {onDeleteProduct && <th className="col-delete" />}
              </tr>
            </thead>
            <tbody>
              {group.products.map((product, index) => (
                <tr
                  key={product.code}
                  className={allowRowReorder ? "sheet-row--draggable" : undefined}
                  {...(allowRowReorder ? getDragProps(index) : {})}
                >
                  {allowRowReorder && (
                    <td className="col-drag">
                      <span className="drag-handle" aria-hidden="true">
                        ⋮⋮
                      </span>
                    </td>
                  )}
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
                    {readOnly ? (
                      <span className="base-price-readonly">
                        {formatYen(parseInt(draft.get(product.code) ?? "0", 10))}
                      </span>
                    ) : (
                      <input
                        type="number"
                        className="sheet-price-input"
                        inputMode="numeric"
                        placeholder="—"
                        value={draft.get(product.code) ?? ""}
                        onChange={(e) => onSetPrice(product.code, e.target.value)}
                      />
                    )}
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
      {allowColumnResize && onColumnResizeStart && (
        <div
          className="sheet-column-resize-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label={`${group.label}の列幅を調整`}
          onPointerDown={(e) => {
            e.preventDefault();
            onColumnResizeStart(group.label, e.clientX);
          }}
        />
      )}
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
