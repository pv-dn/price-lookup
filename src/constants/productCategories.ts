/** 初期ジャンル（Excelに合わせた並び） */
export const DEFAULT_CATEGORIES = [
  "布団類",
  "ドライ",
  "タオル類",
  "浴衣・着物",
  "白衣・制服",
  "その他",
] as const;

const GUESS_RULES: { category: string; test: (name: string) => boolean }[] = [
  {
    category: "布団類",
    test: (n) =>
      /布団|毛布|シーツ|敷|掛け|パッド|ベビー|コタツ|ベッド|巾着|包布|ピロ|枕|ムートン/.test(n),
  },
  {
    category: "タオル類",
    test: (n) => /タオル|バスマット|マット|バスローブ/.test(n),
  },
  {
    category: "浴衣・着物",
    test: (n) => /浴衣|着物|帯|振袖|羽織/.test(n),
  },
  {
    category: "白衣・制服",
    test: (n) =>
      /白衣|半白衣|制服|作業着|エプロン|インナー|キャップ|帽子|手袋|靴下/.test(n),
  },
  {
    category: "ドライ",
    test: (n) =>
      /シャツ|スーツ|ズボン|パンツ|コート|ジャケット|セーター|ニット|ワイシャツ|ブラウス|スカート|ドレス|ベスト|ジャンパー|パーカー|トレーナー|カーディガン|ネクタイ|スカーフ|水着|レイン|防寒|ダウン|ポロ/.test(
        n,
      ),
  },
];

export function guessCategory(name: string, categories?: string[]): string {
  for (const rule of GUESS_RULES) {
    if (rule.test(name)) return rule.category;
  }
  const fallback = categories?.includes("その他")
    ? "その他"
    : categories?.[categories.length - 1];
  return fallback ?? "その他";
}

export function defaultCategories(): string[] {
  return [...DEFAULT_CATEGORIES];
}
