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

export type PriceEntry = {
  customerId: string;
  code: string;
  price: number;
  previousPrice?: number;
  effectiveFrom: string;
  qtyTiers?: QtyTier[];
};

export type DataSource = "sample" | "import" | "firestore";

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
  prices: PriceEntry[];
};

export type Screen =
  | "customers"
  | "search"
  | "price"
  | "settings"
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
