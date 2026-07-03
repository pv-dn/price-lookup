import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const STORAGE_PREFIX = "price-lookup-list-pane-";
export const LIST_PANE_HANDLE_HEIGHT = 10;
const MIN_BODY_PX = 96;

function loadRatio(paneId: string): number | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${paneId}`);
    if (!raw) return null;
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return null;
    return Math.min(0.95, Math.max(0.15, n));
  } catch {
    return null;
  }
}

function saveRatio(paneId: string, ratio: number | null): void {
  try {
    if (ratio === null) {
      localStorage.removeItem(`${STORAGE_PREFIX}${paneId}`);
      return;
    }
    localStorage.setItem(`${STORAGE_PREFIX}${paneId}`, String(ratio));
  } catch {
    /* localStorage unavailable */
  }
}

export function useResizableListPane(paneId: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fixedRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const ratioRef = useRef<number | null>(loadRatio(paneId));

  const [ratio, setRatio] = useState<number | null>(() => ratioRef.current);
  const [bodyHeight, setBodyHeight] = useState<number | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const fixed = fixedRef.current;
    if (!container || !fixed) return null;

    const footerHeight = footerRef.current?.offsetHeight ?? 0;
    const flexArea =
      container.clientHeight -
      fixed.offsetHeight -
      footerHeight -
      LIST_PANE_HANDLE_HEIGHT;

    return {
      flexArea,
      maxBody: Math.max(MIN_BODY_PX, flexArea),
    };
  }, []);

  const applyRatio = useCallback(() => {
    const measured = measure();
    if (!measured || ratioRef.current === null) {
      setBodyHeight(null);
      return;
    }

    setBodyHeight(
      Math.round(
        Math.max(
          MIN_BODY_PX,
          Math.min(measured.maxBody, ratioRef.current * measured.flexArea),
        ),
      ),
    );
  }, [measure]);

  useEffect(() => {
    applyRatio();
  }, [applyRatio, ratio]);

  useEffect(() => {
    const observer = new ResizeObserver(() => applyRatio());
    const container = containerRef.current;
    const fixed = fixedRef.current;
    const footer = footerRef.current;

    if (container) observer.observe(container);
    if (fixed) observer.observe(fixed);
    if (footer) observer.observe(footer);

    return () => observer.disconnect();
  }, [applyRatio]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (ratioRef.current === null && bodyRef.current) {
      const measured = measure();
      if (measured) {
        const currentHeight = bodyRef.current.offsetHeight;
        const nextRatio = currentHeight / measured.flexArea;
        ratioRef.current = nextRatio;
        setRatio(nextRatio);
        setBodyHeight(currentHeight);
      }
    }

    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [measure]);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;

      const fixed = fixedRef.current;
      const measured = measure();
      if (!fixed || !measured) return;

      const fixedBottom = fixed.getBoundingClientRect().bottom;
      const nextHeight = Math.max(
        MIN_BODY_PX,
        Math.min(
          measured.maxBody,
          event.clientY - fixedBottom - LIST_PANE_HANDLE_HEIGHT / 2,
        ),
      );
      const nextRatio = nextHeight / measured.flexArea;

      ratioRef.current = nextRatio;
      setRatio(nextRatio);
      setBodyHeight(nextHeight);
    },
    [measure],
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;

      draggingRef.current = false;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      saveRatio(paneId, ratioRef.current);
    },
    [paneId],
  );

  const onDoubleClick = useCallback(() => {
    ratioRef.current = null;
    setRatio(null);
    setBodyHeight(null);
    saveRatio(paneId, null);
  }, [paneId]);

  return {
    containerRef,
    fixedRef,
    bodyRef,
    footerRef,
    bodyHeight,
    useCustomHeight: ratio !== null,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onDoubleClick,
    },
  };
}
