import { useEffect, useState } from "react";
import type { ViewMode } from "../types";

const STORAGE_KEY = "price-lookup-view-mode";

export function useViewMode(defaultMode: ViewMode = "list") {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "list" || saved === "compact") return saved;
      if (saved === "table" || saved === "sheet") return "sheet";
    } catch {
      /* localStorage unavailable */
    }
    return defaultMode;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, viewMode);
    } catch {
      /* localStorage unavailable */
    }
  }, [viewMode]);

  return [viewMode, setViewMode] as const;
}
