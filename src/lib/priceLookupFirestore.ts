import { doc, getDoc, setDoc } from "firebase/firestore";
import { saveHiddenGenres } from "./genreVisibilityStorage";
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
  const t = Date.parse(`${day}T12:00:00`);
  return Number.isNaN(t) ? 0 : t;
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
