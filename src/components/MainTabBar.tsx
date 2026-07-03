export type MainTab = "customers" | "base-prices" | "edit";

type Props = {
  active: MainTab;
  basePriceCount: number;
  onChange: (tab: MainTab) => void;
};

export function MainTabBar({ active, basePriceCount, onChange }: Props) {
  return (
    <nav className="app-tab-bar" aria-label="メイン">
      <button
        type="button"
        className={`app-tab${active === "customers" ? " active" : ""}`}
        aria-current={active === "customers" ? "page" : undefined}
        onClick={() => onChange("customers")}
      >
        客先
      </button>
      <button
        type="button"
        className={`app-tab${active === "base-prices" ? " active" : ""}`}
        aria-current={active === "base-prices" ? "page" : undefined}
        onClick={() => onChange("base-prices")}
      >
        基本価格表
        {basePriceCount > 0 && (
          <span className="app-tab-badge">{basePriceCount}</span>
        )}
      </button>
      <button
        type="button"
        className={`app-tab${active === "edit" ? " active" : ""}`}
        aria-current={active === "edit" ? "page" : undefined}
        onClick={() => onChange("edit")}
      >
        編集
      </button>
    </nav>
  );
}

function mainTabFromScreen(screen: string): MainTab | null {
  if (screen === "customers" || screen === "search" || screen === "price" || screen === "edit-prices") {
    return "customers";
  }
  if (screen === "base-prices") return "base-prices";
  if (screen === "product-master") return "edit";
  return null;
}

export { mainTabFromScreen };
