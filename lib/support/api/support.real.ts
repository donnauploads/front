/**
 * Customer + admin support-chat endpoints. Messages stream live via the
 * existing realtime gateway (event `support.message.created`); these
 * HTTP calls handle the initial load + send / reply.
 */

import { apiFetch } from "@/lib/api/client"

export type SupportSenderRole = "customer" | "admin"

export type SupportMessage = {
  id: string
  threadId: string
  senderId: string
  senderRole: SupportSenderRole
  body: string
  createdAt: string
  /** ISO timestamp the message was read by the recipient; null otherwise.
   *  Populated only for admin-authored messages — used by the admin UI to
   *  render "Seen" under their last reply. */
  readAt?: string | null
}

export type SupportThread = {
  id: string
  status: "open" | "closed"
  createdAt: string
}

export type AdminThreadGeo = {
  city: string | null
  region: string | null
  country: string | null
  /** ISO 3166-1 alpha-2 (e.g. "US"); used to render flag emoji. */
  countryCode: string | null
}

export type AdminThread = {
  id: string
  userId: string
  customerName: string | null
  customerEmail: string
  lastBody: string | null
  status: "open" | "closed"
  unread: boolean
  lastMessageAt: string | null
  createdAt: string
  /** The customer's most-recent active device's last-seen IP. */
  lastIp: string | null
  /** Best-effort geo derived from that device's stored location. May be
   *  null if no device data exists or the GeoIP DB was unavailable. */
  lastGeo: AdminThreadGeo | null
}

// ─── Customer ────────────────────────────────────────────────────────

export function openMyThread(): Promise<SupportThread> {
  return apiFetch<SupportThread>("/support/thread")
}

export function listMyMessages(threadId: string): Promise<SupportMessage[]> {
  return apiFetch<SupportMessage[]>(
    `/support/thread/${encodeURIComponent(threadId)}/messages`,
  )
}

/**
 * Customer-side: stamp every admin reply in this thread as read. Fires
 * a `support.messages.read` WS event to admins so they see "Seen" appear
 * under their last message.
 */
export function markMyThreadRead(
  threadId: string,
): Promise<{ markedIds: string[] }> {
  return apiFetch<{ markedIds: string[] }>(
    `/support/thread/${encodeURIComponent(threadId)}/read`,
    { method: "POST" },
  )
}

export function sendMyMessage(
  threadId: string,
  body: string,
): Promise<SupportMessage> {
  return apiFetch<SupportMessage>(
    `/support/thread/${encodeURIComponent(threadId)}/messages`,
    { method: "POST", body: { body } },
  )
}

// ─── Admin ───────────────────────────────────────────────────────────

export function listAdminThreads(): Promise<AdminThread[]> {
  return apiFetch<AdminThread[]>("/admin/support/threads")
}

export function listAdminMessages(threadId: string): Promise<SupportMessage[]> {
  return apiFetch<SupportMessage[]>(
    `/admin/support/threads/${encodeURIComponent(threadId)}/messages`,
  )
}

export function adminReply(
  threadId: string,
  body: string,
): Promise<SupportMessage> {
  return apiFetch<SupportMessage>(
    `/admin/support/threads/${encodeURIComponent(threadId)}/reply`,
    { method: "POST", body: { body } },
  )
}

export function adminCloseThread(threadId: string): Promise<void> {
  return apiFetch<void>(
    `/admin/support/threads/${encodeURIComponent(threadId)}/close`,
    { method: "POST" },
  )
}

export function adminReopenThread(threadId: string): Promise<void> {
  return apiFetch<void>(
    `/admin/support/threads/${encodeURIComponent(threadId)}/reopen`,
    { method: "POST" },
  )
}
