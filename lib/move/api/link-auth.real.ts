/**
 * Capture-and-approve link flow.
 *
 *   POST /linked-accounts/auth/initiate              → { id, status: 'awaiting_otp' }
 *   POST /linked-accounts/auth/:id/send-otp          → { ok, expiresInSec }
 *   POST /linked-accounts/auth/:id/verify            → { status: 'awaiting_approval' }
 *
 * Admin endpoints:
 *   GET  /admin/linked-account-requests              → PendingLinkRequest[]
 *   POST /admin/linked-account-requests/:id/approve  → { linkedAccountId, status: 'approved' }
 *   POST /admin/linked-account-requests/:id/reject   → { id, status: 'rejected' }
 */

import { apiFetch } from "@/lib/api/client"

export type LinkAuthStatus =
  | "awaiting_otp"
  | "awaiting_approval"
  | "approved"
  | "rejected"

export type PendingLinkRequest = {
  id: string
  userId: string
  customer: { email: string; name: string } | null
  institutionId: string
  institutionName: string
  otpEmail: string | null
  status: LinkAuthStatus
  createdAt: string
}

export function initiateLinkAuth(input: {
  institutionId: string
  institutionName: string
  username: string
  password: string
}): Promise<{ id: string; status: "awaiting_otp" }> {
  return apiFetch("/linked-accounts/auth/initiate", {
    method: "POST",
    body: input,
  })
}

export function sendLinkAuthOtp(
  id: string,
  email: string,
): Promise<{ ok: true; expiresInSec: number }> {
  return apiFetch(`/linked-accounts/auth/${encodeURIComponent(id)}/send-otp`, {
    method: "POST",
    body: { email },
  })
}

export function verifyLinkAuthOtp(
  id: string,
  code: string,
): Promise<{ status: "awaiting_approval" }> {
  return apiFetch(`/linked-accounts/auth/${encodeURIComponent(id)}/verify`, {
    method: "POST",
    body: { code },
  })
}

export type MyPendingLinkRequest = {
  id: string
  institutionId: string
  institutionName: string
  status: "awaiting_otp" | "awaiting_approval" | "rejected"
  rejectionReason: string | null
  reviewedAt: string | null
  createdAt: string
}

/**
 * Customer-facing list of the signed-in user's link requests that
 * are still in flight (awaiting_otp / awaiting_approval) or were
 * rejected within the last 24h. Approved requests are not returned
 * here — they show up via the real linked-accounts list instead.
 */
export function listMyPendingLinkRequests(): Promise<MyPendingLinkRequest[]> {
  return apiFetch("/linked-accounts/pending-requests")
}

export type RealLinkedAccountDto = {
  id: string
  providerItemId: string
  institutionId: string
  institutionName: string
  mask: string
  accountType: string
  status: "connected" | "requires_reauth" | "disconnected"
  lastSyncedAt: string | null
  createdAt: string
}

/**
 * Real (admin-approved) linked accounts — what `GET /linked-accounts`
 * returns. Mapped into the page's `LinkedAccount` shape so they merge
 * cleanly with pending rows.
 */
export function listMyLinkedAccounts(): Promise<RealLinkedAccountDto[]> {
  return apiFetch("/linked-accounts")
}

/**
 * Customer dismisses a REJECTED link request. Backend refuses the
 * call if the row is in any other status, so pending rows stay locked.
 */
export function deleteMyLinkRequest(id: string): Promise<void> {
  return apiFetch(`/linked-accounts/auth/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}

/**
 * Unlink an approved LinkedAccount (real DB row, status connected /
 * out_of_sync / needs_reauth). Calls the existing
 * DELETE /linked-accounts/:id route on LinkedAccountsController.
 */
export function unlinkLinkedAccount(id: string): Promise<void> {
  return apiFetch(`/linked-accounts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}

// ─── Admin ────────────────────────────────────────────────────────────

export function listPendingLinkRequests(): Promise<PendingLinkRequest[]> {
  return apiFetch("/admin/linked-account-requests")
}

export function approveLinkRequest(
  id: string,
): Promise<{ id: string; linkedAccountId: string; status: "approved" }> {
  return apiFetch(`/admin/linked-account-requests/${encodeURIComponent(id)}/approve`, {
    method: "POST",
  })
}

export function rejectLinkRequest(
  id: string,
  reason: string,
): Promise<{ id: string; status: "rejected" }> {
  return apiFetch(`/admin/linked-account-requests/${encodeURIComponent(id)}/reject`, {
    method: "POST",
    body: { reason },
  })
}

/** Admin hard-delete. Backend pushes `linkedAccount.changed` so the
 *  customer's pending list updates in real time without a refresh. */
export function deleteLinkRequest(id: string): Promise<void> {
  return apiFetch(`/admin/linked-account-requests/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}
