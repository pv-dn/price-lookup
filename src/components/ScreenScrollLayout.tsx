import type { ReactNode } from "react";
import { useResizableListPane } from "../hooks/useResizableListPane";

type Props = {
  paneId: string;
  className?: string;
  fixed: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export function ScreenScrollLayout({
  paneId,
  className,
  fixed,
  footer,
  children,
}: Props) {
  const {
    containerRef,
    fixedRef,
    bodyRef,
    footerRef,
    bodyHeight,
    useCustomHeight,
    handleProps,
  } = useResizableListPane(paneId);

  const rootClassName = ["screen", "screen-scroll-layout", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={containerRef} className={rootClassName}>
      <div ref={fixedRef} className="screen-scroll-fixed">
        {fixed}
      </div>

      <div
        className="screen-scroll-resize-handle"
        role="separator"
        aria-orientation="horizontal"
        aria-label="リストの高さを調整"
        title="ドラッグでリストの高さを変更。ダブルクリックで自動に戻す"
        {...handleProps}
      />

      <div
        ref={bodyRef}
        className={`screen-scroll-body${useCustomHeight ? " screen-scroll-body-sized" : ""}`}
        style={
          useCustomHeight && bodyHeight !== null
            ? { height: bodyHeight, flex: "0 0 auto" }
            : undefined
        }
      >
        {children}
      </div>

      {footer ? (
        <div ref={footerRef} className="screen-scroll-footer">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
