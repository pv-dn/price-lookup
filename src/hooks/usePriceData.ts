import { useCallback, useEffect, useRef, useState } from "react";
import { defaultCategories } from "../constants/productCategories";
import type { PriceData } from "../types";
import { withDerivedBasePricesIfEmpty } from "../lib/basePrices";
import { loadHiddenGenres } from "../lib/genreVisibilityStorage";
import {
  applyHiddenGenresFromCloud,
  dataRevisionTime,
  loadPriceLookupBackup,
  pickNewerPriceData,
  savePriceLookupBackup,
  type PriceLookupCloudBackup,
} from "../lib/priceLookupFirestore";
import { setCloudBackupHandler } from "../lib/priceLookupCloudRegistry";
import { loadFromFirestore } from "../lib/pourvousFirestore";
import { ensureProductCategories } from "../lib/productMaster";
import { clearStoredData, loadStoredData, saveStoredData } from "../lib/storage";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyData(): PriceData {
  return {
    meta: {
      effectiveFrom: "",
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
      revisionName: data.meta.revisionName
        .replace(/（基本単価は客先単価から推定）/g, "")
        .trim(),
    },
  };
  const normalized = ensureProductCategories(cleaned);
  const withBase = withDerivedBasePricesIfEmpty(normalized);
  if (withBase.basePrices.length > normalized.basePrices.length) {
    return withBase;
  }
  return normalized;
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
          const payload: PriceLookupCloudBackup = {
            data: nextData,
            hiddenGenres: loadHiddenGenres(),
            savedAt: new Date().toISOString(),
          };
          await savePriceLookupBackup(activeUid, payload);
          setCloudSavedAt(payload.savedAt);
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
      const normalized = normalizeLoaded(newData);
      try {
        saveStoredData(normalized);
      } catch (e) {
        setError(e instanceof Error ? e.message : "データを保存できませんでした");
        throw e;
      }
      setData(normalized);
      setError(null);
      void persistToCloud(normalized);
    },
    [persistToCloud],
  );

  const saveToCloudNow = useCallback(async () => {
    if (!data) return;
    await persistToCloud(data, { immediate: true });
  }, [data, persistToCloud]);

  const commitResolvedData = useCallback(
    (resolved: PriceData, backup?: PriceLookupCloudBackup | null) => {
      const normalized = normalizeLoaded(resolved);
      saveStoredData(normalized);
      setData(normalized);
      if (backup?.hiddenGenres) {
        applyHiddenGenresFromCloud(backup.hiddenGenres);
      }
      if (backup?.savedAt) {
        setCloudSavedAt(backup.savedAt);
      }
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

      if (local && cloud) {
        const localTime = dataRevisionTime(local);
        const cloudTime = dataRevisionTime(cloud.data);
        const newer = pickNewerPriceData(local, cloud.data);
        const hiddenGenres =
          localTime >= cloudTime ? loadHiddenGenres() : cloud.hiddenGenres;
        commitResolvedData(newer, { ...cloud, hiddenGenres });
        if (localTime < cloudTime) {
          void persistToCloud(newer, { immediate: true });
        }
        return;
      }

      if (local) {
        commitResolvedData(local);
        void persistToCloud(local, { immediate: true });
        return;
      }

      if (cloud) {
        commitResolvedData(cloud.data, cloud);
        return;
      }

      setRestoring(true);
      try {
        const fromPourVous = await loadFromFirestore();
        commitResolvedData(fromPourVous);
        void persistToCloud(fromPourVous, { immediate: true });
        return;
      } catch {
        /* 伝票データの自動復元に失敗 */
      } finally {
        setRestoring(false);
      }

      setData(normalizeLoaded(createEmptyData()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "不明なエラー");
    } finally {
      setLoading(false);
    }
  }, [commitResolvedData, persistToCloud]);

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
    saveToCloudNow,
  };
}
