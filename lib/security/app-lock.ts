/**
 * Privacy-lock persistence — FAIL CLOSED.
 *
 * We store a POSITIVE "this browser has been unlocked" marker rather than a
 * "locked" flag. Why: the old flag treated *absence* as unlocked, so clearing
 * site data (which wipes the flag) and reloading walked straight past the PIN
 * wall while the session cookie still authenticated the user. With a positive
 * marker, a missing value reads as LOCKED, so a wiped/altered store can no
 * longer bypass the lock.
 *
 * The marker is written on a real sign-in and on unlock, and removed when the
 * app locks (idle / away) or on sign-out. Stored in localStorage (not session)
 * so a normal refresh — which silently refreshes tokens, NOT a fresh sign-in —
 * preserves the unlocked state; only clearing storage or an idle-lock drops it.
 */
const UNLOCK_KEY = "sb:applock:v2"

/** True only when an explicit unlock/sign-in marker is present. */
export function isAppUnlocked(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(UNLOCK_KEY) === "1"
  } catch {
    return false // storage unavailable → treat as locked (fail closed)
  }
}

/** Record that the user has authenticated/unlocked in this browser. */
export function markAppUnlocked(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(UNLOCK_KEY, "1")
  } catch {
    /* storage unavailable — unlock holds only in memory for this page */
  }
}

/** Drop the unlock marker so the next load / reconcile locks (fail closed). */
export function markAppLocked(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(UNLOCK_KEY)
  } catch {
    /* ignore */
  }
}
