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
