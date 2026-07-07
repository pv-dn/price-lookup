type Props = {
  categories: string[];
  isVisible: (label: string) => boolean;
  onToggle: (label: string) => void;
  onShowAll: () => void;
  allVisible: boolean;
};

export function GenreVisibilityBar({
  categories,
  isVisible,
  onToggle,
  onShowAll,
  allVisible,
}: Props) {
  if (categories.length === 0) return null;

  return (
    <div className="genre-visibility-row" role="group" aria-label="表示するジャンル">
      <span className="pm-sort-label">表示</span>
      {categories.map((label) => (
        <button
          key={label}
          type="button"
          className={`pm-chip genre-vis-chip${isVisible(label) ? " active" : ""}`}
          aria-pressed={isVisible(label)}
          onClick={() => onToggle(label)}
        >
          {label}
        </button>
      ))}
      {!allVisible && (
        <button type="button" className="genre-vis-show-all" onClick={onShowAll}>
          すべて
        </button>
      )}
    </div>
  );
}
