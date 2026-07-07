export type QtyTier = {
  min: number;
  max: number | null;
  price: number;
};

export type Customer = {
  id: string;
  name: string;
  kana: string;
  frequentCodes: string[];
  /** 伝票アプリにない手入力の客先 */
  manual?: boolean;
};

export type Product = {
  code: string;
  name: string;
  category: string;
};

export type BasePriceEntry = {
  code: string;
  price: number;
  qtyTiers?: QtyTier[];
};

export type PriceEntry = {
  customerId: string;
  code: string;
  price: number;
  previousPrice?: number;
  effectiveFrom: string;
  qtyTiers?: QtyTier[];
};

export type DataSource = "sample" | "import" | "firestore" | "excel" | "none";

export type ParsedPriceSheetItem = {
  name: string;
  price: number | null;
};

export type ParsedPriceSheet = {
  customerName: string;
  customerCode?: string;
  effectiveDate?: string;
  items: ParsedPriceSheetItem[];
};

export type PriceData = {
  meta: {
    effectiveFrom: string;
    revisionName: string;
    updatedAt: string;
    source: DataSource;
    syncedAt?: string;
  };
  /** ジャンル一覧（一覧表の列順） */
  categories: string[];
  customers: Customer[];
  products: Product[];
  /** 全客先共通の基本単価（たたき台） */
  basePrices: BasePriceEntry[];
  prices: PriceEntry[];
  /** 手動並び替え用の品番順 */
  productOrder?: string[];
};

export type Screen =
  | "customers"
  | "search"
  | "price"
  | "settings"
  | "base-prices"
  | "edit-prices"
  | "product-master";

export type ViewMode = "list" | "sheet" | "compact";

/** プゥルヴー伝票のバックアップJSON */
export type PourVousBackup = {
  customers?: { id: string; name: string }[];
  products?: { code: string; name: string }[];
  prices?: {
    customer: string;
    code: string;
    name: string;
    price: number;
    qtyTiers?: QtyTier[];
  }[];
  exportDate?: string;
};
