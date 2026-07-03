import { useCallback, useEffect, useState } from "react";
import samplePrices from "../data/samplePrices.json";
import type { PriceData } from "../types";
import { ensureProductCategories } from "../lib/productMaster";
import { clearStoredData, loadStoredData, saveStoredData } from "../lib/storage";

function loadSampleData(): PriceData {
  const json = samplePrices as PriceData;
  return {
    ...json,
    meta: { ...json.meta, source: json.meta.source ?? "sample" },
  };
}

export function usePriceData() {
  const [data, setData] = useState<PriceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      setData(ensureProductCategories(loadSampleData()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "不明なエラー");
    } finally {
      setLoading(false);
    }
  }, []);

  const resetToSample = useCallback(async () => {
    clearStoredData();
    setLoading(true);
    try {
      setData(ensureProductCategories(loadSampleData()));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "不明なエラー");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  return { data, error, loading, applyData, resetToSample, reload: loadInitial };
}
