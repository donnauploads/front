/**
 * Real adapters for the admin operations dashboard:
 *
 *   GET /admin/queue-counts
 *   GET /admin/kyc/queue
 *   GET /admin/transfers/review-queue
 *
 * Used by the dashboard cards, recent submissions list, and the live
 * sidebar badges. Subscribers to `admin.queue.changed` on the realtime
 * gateway re-poll counts whenever a relevant write happens.
 */

import { apiFetch } from "@/lib/api/client"

export type QueueCounts = {
  kycPending: number
  kycApproved: number
  transferReviewPending: number
  totalUsers: number
  activeSessions: number
  supportUnreadThreads: number
  mailUnreadThreads: number
}

export type KycQueueItem = {
  id: string
  userId: string
  status: "pending" | "in_review" | "approved" | "rejected"
  submittedAt: string
  reviewedAt: string | null
  user: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    phoneE164: string | null
  }
}

export type TransferReviewItem = {
  id: string
  kind: string
  status: string
  amountCents: string
  feeCents: string
  initiatedAt: string
  sender: { id: string; name: string; email: string | null; novaTag: string | null } | null
  recipient: { id: string; name: string; email: string | null; novaTag: string | null } | null
  fromAccount: { id: string; type: string; label: string; mask: string } | null
  toAccount: { id: string; type: string; label: string; mask: string } | null
}

export function getQueueCounts(): Promise<QueueCounts> {
  return apiFetch<QueueCounts>("/admin/queue-counts")
}

export function listKycQueue(opts?: {
  limit?: number
  statuses?: Array<KycQueueItem["status"]>
  from?: string
  to?: string
}): Promise<KycQueueItem[]> {
  const params = new URLSearchParams()
  if (opts?.limit != null) params.set("limit", String(opts.limit))
  if (opts?.statuses && opts.statuses.length)
    params.set("statuses", opts.statuses.join(","))
  if (opts?.from) params.set("from", opts.from)
  if (opts?.to) params.set("to", opts.to)
  const qs = params.toString()
  return apiFetch<KycQueueItem[]>(`/admin/kyc/queue${qs ? `?${qs}` : ""}`)
}

export function listTransferReviewQueue(
  limit?: number,
): Promise<{ items: TransferReviewItem[] }> {
  const qs = limit ? `?limit=${limit}` : ""
  return apiFetch<{ items: TransferReviewItem[] }>(
    `/admin/transfers/review-queue${qs}`,
  )
}

export type AdminSession = {
  id: string
  userId: string
  createdAt: string
  expiresAt: string
  user: { id: string; email: string; name: string; role: string }
  device: {
    id: string
    name: string
    os: string
    browser: string
    ip: string
    location: Record<string, unknown> | null
    lastSeenAt: string
    trusted: boolean
  }
}

export function listAdminSessions(): Promise<AdminSession[]> {
  return apiFetch<AdminSession[]>("/admin/sessions")
}

export function revokeAdminSession(
  sessionId: string,
): Promise<{ id: string; alreadyRevoked: boolean }> {
  return apiFetch<{ id: string; alreadyRevoked: boolean }>(
    `/admin/sessions/${sessionId}/revoke`,
    { method: "POST" },
  )
}

export function decideTransfer(
  transferId: string,
  decision: "approved" | "rejected",
  reason?: string,
): Promise<{ id: string; decision: "approved" | "rejected" }> {
  return apiFetch<{ id: string; decision: "approved" | "rejected" }>(
    `/admin/transfers/${transferId}/decision`,
    { method: "POST", body: { decision, ...(reason ? { reason } : {}) } },
  )
}
