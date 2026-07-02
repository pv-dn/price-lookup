import { doc, getDoc } from "firebase/firestore";
import { convertPourVousBackup } from "./convertPourVous";
import { db } from "./firebase";
import type { PourVousBackup, PriceData } from "../types";

async function loadFsDoc<T>(key: string): Promise<T | null> {
  const snap = await getDoc(doc(db, "pvdata", key));
  if (!snap.exists()) return null;
  const raw = snap.data().value;
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function loadFromFirestore(): Promise<PriceData> {
  const [customers, products, prices] = await Promise.all([
    loadFsDoc<PourVousBackup["customers"]>("customers"),
    loadFsDoc<PourVousBackup["products"]>("products"),
    loadFsDoc<PourVousBackup["prices"]>("prices"),
  ]);

  if (!customers?.length || !products?.length) {
    throw new Error("Firestoreにデータがありません。伝票アプリでログインしてデータを確認してください。");
  }

  const backup: PourVousBackup = {
    customers,
    products,
    prices: prices ?? [],
    exportDate: new Date().toISOString(),
  };

  return convertPourVousBackup(backup, "firestore");
}

export async function checkFirestoreReachable(): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, "pvdata", "products"));
    return snap.exists();
  } catch {
    return false;
  }
}
