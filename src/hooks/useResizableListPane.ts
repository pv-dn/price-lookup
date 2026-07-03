import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

const STORAGE_PREFIX = "price-lookup-list-pane-";
export const LIST_PANE_HANDLE_HEIGHT = 20;
const MIN_BODY_PX = 120;
const RATIO_MIN = 0.2;
const RATIO_MAX = 0.95;
const KEYBOARD_STEP_PX = 16;

export type ListPaneBodyVariant = "scroll" | "sheet";

function clampRatio(value: number): number {
  return Math.min(RATIO_MAX, Math.max(RATIO_MIN, value));
}

function loadRatio(paneId: string): number | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${paneId}`);
    if (!raw) return null;
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return null;
    return clampRatio(n);
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
    localStorage.setItem(`${STORAGE_PREFIX}${paneId}`, String(clampRatio(ratio)));
  } catch {
    /* localStorage unavailable */
  }
}

export function useResizableListPane(
  paneId: string,
  bodyVariant: ListPaneBodyVariant = "scroll",
  hasFooter = false,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fixedRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const ratioRef = useRef<number | null>(loadRatio(paneId));

  const [ratio, setRatio] = useState<number | null>(() => ratioRef.current);
  const [bodyHeight, setBodyHeight] = useState<number | null>(null);
  const [showSpacer, setShowSpacer] = useState(false);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const fixed = fixedRef.current;
    if (!container || !fixed) return null;

    const containerRect = container.getBoundingClientRect();
    const fixedRect = fixed.getBoundingClientRect();
    const footerRect = footerRef.current?.getBoundingClientRect();
    const footerHeight = footerRect?.height ?? 0;

    const flexArea =
      containerRect.height -
      fixedRect.height -
      footerHeight -
      LIST_PANE_HANDLE_HEIGHT;

    return {
      flexArea,
      maxBody: Math.max(MIN_BODY_PX, flexArea),
    };
  }, []);

  const applyHeight = useCallback(
    (nextHeight: number, measured: { flexArea: number; maxBody: number }) => {
      const clampedHeight = Math.round(
        Math.max(MIN_BODY_PX, Math.min(measured.maxBody, nextHeight)),
      );
      const nextRatio = clampRatio(clampedHeight / measured.flexArea);

      ratioRef.current = nextRatio;
      setRatio(nextRatio);
      setBodyHeight(clampedHeight);
      setShowSpacer(clampedHeight < measured.maxBody - 1);
    },
    [],
  );

  const applyRatio = useCallback(() => {
    const measured = measure();
    if (!measured || ratioRef.current === null) {
      setBodyHeight(null);
      setShowSpacer(false);
      return;
    }

    applyHeight(ratioRef.current * measured.flexArea, measured);
  }, [applyHeight, measure]);

  useEffect(() => {
    ratioRef.current = loadRatio(paneId);
    setRatio(ratioRef.current);
  }, [paneId]);

  useEffect(() => {
    applyRatio();
  }, [applyRatio, ratio, bodyVariant, hasFooter]);

  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => applyRatio());
    const container = containerRef.current;
    const fixed = fixedRef.current;
    const footer = footerRef.current;

    if (container) observer.observe(container);
    if (fixed) observer.observe(fixed);
    if (footer) observer.observe(footer);

    applyRatio();

    return () => observer.disconnect();
  }, [applyRatio, hasFooter]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (ratioRef.current === null && bodyRef.current) {
        const measured = measure();
        if (measured) {
          const currentHeight = bodyRef.current.getBoundingClientRect().height;
          ratioRef.current = clampRatio(currentHeight / measured.flexArea);
          setRatio(ratioRef.current);
          setBodyHeight(Math.round(currentHeight));
        }
      }

      draggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [measure],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;

      const fixed = fixedRef.current;
      const measured = measure();
      if (!fixed || !measured) return;

      const fixedBottom = fixed.getBoundingClientRect().bottom;
      const nextHeight =
        event.clientY - fixedBottom - LIST_PANE_HANDLE_HEIGHT / 2;

      applyHeight(nextHeight, measured);
    },
    [applyHeight, measure],
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
    setShowSpacer(false);
    saveRatio(paneId, null);
  }, [paneId]);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

      event.preventDefault();
      const measured = measure();
      if (!measured) return;

      const current =
        bodyHeight ??
        bodyRef.current?.getBoundingClientRect().height ??
        measured.maxBody;
      const delta = event.key === "ArrowDown" ? KEYBOARD_STEP_PX : -KEYBOARD_STEP_PX;

      applyHeight(current + delta, measured);
      saveRatio(paneId, ratioRef.current);
    },
    [applyHeight, bodyHeight, measure, paneId],
  );

  const useCustomHeight = ratio !== null;

  return {
    containerRef,
    fixedRef,
    bodyRef,
    footerRef,
    bodyHeight,
    useCustomHeight,
    showSpacer,
    bodyClassName:
      bodyVariant === "sheet"
        ? "screen-scroll-body screen-scroll-body--sheet"
        : "screen-scroll-body",
    handleProps: {
      tabIndex: 0,
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onDoubleClick,
      onKeyDown,
    },
  };
}
