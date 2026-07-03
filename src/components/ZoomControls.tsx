type Props = {
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
};

export function ZoomControls({
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onReset,
  canZoomIn,
  canZoomOut,
}: Props) {
  return (
    <div className="zoom-controls" aria-label="画面の拡大・縮小">
      <button
        type="button"
        className="zoom-btn"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        aria-label="縮小"
        title="縮小"
      >
        −
      </button>
      <button
        type="button"
        className="zoom-label"
        onClick={onReset}
        title="100%に戻す"
        aria-label={`表示倍率 ${zoomPercent}パーセント。タップで100%に戻す`}
      >
        {zoomPercent}%
      </button>
      <button
        type="button"
        className="zoom-btn"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        aria-label="拡大"
        title="拡大"
      >
        ＋
      </button>
    </div>
  );
}
