import type { ViewMode } from "../types";

const MODES: { id: ViewMode; label: string }[] = [
  { id: "list", label: "リスト" },
  { id: "sheet", label: "一覧表" },
  { id: "compact", label: "コンパクト" },
];

type Props = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
};

export function ViewModeToggle({ value, onChange }: Props) {
  return (
    <div className="view-toggle" role="tablist" aria-label="表示形式">
      {MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          role="tab"
          aria-selected={value === mode.id}
          className={`view-toggle-btn${value === mode.id ? " active" : ""}`}
          onClick={() => onChange(mode.id)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
