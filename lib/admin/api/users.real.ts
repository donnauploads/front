/**
 * Real adapter for admin user-search + role management.
 *
 *   GET  /admin/users           ?q&limit
 *   GET  /admin/users/:id
 *   POST /admin/users/:id/sessions/revoke-all
 *   POST /admin/users/:id/role  { role, reason }     (superadmin only)
 *
 * Backend: backend/apps/api/src/modules/admin/users/admin-users.controller.ts
 *
 * The legacy `listUsers / getUser / setUserRole` stubs at the bottom are
 * kept throwing so the existing mocks-shaped switch in ./users.ts and any
 * components routing through it (the user-detail page) stay
 * type-compatible. The new admin/users page imports the named functions
 * below directly.
 */

import { apiFetch } from "@/lib/api/client"
import type { AdminUser, Role } from "@/lib/store"

// ─── Real surface used by the new admin users page ──────────────────────

export type AdminUserStatus = "active" | "frozen" | "closed"

export type AdminUserRow = {
  id: string
  email: string
  novaTag: string | null
  phoneE164: string | null
  firstName: string | null
  lastName: string | null
  role: Role
  status: AdminUserStatus
  createdAt: string
}

export async function searchAdminUsers(args: {
  q?: string
  limit?: number
}): Promise<AdminUserRow[]> {
  const params = new URLSearchParams()
  if (args.q) params.set("q", args.q)
  if (args.limit) params.set("limit", String(args.limit))
  const qs = params.toString()
  return apiFetch<AdminUserRow[]>(`/admin/users${qs ? `?${qs}` : ""}`)
}

export type AdminUserAccount = {
  id: string
  type: string
  label: string
  balanceCents: string
  status: string
}

export type AdminUserDetail = AdminUserRow & {
  dob: string | null
  kycRecord: unknown
  accounts: AdminUserAccount[]
  /** Admin-controlled lock on all money movement. Read-only here;
   *  toggled via setUserTransfersDisabled. */
  transfersDisabled?: boolean
  transfersDisabledReason?: string | null
  transfersDisabledAt?: string | null
  /** Admin kill switch on every notification email to the user. Read-only
   *  here; toggled via setUserEmailNotificationsDisabled. */
  emailNotificationsDisabled?: boolean
  emailNotificationsDisabledReason?: string | null
  emailNotificationsDisabledAt?: string | null
}

export async function getAdminUser(id: string): Promise<AdminUserDetail> {
  return apiFetch<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`)
}

export type CreateAdminUserBody = {
  email: string
  /** Temporary password the admin hands off. The user is forced to
   *  replace it on first sign-in when requireSecuritySetup is true. */
  password: string
  firstName?: string
  lastName?: string
  phoneE164?: string
  novaTag?: string
  role: Role
  status?: AdminUserStatus
  /** When true, the backend flags the user so /me returns
   *  securitySetupRequired:true until they change their password AND set
   *  a transaction PIN (drives FirstLoginSecurityGate). */
  requireSecuritySetup?: boolean
  /** Required — audit-logged. */
  reason: string
}

/**
 * Create a user.  POST /admin/users
 * Superadmin-only on the backend when role !== "customer".
 * Returns the freshly-created detail row (same shape as getAdminUser).
 */
export async function createAdminUser(
  body: CreateAdminUserBody,
): Promise<AdminUserDetail> {
  return apiFetch<AdminUserDetail>(`/admin/users`, {
    method: "POST",
    body,
  })
}

export type AdminUserSessionGeo = {
  city: string | null
  region: string | null
  country: string | null
  /** ISO 3166-1 alpha-2 (e.g. "US") for flag rendering. */
  countryCode: string | null
}

export type AdminUserSessionDevice = {
  id: string
  name: string
  os: string
  browser: string
  ip: string
  lastSeenAt: string
  geo: AdminUserSessionGeo | null
}

export type AdminUserSession = {
  id: string
  createdAt: string
  expiresAt: string
  revokedAt: string | null
  revokedReason: string | null
  device: AdminUserSessionDevice | null
}

export async function listAdminUserSessions(
  id: string,
  limit = 3,
): Promise<AdminUserSession[]> {
  const params = new URLSearchParams()
  if (limit) params.set("limit", String(limit))
  return apiFetch<AdminUserSession[]>(
    `/admin/users/${encodeURIComponent(id)}/sessions?${params.toString()}`,
  )
}

export async function activateAdminUser(id: string, reason: string) {
  return apiFetch<{ id: string; status: AdminUserStatus; unchanged: boolean }>(
    `/admin/users/${encodeURIComponent(id)}/activate`,
    { method: "POST", body: { reason } },
  )
}

export async function deactivateAdminUser(id: string, reason: string) {
  return apiFetch<{ id: string; status: AdminUserStatus; unchanged: boolean }>(
    `/admin/users/${encodeURIComponent(id)}/deactivate`,
    { method: "POST", body: { reason } },
  )
}

export async function forceUserPasswordReset(id: string, reason: string) {
  return apiFetch<{ ok: true }>(
    `/admin/users/${encodeURIComponent(id)}/password-reset`,
    { method: "POST", body: { reason } },
  )
}

/**
 * Directly set a user's password.  POST /admin/users/:id/password
 *
 * The backend hashes `password` (argon2/bcrypt) — admins SET it but can
 * never read back a stored password (there is no plaintext to return).
 * When requireSecuritySetup is true, the user must replace it (and set a
 * transaction PIN) on next sign-in via FirstLoginSecurityGate.
 * Superadmin-only on the backend; audit-logged with `reason`.
 */
export async function setAdminUserPassword(
  id: string,
  body: { password: string; requireSecuritySetup?: boolean; reason: string },
) {
  return apiFetch<{ ok: true }>(
    `/admin/users/${encodeURIComponent(id)}/password`,
    { method: "POST", body },
  )
}

export type AdminMessageChannel = "notification" | "popup" | "both"

/**
 * Send a direct message to a user. POST /admin/users/:id/message
 *   - notification → persists to their bell panel (live)
 *   - popup        → real-time modal over their dashboard
 *   - both         → both
 */
export async function sendUserMessage(
  id: string,
  body: {
    title: string
    body: string
    channel: AdminMessageChannel
    reason: string
  },
) {
  return apiFetch<{ ok: true; notificationId: string | null }>(
    `/admin/users/${encodeURIComponent(id)}/message`,
    { method: "POST", body },
  )
}

export async function resetAdminUserHistory(id: string, reason: string) {
  return apiFetch<{
    deletedTransactions: number
    deletedOverrides: number
    accountsZeroed: number
  }>(`/admin/users/${encodeURIComponent(id)}/reset-history`, {
    method: "POST",
    body: { reason },
  })
}

export async function revokeAllUserSessions(id: string) {
  return apiFetch<{ revoked: number }>(
    `/admin/users/${encodeURIComponent(id)}/sessions/revoke-all`,
    { method: "POST" },
  )
}

/** Force-logout + hard-delete ALL of the user's login history (sessions,
 *  devices, and the refresh-token trail). Wipes the "recent logins" timeline. */
export async function resetUserLoginHistory(id: string) {
  return apiFetch<{
    loggedOut: number
    sessionsDeleted: number
    devicesDeleted: number
  }>(`/admin/users/${encodeURIComponent(id)}/sessions/reset`, {
    method: "POST",
  })
}

export type UpdateAdminUserBody = {
  firstName?: string
  lastName?: string
  novaTag?: string
  phoneE164?: string
  dob?: string
  email?: string
  role?: Role
  status?: AdminUserStatus
  /** Required — audit-logged with the diff. */
  reason: string
}

export async function updateAdminUser(id: string, body: UpdateAdminUserBody) {
  return apiFetch<{
    id: string
    email: string
    novaTag: string | null
    phoneE164: string | null
    firstName: string | null
    lastName: string | null
    role: Role
    status: AdminUserStatus
    createdAt: string
    dob: string | null
    unchanged: boolean
  }>(`/admin/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  })
}

export async function changeAdminUserRole(
  id: string,
  body: { role: Role; reason: string },
) {
  return apiFetch<{ id: string; role: Role }>(
    `/admin/users/${encodeURIComponent(id)}/role`,
    { method: "POST", body },
  )
}

/** Toggle the admin-controlled lock on every form of money movement for
 *  the user. When `disabled=true`, every initiate path returns
 *  TRANSFERS_DISABLED until cleared. */
export async function setUserTransfersDisabled(
  id: string,
  body: { disabled: boolean; reason?: string },
) {
  return apiFetch<{
    id: string
    transfersDisabled: boolean
    transfersDisabledReason: string | null
    transfersDisabledAt: string | null
  }>(`/admin/users/${encodeURIComponent(id)}/transfers-block`, {
    method: "POST",
    body,
  })
}

/** Toggle the admin kill switch on every notification email to the user
 *  (transaction alerts, security alerts, support replies, marketing).
 *  Auth-critical mail — MFA codes, password resets — still delivers. */
export async function setUserEmailNotificationsDisabled(
  id: string,
  body: { disabled: boolean; reason?: string },
) {
  return apiFetch<{
    id: string
    emailNotificationsDisabled: boolean
    emailNotificationsDisabledReason: string | null
    emailNotificationsDisabledAt: string | null
  }>(`/admin/users/${encodeURIComponent(id)}/email-notifications`, {
    method: "POST",
    body,
  })
}

export type HardDeleteUserCounts = {
  accounts: number
  sessions: number
  devices: number
  transactions: number
  transactionOverrides: number
  transfers: number
  statements: number
  cards: number
  accountLimits: number
  cardOrders: number
  activatedDeals: number
  autosaveConfigs: number
  biometricChallenges: number
  biometricEnrollments: number
  checkDeposits: number
  contacts: number
  directDeposits: number
  documents: number
  goals: number
  idempotencyKeys: number
  kycRecords: number
  linkedAccounts: number
  mfaChallenges: number
  notifications: number
  notificationPreferences: number
  paymentRequests: number
  recurringTransfers: number
  referrals: number
  roundUpLedger: number
  taxForms: number
  totpSecrets: number
  userPreferences: number
  supportThreads: number
}

/**
 * Hard-delete a user. The backend requires `confirmation` to match the
 * user's email exactly (case-insensitive) and `reason` (audit-logged).
 * Superadmin-only — non-superadmins get a 403.
 */
export async function deleteAdminUser(
  id: string,
  body: { confirmation: string; reason: string },
) {
  return apiFetch<{
    id: string
    deleted: true
    counts: HardDeleteUserCounts
  }>(`/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
    body,
  })
}

/** Convenience: build the display name a row should show. */
export function displayNameOf(u: {
  firstName: string | null
  lastName: string | null
  email: string
}): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim()
  return name || u.email
}

// ─── Legacy stubs for the mocks-shaped switch in ./users.ts ─────────────

const NOT_IMPL =
  "admin/users: this entry isn't used in real mode. Use searchAdminUsers / getAdminUser / changeAdminUserRole instead."

export async function listUsers(_q?: string): Promise<AdminUser[]> {
  throw new Error(NOT_IMPL)
}

export async function getUser(_id: string): Promise<AdminUser> {
  throw new Error(NOT_IMPL)
}

export async function setUserRole(_args: {
  id: string
  role: Role
}): Promise<AdminUser> {
  throw new Error(NOT_IMPL)
}
