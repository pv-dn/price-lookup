import { useMemo, useState, useEffect, useRef } from "react";
import { ScreenScrollLayout } from "../components/ScreenScrollLayout";
import type { Customer } from "../types";
import { normalizeQuery } from "../utils/format";

type Props = {
  customers: Customer[];
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
};

export function CustomerScreen({ customers, onSelect, onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAdd) addInputRef.current?.focus();
  }, [showAdd]);

  const sorted = useMemo(() => {
    const linked = customers.filter((c) => !c.manual);
    const manual = customers.filter((c) => c.manual);
    return [...linked, ...manual];
  }, [customers]);

  const filtered = useMemo(() => {
    const q = normalizeQuery(query);
    if (!q) return sorted;
    return sorted.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.kana.toLowerCase().includes(q) ||
        c.kana.includes(query.trim()),
    );
  }, [sorted, query]);

  const manualCount = customers.filter((c) => c.manual).length;

  const handleAdd = () => {
    setAddError(null);
    try {
      onAdd(newName);
      setNewName("");
      setShowAdd(false);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "追加できませんでした");
    }
  };

  return (
    <ScreenScrollLayout
      paneId="customers"
      fixed={
        <>
        <header className="screen-header">
          <h1>客先を選ぶ</h1>
          <p className="screen-subtitle">
            {customers.length}件
            {manualCount > 0 && `（手入力 ${manualCount}件）`}
          </p>
        </header>

        <div className="search-box">
          <input
            type="search"
            placeholder="客先名で検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {!showAdd ? (
          <button
            type="button"
            className="btn btn-secondary add-customer-toggle"
            onClick={() => setShowAdd(true)}
          >
            ＋ 伝票にない客先を追加
          </button>
        ) : (
          <div className="add-customer-box">
            <input
              type="text"
              className="settings-input"
              placeholder="客先名を入力"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              ref={addInputRef}
            />
            <div className="add-customer-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={!newName.trim()}
                onClick={handleAdd}
              >
                追加
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setShowAdd(false);
                  setNewName("");
                  setAddError(null);
                }}
              >
                キャンセル
              </button>
            </div>
            {addError && <p className="inline-error">{addError}</p>}
          </div>
        )}

        <p className="result-count">{filtered.length}件表示</p>
        </>
      }
    >
        {customers.length === 0 ? (
          <p className="empty-hint">
            データがまだありません。右上の「連携」から Excel・JSON 取込、または Firestore 同期を行ってください。
          </p>
        ) : (
        <ul className="list">
          {filtered.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                className={`list-item${customer.manual ? " list-item-manual" : ""}`}
                onClick={() => onSelect(customer.id)}
              >
                <span className="list-item-body">
                  {customer.manual && (
                    <span className="manual-badge">手入力</span>
                  )}
                  <span className="list-item-title">{customer.name}</span>
                </span>
                <span className="list-item-chevron" aria-hidden="true">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
        )}
    </ScreenScrollLayout>
  );
}
