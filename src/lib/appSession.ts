const SESSION_KEY = "price-lookup-unlocked";

export function isAppUnlocked(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAppUnlocked(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* sessionStorage unavailable */
  }
}

export function clearAppSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* sessionStorage unavailable */
  }
}
