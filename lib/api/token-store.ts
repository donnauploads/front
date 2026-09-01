/**
 * Access-token storage lives in module-level memory ON PURPOSE. On a full
 * page reload it's gone — we recover by replaying the httpOnly refresh
 * cookie against POST /auth/refresh. Never put this in zustand+persist;
 * that would land the token in localStorage where XSS can read it.
 */

let accessToken: string | null = null
let accessExpiresAt: number | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string, expiresIn: number): void {
  accessToken = token
  accessExpiresAt = Date.now() + expiresIn * 1000
}

export function clearAccessToken(): void {
  accessToken = null
  accessExpiresAt = null
}

export function isAccessTokenExpired(): boolean {
  return accessExpiresAt !== null && Date.now() >= accessExpiresAt
}

/**
 * The session id (`sid`) of the CURRENT access token, decoded from the JWT
 * payload. Used to tell whether a `session.revoked` push targets the session
 * we're actually on (real logout) versus an older session we just replaced by
 * re-authenticating on this device (biometric unlock) — which must be ignored.
 * Returns null if there's no token or it can't be parsed.
 */
export function getAccessTokenSid(): string | null {
  if (!accessToken) return null
  try {
    const payload = accessToken.split('.')[1]
    if (!payload) return null
    const json = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { sid?: unknown }
    return typeof json.sid === 'string' ? json.sid : null
  } catch {
    return null
  }
}
