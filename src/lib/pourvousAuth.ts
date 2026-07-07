import { signInWithEmailAndPassword, type AuthError } from "firebase/auth";
import { auth } from "./firebase";
import { loadUserProfiles } from "./userProfiles";

function isAuthError(error: unknown): error is AuthError {
  return typeof error === "object" && error !== null && "code" in error;
}

export async function loginWithPourVousPassword(password: string): Promise<void> {
  const trimmed = password.trim();
  if (!trimmed) {
    throw new Error("パスワードを入力してください");
  }

  const profiles = await loadUserProfiles();
  if (profiles.length === 0) {
    throw new Error("ユーザー情報を取得できません。しばらく待ってから再試行してください。");
  }

  for (const profile of profiles) {
    const email = profile.shortId
      ? `${profile.shortId.toLowerCase()}@pv.local`
      : (profile.email ?? "");
    if (!email) continue;

    try {
      await signInWithEmailAndPassword(auth, email, trimmed);
      return;
    } catch (error) {
      if (isAuthError(error) && error.code === "auth/too-many-requests") {
        throw new Error("ログイン試行が多すぎます。しばらく待ってから再試行してください。");
      }
    }
  }

  throw new Error("パスワードが正しくありません");
}
