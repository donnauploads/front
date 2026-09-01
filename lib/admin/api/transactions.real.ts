/**
 * Real adapter for admin transaction listing + override tools.
 *
 *   GET    /admin/transactions          ?userId&accountId&from&to&cursor&limit
 *   GET    /admin/transactions/:id
 *   PATCH  /admin/transactions/:id      { amountCents?, occurredAt?, ...reason }
 *   POST   /admin/transactions/:id/hide { reason }
 *   DELETE /admin/transactions/:id/override
 *   POST   /admin/transactions/bulk-shift { transactionIds[], shiftDays, reason }
 *
 * Backend: backend/apps/api/src/modules/admin/transactions/admin-transactions.controller.ts
 *
 * Amounts come back as decimal-cents strings (because BigInt) — callers
 * convert with `centsToDollars`. The page reads `effective.*` for display
 * (override-applied) and `raw.*` only when showing the override diff.
 *
 * Note on the legacy switch in ./transactions.ts: that file imports the
 * stubbed `patchTransaction / deleteOverride / bulkShift` so the
 * mocks-driven `TransactionEditSheet` + `BulkShiftBar` stay
 * type-compatible. The real admin page imports the named functions below
 * (`listAdminTransactions`, `patchAdminTransaction`, etc.) directly.
 */

import { apiFetch } from "@/lib/api/client"
import type {
  BulkShiftRequest,
  PatchTxRequest,
  PatchTxResponse,
} from "../mocks/transactions.mock"
import type { AdminTxRecord, TxOverride } from "@/lib/store"

// ─── Real, used by the new admin transactions page ───────────────────────

export type AdminTxServerStatus =
  | "pending"
  | "posted"
  | "declined"
  | "reversed"
  | "hidden"

export type AdminTxFields = {
  amountCents: string
  occurredAt: string
  description: string
  category: string
  status: AdminTxServerStatus
}

export type AdminTxOverride = {
  id: string
  overrideAmountCents: string | null
  overrideOccurredAt: string | null
  overrideDescription: string | null
  overrideCategory: string | null
  overrideStatus: string | null
  compensatingEntryId: string | null
  appliedByUserId: string
  appliedAt: string
  reason: string
}

export type AdminTxListItem = {
  id: string
  accountId: string
  userId: string
  kind: string
  raw: AdminTxFields
  effective: AdminTxFields
  hidden: boolean
  override: AdminTxOverride | null
}

export type ListAdminTxResponse = {
  items: AdminTxListItem[]
  nextCursor: string | null
}

export type ListAdminTxQuery = {
  userId?: string
  accountId?: string
  from?: string
  to?: string
  cursor?: string | null
  limit?: number
}

export async function listAdminTransactions(
  q: ListAdminTxQuery,
): Promise<ListAdminTxResponse> {
  const params = new URLSearchParams()
  if (q.userId) params.set("userId", q.userId)
  if (q.accountId) params.set("accountId", q.accountId)
  if (q.from) params.set("from", q.from)
  if (q.to) params.set("to", q.to)
  if (q.cursor) params.set("cursor", q.cursor)
  if (q.limit) params.set("limit", String(q.limit))
  const qs = params.toString()
  return apiFetch<ListAdminTxResponse>(
    `/admin/transactions${qs ? `?${qs}` : ""}`,
  )
}

export async function getAdminTransaction(id: string): Promise<{
  raw: AdminTxFields & { id: string; accountId: string; kind: string }
  effective: AdminTxFields & { transactionId: string; hidden: boolean }
  override: AdminTxOverride | null
}> {
  return apiFetch(`/admin/transactions/${encodeURIComponent(id)}`)
}

export type PatchAdminTxBody = {
  amountCents?: string | number
  occurredAt?: string
  description?: string
  category?: string
  status?: "pending" | "posted" | "declined" | "reversed"
  reason: string
  forceAllowNegative?: boolean
}

export async function patchAdminTransaction(id: string, body: PatchAdminTxBody) {
  return apiFetch(`/admin/transactions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  })
}

export async function hideAdminTransaction(id: string, reason: string) {
  return apiFetch(`/admin/transactions/${encodeURIComponent(id)}/hide`, {
    method: "POST",
    body: { reason },
  })
}

export type CreateAdminTxBody = {
  accountId: string
  amountCents: string | number
  occurredAt: string
  description: string
  category: string
  status: "pending" | "posted" | "declined" | "reversed"
  kind?:
    | "card_purchase"
    | "ach_in"
    | "ach_out"
    | "p2p_in"
    | "p2p_out"
    | "fee"
    | "interest"
    | "deposit"
    | "refund"
    | "adjustment"
  reason: string
  forceAllowNegative?: boolean
}

export async function createAdminTransaction(body: CreateAdminTxBody) {
  return apiFetch(`/admin/transactions`, {
    method: "POST",
    body,
  })
}

export async function deleteAdminTransaction(id: string, reason: string) {
  return apiFetch<{ ok: true }>(
    `/admin/transactions/${encodeURIComponent(id)}`,
    { method: "DELETE", body: { reason } },
  )
}

export async function clearAdminOverride(id: string) {
  return apiFetch(
    `/admin/transactions/${encodeURIComponent(id)}/override`,
    { method: "DELETE" },
  )
}

export async function bulkShiftAdmin(req: {
  transactionIds: string[]
  shiftDays: number
  reason: string
}) {
  return apiFetch(`/admin/transactions/bulk-shift`, {
    method: "POST",
    body: req,
  })
}

/** Backend BigInt cents → JS Number dollars (safe up to ~9e15). */
export function centsToDollars(centsStr: string): number {
  return Number(BigInt(centsStr)) / 100
}

// ─── Legacy stubs kept for the mocks-shaped switch in transactions.ts ────
// The mocks-driven `TransactionEditSheet` + `BulkShiftBar` still import via
// the switch; in real mode they'll throw, which is fine because the new
// admin transactions page doesn't open them.

const NOT_IMPL =
  "admin/transactions: this entry point isn't used in real mode. Use patchAdminTransaction / clearAdminOverride / bulkShiftAdmin instead."

export async function patchTransaction(
  _id: string,
  _req: PatchTxRequest,
  _ctx: { txns: AdminTxRecord[]; overrides: Record<string, TxOverride> },
): Promise<PatchTxResponse> {
  throw new Error(NOT_IMPL)
}

export async function deleteOverride(_id?: string): Promise<{ ok: true }> {
  throw new Error(NOT_IMPL)
}

export async function bulkShift(
  _req: BulkShiftRequest,
): Promise<{ ok: true; count: number }> {
  throw new Error(NOT_IMPL)
}
