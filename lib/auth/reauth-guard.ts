/**
 * When the app itself re-authenticates on this device (e.g. biometric unlock
 * on the app-lock), the backend issues a NEW session and revokes the old one
 * as `newer_login`, pushing a `session.revoked` over the socket. That push can
 * arrive before we've swapped in the new token, so a sid comparison alone
 * races. We mark a short window around a self-initiated re-login; the revoke
 * handler ignores a `newer_login` revocation while it's active, so we don't
 * kick ourselves to /login right after unlocking.
 */
let ignoreUntil = 0

/** Open the ignore window (default 15s — longer than any unlock ceremony). */
export function markSelfReauth(windowMs = 15_000): void {
  ignoreUntil = Date.now() + windowMs
}

export function isSelfReauthActive(): boolean {
  return Date.now() < ignoreUntil
}

/** Close the window early once we've settled (optional). */
export function clearSelfReauth(): void {
  ignoreUntil = 0
}
