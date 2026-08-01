import { useCallback, useEffect, useRef, useState } from "react";
import { defaultCategories } from "../constants/productCategories";
import type { PriceData } from "../types";
import { loadAutoSyncOnLogin } from "../lib/autoSyncStorage";
import { loadHiddenGenres } from "../lib/genreVisibilityStorage";
import {
  applyHiddenGenresFromCloud,
  loadPriceLookupBackup,
  resolveLocalVsCloud,
  savePriceLookupBackup,
  type PriceLookupCloudBackup,
} from "../lib/priceLookupFirestore";
import { setCloudBackupHandler } from "../lib/priceLookupCloudRegistry";
import { loadFromFirestore } from "../lib/pourvousFirestore";
import { ensureProductCategories, mergePourVousWithLocal } from "../lib/productMaster";
import { clearStoredData, loadStoredData, saveStoredData } from "../lib/storage";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function stampSynced(data: PriceData): PriceData {
  const now = new Date().toISOString();
  return {
    ...data,
    meta: {
      ...data.meta,
      updatedAt: today(),
      syncedAt: now,
    },
  };
}

function createEmptyData(): PriceData {
  return {
    meta: {
      effectiveFrom: "2026-08-01",
      revisionName: "データ未取込",
      updatedAt: today(),
      source: "none",
    },
    categories: [...defaultCategories()],
    customers: [],
    products: [],
    basePrices: [],
    prices: [],
  };
}

function normalizeLoaded(data: PriceData): PriceData {
  const cleaned: PriceData = {
    ...data,
    meta: {
      ...data.meta,
      effectiveFrom: "2026-08-01",
      revisionName: data.meta.revisionName
        .replace(/（基本単価は客先単価から推定）/g, "")
        .trim(),
    },
  };
  return ensureProductCategories(cleaned);
}

export function usePriceData(authenticated: boolean, uid: string | null) {
  const [data, setData] = useState<PriceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [cloudSavedAt, setCloudSavedAt] = useState<string | null>(null);
  const [savingCloud, setSavingCloud] = useState(false);
  const uidRef = useRef(uid);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    uidRef.current = uid;
  }, [uid]);

  const persistToCloud = useCallback(
    async (nextData: PriceData, options?: { immediate?: boolean }) => {
      const activeUid = uidRef.current;
      if (!activeUid) return;

      const run = async () => {
        setSavingCloud(true);
        try {
          const stamped = nextData.meta.syncedAt
            ? nextData
            : stampSynced(nextData);
          const payload: PriceLookupCloudBackup = {
            data: stamped,
            hiddenGenres: loadHiddenGenres(),
            savedAt: stamped.meta.syncedAt || new Date().toISOString(),
          };
          await savePriceLookupBackup(activeUid, payload);
          setCloudSavedAt(payload.savedAt);
          if (!nextData.meta.syncedAt) {
            saveStoredData(stamped);
            setData(stamped);
          }
        } catch (e) {
          console.warn("クラウド保存に失敗しました", e);
        } finally {
          setSavingCloud(false);
        }
      };

      if (options?.immediate) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        await run();
        return;
      }

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void run();
      }, 1500);
    },
    [],
  );

  const applyData = useCallback(
    (newData: PriceData) => {
      const normalized = stampSynced(normalizeLoaded(newData));
      try {
        saveStoredData(normalized);
      } catch (e) {
        setError(e instanceof Error ? e.message : "データを保存できませんでした");
        throw e;
      }
      setData(normalized);
      setError(null);
      void persistToCloud(normalized, { immediate: true });
    },
    [persistToCloud],
  );

  const saveToCloudNow = useCallback(async () => {
    if (!data) return;
    await persistToCloud(data, { immediate: true });
  }, [data, persistToCloud]);

  const commitResolvedData = useCallback(
    (resolved: PriceData, backup?: PriceLookupCloudBackup | null): PriceData => {
      const normalized = normalizeLoaded(resolved);
      saveStoredData(normalized);
      setData(normalized);
      if (backup?.hiddenGenres) {
        applyHiddenGenresFromCloud(backup.hiddenGenres);
      }
      if (backup?.savedAt) {
        setCloudSavedAt(backup.savedAt);
      }
      return normalized;
    },
    [],
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const local = loadStoredData();
      const cloud =
        uidRef.current != null
          ? await loadPriceLookupBackup(uidRef.current).catch(() => null)
          : null;

      let current: PriceData | null = null;

      if (local && cloud) {
        const resolved = resolveLocalVsCloud(local, cloud);
        current = commitResolvedData(resolved.data, {
          ...cloud,
          hiddenGenres: resolved.hiddenGenres,
        });
        if (resolved.source === "local") {
          void persistToCloud(current, { immediate: true });
        }
      } else if (local) {
        current = commitResolvedData(local);
        void persistToCloud(current, { immediate: true });
      } else if (cloud) {
        current = commitResolvedData(cloud.data, cloud);
      } else {
        setRestoring(true);
        try {
          const fromPourVous = await loadFromFirestore();
          current = commitResolvedData(fromPourVous);
          void persistToCloud(current, { immediate: true });
        } catch {
          current = normalizeLoaded(createEmptyData());
          setData(current);
        } finally {
          setRestoring(false);
        }
      }

      // ログイン時に「最新データを同期」相当を自動実行
      if (current && loadAutoSyncOnLogin()) {
        setRestoring(true);
        try {
          const converted = await loadFromFirestore();
          const merged = stampSynced(
            normalizeLoaded(mergePourVousWithLocal(converted, current)),
          );
          saveStoredData(merged);
          setData(merged);
          await persistToCloud(merged, { immediate: true });
        } catch (e) {
          console.warn("ログイン時の自動同期に失敗しました", e);
        } finally {
          setRestoring(false);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "不明なエラー");
    } finally {
      setLoading(false);
    }
  }, [commitResolvedData, persistToCloud]);

  const syncFromPourVous = useCallback(async () => {
    const existing = loadStoredData();
    const converted = await loadFromFirestore();
    const merged = stampSynced(
      normalizeLoaded(mergePourVousWithLocal(converted, existing)),
    );
    saveStoredData(merged);
    setData(merged);
    setError(null);
    await persistToCloud(merged, { immediate: true });
    return merged;
  }, [persistToCloud]);

  /** 他PCの最新を取り込む。ローカルよりクラウドを優先する */
  const reloadFromCloud = useCallback(async () => {
    const activeUid = uidRef.current;
    if (!activeUid) {
      throw new Error("ログインしていません");
    }
    setLoading(true);
    setError(null);
    try {
      const cloud = await loadPriceLookupBackup(activeUid);
      if (!cloud) {
        throw new Error("クラウドに保存データがありません");
      }
      commitResolvedData(cloud.data, cloud);
    } catch (e) {
      setError(e instanceof Error ? e.message : "クラウド読込に失敗しました");
      throw e;
    } finally {
      setLoading(false);
    }
  }, [commitResolvedData]);

  const resetStored = useCallback(async () => {
    clearStoredData();
    setLoading(true);
    try {
      setData(normalizeLoaded(createEmptyData()));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "不明なエラー");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) {
      setData(null);
      setError(null);
      setLoading(false);
      setCloudSavedAt(null);
      return;
    }
    void loadInitial();
  }, [authenticated, uid, loadInitial]);

  useEffect(() => {
    setCloudBackupHandler(async () => {
      if (!data) return;
      await persistToCloud(data, { immediate: true });
    });
    return () => setCloudBackupHandler(null);
  }, [data, persistToCloud]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return {
    data,
    error,
    loading,
    restoring,
    cloudSavedAt,
    savingCloud,
    applyData,
    resetStored,
    reload: loadInitial,
    reloadFromCloud,
    syncFromPourVous,
    saveToCloudNow,
  };
}
