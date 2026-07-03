import { useCallback, useEffect, useRef, useState } from "react";
import type { Screen } from "../types";

const STORAGE_PREFIX = "price-lookup-zoom-";
export const ZOOM_MIN = 0.8;
export const ZOOM_MAX = 1.5;
export const ZOOM_STEP = 0.1;
export const ZOOM_DEFAULT = 1;

function storageKey(screen: Screen): string {
  return `${STORAGE_PREFIX}${screen}`;
}

function loadZoom(screen: Screen): number {
  try {
    const raw = localStorage.getItem(storageKey(screen));
    if (!raw) return ZOOM_DEFAULT;
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return ZOOM_DEFAULT;
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(n * 10) / 10));
  } catch {
    return ZOOM_DEFAULT;
  }
}

function saveZoom(screen: Screen, zoom: number): void {
  try {
    localStorage.setItem(storageKey(screen), String(zoom));
  } catch {
    /* localStorage unavailable */
  }
}

export function useScreenZoom(screen: Screen) {
  const [zoom, setZoom] = useState(() => loadZoom(screen));
  const skipSaveRef = useRef(false);

  useEffect(() => {
    skipSaveRef.current = true;
    setZoom(loadZoom(screen));
  }, [screen]);

  useEffect(() => {
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    saveZoom(screen, zoom);
  }, [screen, zoom]);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 10) / 10));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 10) / 10));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(ZOOM_DEFAULT);
  }, []);

  const canZoomIn = zoom < ZOOM_MAX;
  const canZoomOut = zoom > ZOOM_MIN;

  return {
    zoom,
    zoomPercent: Math.round(zoom * 100),
    zoomIn,
    zoomOut,
    resetZoom,
    canZoomIn,
    canZoomOut,
  };
}
