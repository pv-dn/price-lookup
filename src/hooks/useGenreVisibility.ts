import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "price-lookup-hidden-genres";

function loadHidden(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

export function useGenreVisibility(categories: string[]) {
  const [hidden, setHidden] = useState<Set<string>>(loadHidden);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...hidden]));
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
