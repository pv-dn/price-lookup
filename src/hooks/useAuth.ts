import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  clearAppSession,
  isAppUnlocked,
  setAppUnlocked,
} from "../lib/appSession";
import { loginWithPassword } from "../lib/priceLookupAuth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        clearAppSession();
        setUnlocked(false);
        return;
      }
      setUnlocked(isAppUnlocked());
    });
  }, []);

  useEffect(() => {
    if (authReady && user && !isAppUnlocked()) {
      setUnlocked(false);
    }
  }, [authReady, user]);

  const login = useCallback(async (password: string) => {
    await loginWithPassword(password);
    setAppUnlocked();
    setUnlocked(true);
  }, []);

  const isAuthenticated = !!user && unlocked;

  return { user, authReady, isAuthenticated, login };
}
