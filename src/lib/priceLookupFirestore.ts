import { doc, getDoc, setDoc } from "firebase/firestore";
import { loadHiddenGenres, saveHiddenGenres } from "./genreVisibilityStorage";
import { db } from "./firebase";
import { validatePriceData } from "./storage";
import type { PriceData } from "../types";

export type PriceLookupCloudBackup = {
  data: PriceData;
  hiddenGenres: string[];
  savedAt: string;
};

function docIdForUser(uid: string): string {
  return `price-lookup-${uid}`;
}

export function dataRevisionTime(data: PriceData): number {
  if (data.meta.syncedAt) {
    const t = Date.parse(data.meta.syncedAt);
    if (!Number.isNaN(t)) return t;
  }
  const day = data.meta.updatedAt;
  if (!day) return 0;
  // 日付のみの場合は弱い信号（正午扱い）
  const t = Date.parse(`${day}T12:00:00`);
  return Number.isNaN(t) ? 0 : t;
}

/** クラウド側は savedAt（実保存時刻）を優先して比較する */
export function cloudBackupTime(backup: PriceLookupCloudBackup): number {
  const saved = backup.savedAt ? Date.parse(backup.savedAt) : NaN;
  const fromData = dataRevisionTime(backup.data);
  if (!Number.isNaN(saved) && saved > 0) return Math.max(saved, fromData);
  return fromData;
}

/**
 * ローカルとクラウドのどちらを採用するか。
 * 同時刻・日付のみの同点ではクラウドを優先（他PCの古いキャッシュが上書きするのを防ぐ）。
 */
export function resolveLocalVsCloud(
  local: PriceData,
  cloud: PriceLookupCloudBackup,
): { data: PriceData; source: "local" | "cloud"; hiddenGenres: string[] } {
  const localTime = dataRevisionTime(local);
  const cloudTime = cloudBackupTime(cloud);

  if (localTime > cloudTime) {
    return {
      data: local,
      source: "local",
      hiddenGenres: loadHiddenGenres(),
    };
  }

  return {
    data: cloud.data,
    source: "cloud",
    hiddenGenres: cloud.hiddenGenres,
  };
}

export function pickNewerPriceData(a: PriceData, b: PriceData): PriceData {
  return dataRevisionTime(a) >= dataRevisionTime(b) ? a : b;
}

export async function loadPriceLookupBackup(
  uid: string,
): Promise<PriceLookupCloudBackup | null> {
  const snap = await getDoc(doc(db, "pvdata", docIdForUser(uid)));
  if (!snap.exists()) return null;

  const raw = snap.data().value;
  if (typeof raw !== "string") return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const backup = parsed as PriceLookupCloudBackup;
    if (!validatePriceData(backup.data)) return null;

    return {
      data: backup.data,
      hiddenGenres: Array.isArray(backup.hiddenGenres) ? backup.hiddenGenres : [],
      savedAt: typeof backup.savedAt === "string" ? backup.savedAt : "",
    };
  } catch {
    return null;
  }
}

export async function savePriceLookupBackup(
  uid: string,
  backup: PriceLookupCloudBackup,
): Promise<void> {
  await setDoc(doc(db, "pvdata", docIdForUser(uid)), {
    value: JSON.stringify(backup),
  });
}

export function applyHiddenGenresFromCloud(labels: string[]): void {
  saveHiddenGenres(labels);
}
