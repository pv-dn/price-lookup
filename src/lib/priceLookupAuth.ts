import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  updatePassword,
  type AuthError,
} from "firebase/auth";
import { auth } from "./firebase";
import { loadUserProfiles } from "./userProfiles";

function isAuthError(error: unknown): error is AuthError {
  return typeof error === "object" && error !== null && "code" in error;
}

function authErrorMessage(error: unknown, fallback: string): string {
  if (!isAuthError(error)) return fallback;
  switch (error.code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "現在のパスワードが正しくありません";
    case "auth/weak-password":
      return "パスワードが短すぎます（6文字以上）";
    case "auth/requires-recent-login":
      return "いったんログアウトして再ログインしてから変更してください";
    case "auth/too-many-requests":
      return "試行が多すぎます。しばらく待ってから再試行してください";
    default:
      return fallback;
  }
}

export async function loginWithPassword(password: string): Promise<void> {
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

/** いまログイン中のユーザーのパスワードを変更（Firebase Console 不要） */
export async function changeLoginPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error("ログインしていません。先にログインしてください。");
  }

  const current = currentPassword.trim();
  const next = newPassword.trim();
  if (!current) throw new Error("現在のパスワードを入力してください");
  if (!next) throw new Error("新しいパスワードを入力してください");
  if (next.length < 6) {
    throw new Error("新しいパスワードは6文字以上にしてください");
  }
  if (current === next) {
    throw new Error("現在と同じパスワードです");
  }

  try {
    const cred = EmailAuthProvider.credential(user.email, current);
    await reauthenticateWithCredential(user, cred);
    await updatePassword(user, next);
  } catch (error) {
    throw new Error(
      authErrorMessage(error, "パスワードを変更できませんでした"),
    );
  }
}
