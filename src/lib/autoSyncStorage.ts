const STORAGE_KEY = "price-lookup-auto-sync";

/** ログイン時に伝票の最新データを自動同期するか（未設定時はオン） */
export function loadAutoSyncOnLogin(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

export function saveAutoSyncOnLogin(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}
