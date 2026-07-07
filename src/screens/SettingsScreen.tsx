import { useRef, useState } from "react";
import { convertPourVousBackup, validatePourVousBackup } from "../lib/convertPourVous";
import { mergePriceSheetExcelResult } from "../lib/mergePriceSheetExcel";
import { getManualCustomers, removeManualCustomer } from "../lib/manualCustomers";
import { mergePourVousWithLocal } from "../lib/productMaster";
import { readPriceSheetExcelFile } from "../lib/parsePriceSheetExcel";
import { loadFromFirestore } from "../lib/pourvousFirestore";
import { defaultCategories } from "../constants/productCategories";
import { ensureProductCategories } from "../lib/productMaster";
import type { PriceData } from "../types";

type Props = {
  data: PriceData | null;
  onApply: (data: PriceData) => void;
  onResetStored: () => void;
  onExit: () => void;
  onBack: () => void;
  userEmail: string | null;
};

const SOURCE_LABELS: Record<string, string> = {
  none: "未取込",
  import: "JSON取込",
  firestore: "Firestore同期",
  excel: "価格表Excel",
};

export function SettingsScreen({
  data,
  onApply,
  onResetStored,
  onExit,
  onBack,
  userEmail,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const excelRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const [busy, setBusy] = useState(false);

  const showMsg = (text: string, type: "ok" | "err") => {
    setMessage({ text, type });
  };

  const handleImport = async (file: File) => {
    setBusy(true);
    setMessage(null);
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (!validatePourVousBackup(parsed)) {
        throw new Error("プゥルヴー伝票のバックアップJSONではありません");
      }
      const converted = convertPourVousBackup(parsed, "import");
      const merged = mergePourVousWithLocal(converted, data);
      onApply(merged);
      const manualKept = getManualCustomers(merged).length;
      showMsg(
        `取込完了（客先${merged.customers.length}件・品番${merged.products.length}件・単価${merged.prices.length}件${manualKept ? `・手入力${manualKept}件保持` : ""}）`,
        "ok",
      );
    } catch (e) {
      showMsg(e instanceof Error ? e.message : "取込に失敗しました", "err");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleExcelImport = async (file: File) => {
    if (!data) {
      showMsg("データが読み込まれていません", "err");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const buffer = await file.arrayBuffer();
      const categories = data.categories.length > 0 ? data.categories : defaultCategories();
      const sheet = await readPriceSheetExcelFile(buffer, categories);
      const { data: merged, message } = mergePriceSheetExcelResult(
        ensureProductCategories(data),
        sheet,
      );
      onApply(merged);
      showMsg(message, "ok");
    } catch (e) {
      showMsg(e instanceof Error ? e.message : "Excel取込に失敗しました", "err");
    } finally {
      setBusy(false);
      if (excelRef.current) excelRef.current.value = "";
    }
  };

  const handleFirestoreSync = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const converted = await loadFromFirestore();
      const merged = mergePourVousWithLocal(converted, data);
      onApply(merged);
      const manualKept = getManualCustomers(merged).length;
      showMsg(
        `同期完了（客先${merged.customers.length}件・品番${merged.products.length}件・単価${merged.prices.length}件${manualKept ? `・手入力${manualKept}件保持` : ""}）`,
        "ok",
      );
    } catch (e) {
      showMsg(e instanceof Error ? e.message : "同期に失敗しました", "err");
    } finally {
      setBusy(false);
    }
  };

  const source = data?.meta.source ?? "none";
  const manualCustomers = data ? getManualCustomers(data) : [];

  const handleDeleteManual = (id: string, name: string) => {
    if (!data) return;
    if (!confirm(`手入力の客先「${name}」を削除しますか？`)) return;
    try {
      onApply(removeManualCustomer(data, id));
      showMsg(`「${name}」を削除しました`, "ok");
    } catch (e) {
      showMsg(e instanceof Error ? e.message : "削除できませんでした", "err");
    }
  };

  return (
    <div className="screen">
      <header className="screen-header with-back">
        <button type="button" className="back-button" onClick={onBack}>
          ← 戻る
        </button>
        <h1>データ連携</h1>
        <p className="screen-subtitle">プゥルヴー伝票と品番・品名・単価を共有</p>
      </header>

      <div className="settings-card">
        <h2 className="settings-title">現在のデータ</h2>
        <dl className="meta-list settings-meta">
          <div className="meta-row">
            <dt>ソース</dt>
            <dd>{SOURCE_LABELS[source] ?? source}</dd>
          </div>
          <div className="meta-row">
            <dt>客先</dt>
            <dd>{data?.customers.length ?? 0}件</dd>
          </div>
          <div className="meta-row">
            <dt>品番</dt>
            <dd>{data?.products.length ?? 0}件</dd>
          </div>
          <div className="meta-row">
            <dt>基本単価</dt>
            <dd>{data?.basePrices.length ?? 0}件</dd>
          </div>
          <div className="meta-row">
            <dt>単価設定</dt>
            <dd>{data?.prices.length ?? 0}件</dd>
          </div>
          {data?.meta.syncedAt && (
            <div className="meta-row">
              <dt>最終取得</dt>
              <dd>{new Date(data.meta.syncedAt).toLocaleString("ja-JP")}</dd>
            </div>
          )}
        </dl>
      </div>

      <section className="settings-section">
        <h2 className="settings-title">① 価格表Excel取込</h2>
        <p className="settings-desc">
          デスクトップの「かかくひょう」ひな型（.xlsx）を選びます。2行目に客先名、5行目以降に品名を書いた表に対応します。単価が空でも品目だけ取り込めます。
        </p>
        <label className={`btn btn-secondary file-label${busy ? " disabled" : ""}`}>
          Excelファイルを選ぶ
          <input
            ref={excelRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={busy}
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleExcelImport(f);
            }}
          />
        </label>
      </section>

      <section className="settings-section">
        <h2 className="settings-title">② 伝票JSON取込</h2>
        <p className="settings-desc">
          伝票アプリの「バックアップをdownload」で保存したJSONを選びます。
        </p>
        <label className={`btn btn-secondary file-label${busy ? " disabled" : ""}`}>
          JSONファイルを選ぶ
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            disabled={busy}
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
            }}
          />
        </label>
      </section>

      <section className="settings-section">
        <h2 className="settings-title">③ Firestore同期</h2>
        <p className="settings-desc">
          伝票アプリと同じクラウドデータから最新の品番・単価を取得します。
        </p>
        {userEmail && <p className="settings-logged-in">ログイン中: {userEmail}</p>}
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={handleFirestoreSync}
        >
          最新データを同期
        </button>
      </section>

      {manualCustomers.length > 0 && (
        <section className="settings-section">
          <h2 className="settings-title">手入力の客先</h2>
          <p className="settings-desc">
            伝票アプリにない客先です。取込・同期しても残ります。
          </p>
          <ul className="list">
            {manualCustomers.map((c) => (
              <li key={c.id}>
                <div className="list-item list-item-manual-row">
                  <span className="list-item-body">
                    <span className="manual-badge">手入力</span>
                    <span className="list-item-title">{c.name}</span>
                  </span>
                  <button
                    type="button"
                    className="btn-delete-small"
                    onClick={() => handleDeleteManual(c.id, c.name)}
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="settings-section">
        <h2 className="settings-title">セキュリティ</h2>
        <p className="settings-desc">
          バックアップJSONはメール添付や個人クラウドに置かないでください。この端末から単価データを消すときは「データを消して終了」を使います。
        </p>
        <div className="settings-actions-col">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => {
              if (confirm("保存している単価データを消しますか？")) onResetStored();
            }}
          >
            保存データを消す
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={busy}
            onClick={onExit}
          >
            データを消して終了
          </button>
        </div>
      </section>

      {message && (
        <div className={`notice ${message.type === "ok" ? "notice-ok" : "notice-err"}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
