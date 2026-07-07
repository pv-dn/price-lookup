import { useMemo, useState, useEffect } from "react";
import { MainTabBar, mainTabFromScreen } from "./components/MainTabBar";
import type { MainTab } from "./components/MainTabBar";
import { ZoomControls } from "./components/ZoomControls";
import { useScreenZoom } from "./hooks/useScreenZoom";
import { useAuth } from "./hooks/useAuth";
import { usePriceData } from "./hooks/usePriceData";
import { addManualCustomer, setManualPrices } from "./lib/manualCustomers";
import { setBasePrices } from "./lib/basePrices";
import { mergeBasePriceSheetExcelResult } from "./lib/mergeBasePriceSheetExcel";
import { readBasePriceSheetExcelFile } from "./lib/parsePriceSheetExcel";
import { BasePricesScreen } from "./screens/BasePricesScreen";
import { CustomerScreen } from "./screens/CustomerScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { ManualPricesScreen } from "./screens/ManualPricesScreen";
import { ProductMasterScreen } from "./screens/ProductMasterScreen";
import { PriceScreen } from "./screens/PriceScreen";
import { SearchScreen } from "./screens/SearchScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import type { Screen } from "./types";
import "./App.css";

const SOURCE_BADGE: Record<string, string> = {
  import: "JSON",
  firestore: "同期",
  excel: "Excel",
};

function App() {
  const { user, authReady, isAuthenticated, login } = useAuth();
  const {
    data,
    error,
    loading,
    restoring,
    cloudSavedAt,
    savingCloud,
    applyData,
    resetStored,
    saveToCloudNow,
  } = usePriceData(isAuthenticated, user?.uid ?? null);
  const [screen, setScreen] = useState<Screen>("customers");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [productCode, setProductCode] = useState<string | null>(null);
  const {
    zoom,
    zoomPercent,
    zoomIn,
    zoomOut,
    resetZoom,
    canZoomIn,
    canZoomOut,
  } = useScreenZoom(screen);

  const customer = useMemo(
    () => data?.customers.find((c) => c.id === customerId),
    [data, customerId],
  );

  const product = useMemo(
    () => data?.products.find((p) => p.code === productCode),
    [data, productCode],
  );

  const price = useMemo(
    () =>
      data?.prices.find(
        (p) => p.customerId === customerId && p.code === productCode,
      ),
    [data, customerId, productCode],
  );

  const goCustomers = () => {
    setCustomerId(null);
    setProductCode(null);
    setScreen("customers");
  };

  const handleSelectCustomer = (id: string) => {
    setCustomerId(id);
    setProductCode(null);
    setScreen("search");
  };

  const handleSelectProduct = (code: string) => {
    setProductCode(code);
    setScreen("price");
  };

  const handleBackToSearch = () => {
    setProductCode(null);
    setScreen("search");
  };

  const handleAddCustomer = (name: string) => {
    if (!data) return;
    const next = addManualCustomer(data, name);
    applyData(next);
    const added = next.customers.find((c) => c.name === name.trim() && c.manual);
    if (added) {
      setCustomerId(added.id);
      setProductCode(null);
      setScreen("edit-prices");
    }
  };

  useEffect(() => {
    if (!data) return;

    if (screen === "search" && (!customerId || !customer)) {
      setCustomerId(null);
      setProductCode(null);
      setScreen("customers");
      return;
    }

    if (screen === "edit-prices" && (!customerId || !customer?.manual)) {
      setProductCode(null);
      setScreen(customer ? "search" : "customers");
      return;
    }

    if (
      screen === "price" &&
      (!customerId || !customer || !productCode || !product)
    ) {
      setProductCode(null);
      setScreen(customer ? "search" : "customers");
    }
  }, [data, screen, customerId, productCode, customer, product]);

  const handleMainTab = (tab: MainTab) => {
    if (tab === "customers") {
      goCustomers();
      return;
    }
    setCustomerId(null);
    setProductCode(null);
    if (tab === "edit") {
      setScreen("product-master");
    } else {
      setScreen("base-prices");
    }
  };

  const showMainTabs = mainTabFromScreen(screen) !== null;
  const activeMainTab = mainTabFromScreen(screen) ?? "customers";

  if (!authReady) {
    return (
      <div className="app">
        <div className="status-message">読み込み中…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} />;
  }

  if (loading) {
    return (
      <div className="app">
        <div className="status-message">
          {restoring ? "クラウドからデータを復元中…" : "読み込み中…"}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="app">
        <div className="status-message error">
          {error ?? "データがありません"}
        </div>
      </div>
    );
  }

  const sourceBadge = SOURCE_BADGE[data.meta.source] ?? "";

  return (
    <div className="app">
      <div className="app-header">
        <div className="app-bar">
          <button
            type="button"
            className="app-bar-title-btn"
            onClick={goCustomers}
          >
            ホワイト事業部価格表
          </button>
          <div className="app-bar-right">
            <ZoomControls
              zoomPercent={zoomPercent}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onReset={resetZoom}
              canZoomIn={canZoomIn}
              canZoomOut={canZoomOut}
            />
            {sourceBadge && (
              <span className="app-bar-badge app-bar-badge-source">{sourceBadge}</span>
            )}
            {data.meta.revisionName && (
              <span className="app-bar-badge">{data.meta.revisionName}</span>
            )}
            <button
              type="button"
              className="app-bar-settings"
              onClick={() => setScreen("settings")}
              aria-label="データ連携設定"
            >
              連携
            </button>
          </div>
        </div>

        {showMainTabs && (
          <MainTabBar
            active={activeMainTab}
            basePriceCount={data.basePrices.length}
            onChange={handleMainTab}
          />
        )}
      </div>

      <main className="app-main">
        <div className="screen-zoom-wrap">
        <div className="screen-zoom-inner" style={{ zoom }}>
        {screen === "settings" && (
          <SettingsScreen
            data={data}
            onApply={(d) => {
              applyData(d);
              goCustomers();
            }}
            onResetStored={() => {
              resetStored();
              goCustomers();
            }}
            onBack={goCustomers}
            userEmail={user?.email ?? null}
            cloudSavedAt={cloudSavedAt}
            savingCloud={savingCloud}
            onSaveToCloud={saveToCloudNow}
          />
        )}

        {screen === "base-prices" && (
          <BasePricesScreen
            data={data}
            onUpdate={applyData}
            onSave={(entries, effectiveFrom) => {
              applyData(setBasePrices(data, entries, effectiveFrom));
            }}
            onImportExcel={async (file) => {
              const buffer = await file.arrayBuffer();
              const { items } = await readBasePriceSheetExcelFile(
                buffer,
                data.categories,
              );
              const { data: merged, message } = mergeBasePriceSheetExcelResult(
                data,
                items,
              );
              applyData(merged);
              return message;
            }}
          />
        )}

        {screen === "product-master" && (
          <ProductMasterScreen
            data={data}
            onUpdate={applyData}
            onBack={goCustomers}
          />
        )}

        {screen === "customers" && (
          <CustomerScreen
            customers={data.customers}
            onSelect={handleSelectCustomer}
            onAdd={handleAddCustomer}
          />
        )}

        {screen === "search" && customer && (
          <SearchScreen
            customer={customer}
            products={data.products}
            prices={data.prices}
            categories={data.categories}
            onSelectProduct={handleSelectProduct}
            onBack={goCustomers}
            onEditPrices={
              customer.manual
                ? () => setScreen("edit-prices")
                : undefined
            }
          />
        )}

        {screen === "edit-prices" && customer?.manual && (
          <ManualPricesScreen
            customer={customer}
            products={data.products}
            prices={data.prices}
            basePrices={data.basePrices}
            onSave={(entries) => {
              applyData(setManualPrices(data, customer.id, entries));
              setScreen("search");
            }}
            onBack={() => setScreen("search")}
          />
        )}

        {screen === "price" && customer && product && (
          <PriceScreen
            customer={customer}
            product={product}
            price={price}
            basePrice={data.basePrices.find((p) => p.code === product.code)}
            meta={data.meta}
            onBack={handleBackToSearch}
            onReset={goCustomers}
          />
        )}
        </div>
        </div>
      </main>
    </div>
  );
}

export default App;
