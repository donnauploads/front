/**
 * Admin queue for mobile check deposits.
 *
 *   GET   /admin/check-deposits?status=pending|approved|rejected|all
 *   POST  /admin/check-deposits/:id/approve
 *   POST  /admin/check-deposits/:id/reject  { reason }
 *
 * Approving creates a posted Transaction on the customer's checking
 * account and credits the cached balance. The customer screen updates
 * live via the existing `transaction.created` + `account.balanceChanged`
 * gateway events.
 */

import { apiFetch } from "@/lib/api/client"

export type AdminCheckDepositRow = {
  id: string
  /** Friendly per-deposit reference (e.g. "CHK-23FBCA12"). Backend-derived
   *  so it matches the customer-facing success-screen reference exactly. */
  reference: string
  userId: string
  customerName: string
  customerEmail: string | null
  customerNovaTag: string | null
  customerAvatarUrl: string | null
  accountId: string
  amountCents: string
  status: "pending" | "approved" | "rejected"
  submittedAt: string
  decidedAt: string | null
  decisionReason: string | null
  frontUrl: string | null
  backUrl: string | null
}

export type CheckDepositStatusFilter =
  | "pending"
  | "approved"
  | "rejected"
  | "all"

export function listAdminCheckDeposits(
  status: CheckDepositStatusFilter = "pending",
): Promise<AdminCheckDepositRow[]> {
  const params = new URLSearchParams({ status })
  return apiFetch<AdminCheckDepositRow[]>(
    `/admin/check-deposits?${params.toString()}`,
  )
}

export function approveCheckDeposit(id: string) {
  return apiFetch<{ id: string; status: "approved"; transactionId: string }>(
    `/admin/check-deposits/${encodeURIComponent(id)}/approve`,
    { method: "POST" },
  )
}

export function rejectCheckDeposit(id: string, reason: string) {
  return apiFetch<{ id: string; status: "rejected" }>(
    `/admin/check-deposits/${encodeURIComponent(id)}/reject`,
    { method: "POST", body: { reason } },
  )
}
