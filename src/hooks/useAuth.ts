import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { loginWithPourVousPassword } from "../lib/pourvousAuth";
import { clearStoredData } from "../lib/storage";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, []);

  const login = useCallback(async (password: string) => {
    await loginWithPourVousPassword(password);
  }, []);

  const logoutAndClear = useCallback(async () => {
    clearStoredData();
    await signOut(auth);
  }, []);

  return { user, authReady, login, logoutAndClear };
}
