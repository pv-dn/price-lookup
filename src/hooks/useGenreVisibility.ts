import { useCallback, useEffect, useRef, useState } from "react";
import { loadHiddenGenres, saveHiddenGenres } from "../lib/genreVisibilityStorage";
import { triggerCloudBackup } from "../lib/priceLookupCloudRegistry";

export function useGenreVisibility(categories: string[]) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(loadHiddenGenres()));
  const prefsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (prefsTimerRef.current) clearTimeout(prefsTimerRef.current);
    };
  }, []);

  useEffect(() => {
    saveHiddenGenres([...hidden]);
    if (prefsTimerRef.current) clearTimeout(prefsTimerRef.current);
    prefsTimerRef.current = setTimeout(() => {
      triggerCloudBackup();
    }, 1500);
  }, [hidden]);
  useEffect(() => {
    setHidden((prev) => {
      const next = new Set([...prev].filter((label) => categories.includes(label)));
      return next.size === prev.size ? prev : next;
    });
  }, [categories]);

  const isVisible = useCallback((label: string) => !hidden.has(label), [hidden]);

  const toggle = useCallback((label: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const showAll = useCallback(() => setHidden(new Set()), []);

  return {
    hidden,
    isVisible,
    toggle,
    showAll,
    allVisible: hidden.size === 0,
  };
}
