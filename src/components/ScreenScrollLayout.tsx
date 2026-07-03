import type { ReactNode } from "react";
import {
  useResizableListPane,
  type ListPaneBodyVariant,
} from "../hooks/useResizableListPane";

type Props = {
  paneId: string;
  className?: string;
  bodyVariant?: ListPaneBodyVariant;
  fixed: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export function ScreenScrollLayout({
  paneId,
  className,
  bodyVariant = "scroll",
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
    showSpacer,
    bodyClassName,
    handleProps,
  } = useResizableListPane(paneId, bodyVariant);

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
        aria-label="一覧の高さを調整"
        title="ドラッグで一覧の高さを変更。ダブルクリックで自動に戻す"
        {...handleProps}
      >
        <span className="screen-scroll-resize-grip" aria-hidden="true" />
        <span className="screen-scroll-resize-label">ドラッグで高さ調整</span>
      </div>

      <div
        ref={bodyRef}
        className={`${bodyClassName}${useCustomHeight ? " screen-scroll-body-sized" : ""}`}
        style={
          useCustomHeight && bodyHeight !== null
            ? { height: bodyHeight, flex: "0 0 auto" }
            : undefined
        }
      >
        {children}
      </div>

      {showSpacer ? <div className="screen-scroll-spacer" aria-hidden="true" /> : null}

      {footer ? (
        <div ref={footerRef} className="screen-scroll-footer">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
