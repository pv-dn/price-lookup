import type { Customer, PriceData, PriceEntry, Product } from "../types";
import { formatYen } from "../utils/format";
import {
  displayPrice,
  formatTierLabel,
  formatTierRange,
  hasQtyTiers,
} from "../utils/price";

type Props = {
  customer: Customer;
  product: Product;
  price: PriceEntry | undefined;
  meta: PriceData["meta"];
  onBack: () => void;
  onReset: () => void;
};

export function PriceScreen({
  customer,
  product,
  price,
  meta,
  onBack,
  onReset,
}: Props) {
  const showPrevious =
    price?.previousPrice !== undefined && price.previousPrice !== price.price;
  const tiered = hasQtyTiers(price);

  return (
    <div className="screen">
      <header className="screen-header with-back">
        <button type="button" className="back-button" onClick={onBack}>
          ← 品番一覧
        </button>
        <div>
          <p className="label">{customer.name}</p>
          <p className="label">{product.code}</p>
          <h1 className="product-name">{product.name}</h1>
        </div>
      </header>

      <div className="price-card">
        <p className="price-label">
          {tiered ? "基本単価（数量別あり）" : "この客先の単価"}
        </p>
        <p className="price-amount">{displayPrice(price) || "未設定"}</p>
        {tiered && price?.qtyTiers && (
          <p className="price-tier-summary">{formatTierLabel(price)}</p>
        )}
      </div>

      {tiered && price?.qtyTiers && (
        <div className="tier-table-wrap">
          <h2 className="section-title">数量別単価</h2>
          <table className="price-table tier-table">
            <thead>
              <tr>
                <th>数量</th>
                <th className="col-price">単価</th>
              </tr>
            </thead>
            <tbody>
              {price.qtyTiers.map((tier, i) => (
                <tr key={i}>
                  <td>{formatTierRange(tier)}</td>
                  <td className="col-price">{formatYen(tier.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPrevious && price && (
        <div className="notice notice-info">
          値上げ前: {formatYen(price.previousPrice!)} → 新価格:{" "}
          {formatYen(price.price)}（{price.effectiveFrom}〜適用）
        </div>
      )}

      <dl className="meta-list">
        <div className="meta-row">
          <dt>適用開始日</dt>
          <dd>{price?.effectiveFrom ?? "—"}</dd>
        </div>
        <div className="meta-row">
          <dt>最終更新</dt>
          <dd>{meta.updatedAt}</dd>
        </div>
        <div className="meta-row">
          <dt>データ</dt>
          <dd>
            <span className="badge">{meta.revisionName}</span>
          </dd>
        </div>
      </dl>

      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={onBack}>
          別の品番を調べる
        </button>
        <button type="button" className="btn btn-ghost" onClick={onReset}>
          客先を変える
        </button>
      </div>
    </div>
  );
}
