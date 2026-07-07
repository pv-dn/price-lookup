import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export type UserProfile = {
  uid: string;
  shortId?: string;
  displayName?: string;
  email?: string;
};

export async function loadUserProfiles(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, "userProfiles"));
  return snap.docs.map((docSnap) => ({
    uid: docSnap.id,
    ...(docSnap.data() as Omit<UserProfile, "uid">),
  }));
}
