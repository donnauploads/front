/**
 * Real adapters for the Security Center surface.
 *
 *   GET    /me/security              → SecurityOverview
 *   GET    /auth/sessions            → SessionRow[]
 *   POST   /auth/sessions/:id/revoke → 204
 *   POST   /auth/password/change     → 204
 *   POST   /me/security/2fa/totp/begin
 *   POST   /me/security/2fa/totp/verify   { code }
 *   POST   /me/security/2fa/totp/disable  { currentCode }
 *   GET    /me/biometric             → BiometricEnrollment[]
 *   POST   /me/biometric/register/begin
 *   POST   /me/biometric/register/finish  { deviceId, response }
 *   DELETE /me/biometric/:id         → 204
 */

import { apiFetch } from "@/lib/api/client"

export type SecurityOverview = {
  email: string | null
  phoneE164: string | null
  activeSessions: number
  knownDevices: number
  totpActive: boolean
  biometricEnrolled: boolean
  passwordUpdatedAt: string | null
}

export type SessionRow = {
  id: string
  createdAt: string
  expiresAt: string
  revokedAt: string | null
  revokedReason: string | null
  current: boolean
  device: {
    id: string
    name: string | null
    os: string | null
    browser: string | null
    ipLastSeen: string | null
    locationLastSeen: unknown
    trusted: boolean
    lastSeenAt: string
  }
}

export type BiometricEnrollment = {
  id: string
  deviceId: string
  createdAt: string
  lastUsedAt: string | null
  transports: string[]
}

export type TotpBeginResponse = {
  otpauthUrl: string
  secret: string
}

export function getSecurityOverview(): Promise<SecurityOverview> {
  return apiFetch<SecurityOverview>("/me/security")
}

export function listSessions(): Promise<SessionRow[]> {
  return apiFetch<SessionRow[]>("/auth/sessions")
}

export function revokeSession(id: string): Promise<void> {
  return apiFetch<void>(`/auth/sessions/${id}/revoke`, { method: "POST" })
}

export function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return apiFetch<void>("/auth/password/change", {
    method: "POST",
    body: { currentPassword, newPassword },
  })
}

/**
 * First-login password set for admin-provisioned accounts. No current
 * password — the authenticated session is the proof of identity. Only
 * valid while the account is flagged securitySetupRequired.
 */
export function setFirstLoginPassword(newPassword: string): Promise<void> {
  return apiFetch<void>("/auth/password/first-login", {
    method: "POST",
    body: { newPassword },
  })
}

export function totpBegin(): Promise<TotpBeginResponse> {
  return apiFetch<TotpBeginResponse>("/me/security/2fa/totp/begin", {
    method: "POST",
  })
}

export function totpVerify(code: string): Promise<void> {
  return apiFetch<void>("/me/security/2fa/totp/verify", {
    method: "POST",
    body: { code },
  })
}

export function totpDisable(currentCode: string): Promise<void> {
  return apiFetch<void>("/me/security/2fa/totp/disable", {
    method: "POST",
    body: { currentCode },
  })
}

export function listBiometric(): Promise<BiometricEnrollment[]> {
  return apiFetch<BiometricEnrollment[]>("/me/biometric")
}

export function biometricRegisterBegin(): Promise<unknown> {
  return apiFetch<unknown>("/me/biometric/register/begin", { method: "POST" })
}

export function biometricRegisterFinish(
  deviceId: string,
  response: unknown,
): Promise<{ verified: boolean }> {
  return apiFetch<{ verified: boolean }>("/me/biometric/register/finish", {
    method: "POST",
    body: { deviceId, response },
  })
}

export function biometricRemove(id: string): Promise<void> {
  return apiFetch<void>(`/me/biometric/${id}`, { method: "DELETE" })
}

/**
 * Re-enable a previously toggled-off enrollment for this device. No
 * WebAuthn ceremony — the server just flips the soft-delete flag back.
 * `reactivated: false` means no dormant row exists for this device, so
 * the caller should fall back to the rebind flow (below) or a full
 * register/begin → finish dance.
 */
export function biometricReactivate(
  deviceId: string,
): Promise<{ reactivated: boolean }> {
  return apiFetch<{ reactivated: boolean }>(
    "/me/biometric/reactivate",
    { method: "POST", body: { deviceId } },
  )
}

export function biometricRebindBegin(): Promise<unknown> {
  return apiFetch<unknown>("/me/biometric/rebind/begin", { method: "POST" })
}

export function biometricRebindFinish(
  deviceId: string,
  response: unknown,
): Promise<{ verified: true }> {
  return apiFetch<{ verified: true }>("/me/biometric/rebind/finish", {
    method: "POST",
    body: { deviceId, response },
  })
}
