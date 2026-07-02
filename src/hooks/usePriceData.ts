import { useCallback, useEffect, useState } from "react";
import type { PriceData } from "../types";
import { ensureProductCategories } from "../lib/productMaster";
import { clearStoredData, loadStoredData, saveStoredData } from "../lib/storage";

async function loadSampleData(): Promise<PriceData> {
  const res = await fetch("/data/prices.json");
  if (!res.ok) throw new Error("サンプルデータの読み込みに失敗しました");
  const json = (await res.json()) as PriceData;
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
    saveStoredData(normalized);
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
      const sample = await loadSampleData();
      setData(ensureProductCategories(sample));
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
      const sample = await loadSampleData();
      setData(sample);
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
