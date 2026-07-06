import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "base-sheet-col-widths";
const DEFAULT_WIDTH = 168;
const MIN_WIDTH = 100;
const MAX_WIDTH = 480;

function loadWidths(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "number" && value >= MIN_WIDTH && value <= MAX_WIDTH) {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function saveWidths(widths: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  } catch {
    // ignore quota errors for UI preference
  }
}

function clampWidth(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}

export function useSheetColumnWidths() {
  const [widths, setWidths] = useState<Record<string, number>>(loadWidths);
  const resizing = useRef<{ label: string; startX: number; startW: number } | null>(
    null,
  );

  const getWidth = useCallback(
    (label: string) => widths[label] ?? DEFAULT_WIDTH,
    [widths],
  );

  const setWidth = useCallback((label: string, width: number) => {
    const next = clampWidth(width);
    setWidths((prev) => {
      const updated = { ...prev, [label]: next };
      saveWidths(updated);
      return updated;
    });
  }, []);

  const startResize = useCallback(
    (label: string, clientX: number) => {
      resizing.current = { label, startX: clientX, startW: getWidth(label) };
    },
    [getWidth],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!resizing.current) return;
      const delta = e.clientX - resizing.current.startX;
      setWidth(resizing.current.label, resizing.current.startW + delta);
    };
    const onUp = () => {
      resizing.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setWidth]);

  return { getWidth, startResize };
}
