import { useCallback, useEffect, useState } from "react";
import { defaultCategories } from "../constants/productCategories";
import type { PriceData } from "../types";
import { ensureProductCategories } from "../lib/productMaster";
import { loadFromFirestore } from "../lib/pourvousFirestore";
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

export function usePriceData(authenticated: boolean) {
  const [data, setData] = useState<PriceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);

  const applyData = useCallback((newData: PriceData) => {
    const normalized = ensureProductCategories(newData);
    try {
      saveStoredData(normalized);
    } catch (e) {
      setError(e instanceof Error ? e.message : "データを保存できませんでした");
      throw e;
    }
    setData(normalized);
    setError(null);
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stored = loadStoredData();
      if (stored) {
        setData(ensureProductCategories(stored));
        return;
      }

      setRestoring(true);
      try {
        const fromCloud = await loadFromFirestore();
        const normalized = ensureProductCategories(fromCloud);
        saveStoredData(normalized);
        setData(normalized);
        return;
      } catch {
        /* localStorage が空のときだけクラウド復元を試す */
      } finally {
        setRestoring(false);
      }

      setData(ensureProductCategories(createEmptyData()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "不明なエラー");
    } finally {
      setLoading(false);
    }
  }, []);

  const resetStored = useCallback(async () => {
    clearStoredData();
    setLoading(true);
    try {
      setData(ensureProductCategories(createEmptyData()));
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
      return;
    }
    void loadInitial();
  }, [authenticated, loadInitial]);

  return { data, error, loading, restoring, applyData, resetStored, reload: loadInitial };
}
