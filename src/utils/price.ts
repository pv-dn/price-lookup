import type { PriceEntry, QtyTier } from "../types";
import { formatYen } from "./format";

export function hasQtyTiers(price?: PriceEntry): boolean {
  return Boolean(price?.qtyTiers?.length);
}

export function formatTierRange(tier: QtyTier): string {
  if (tier.max == null) return `${tier.min}以上`;
  if (tier.min === tier.max) return `${tier.min}`;
  return `${tier.min}〜${tier.max}`;
}

export function formatTierLabel(price: PriceEntry): string {
  if (!price.qtyTiers?.length) return "";
  return price.qtyTiers
    .map((t) => `${formatTierRange(t)}: ${formatYen(t.price)}`)
    .join(" / ");
}

export function displayPrice(price?: PriceEntry): string {
  if (!price) return "—";
  if (hasQtyTiers(price)) return formatYen(price.qtyTiers![0].price);
  return formatYen(price.price);
}

export function displayPriceHint(price?: PriceEntry): string | null {
  if (!hasQtyTiers(price)) return null;
  return "数量別";
}
