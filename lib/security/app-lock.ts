/**
 * Persisted flag for the AppLock privacy lock. Stored in localStorage so a
 * page refresh (which silently refreshes tokens, NOT a fresh sign-in) keeps
 * the app locked — otherwise reloading would bypass the PIN screen.
 *
 * Cleared on a real sign-in (login / mfa / biometric) and on unlock, so a
 * fresh session never starts locked.
 */
const LOCK_KEY = "sb:applock"

export function readAppLock(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(LOCK_KEY) === "1"
  } catch {
    return false
  }
}

export function setAppLock(locked: boolean): void {
  if (typeof window === "undefined") return
  try {
    if (locked) window.localStorage.setItem(LOCK_KEY, "1")
    else window.localStorage.removeItem(LOCK_KEY)
  } catch {
    /* storage unavailable — fall back to in-memory only */
  }
}
