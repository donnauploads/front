/**
 * Admin Mail Desk API adapters.
 *
 *   GET  /admin/mail/desks
 *   GET  /admin/mail/threads          ?desk&status&q
 *   GET  /admin/mail/threads/:id/messages
 *   POST /admin/mail/send
 *   POST /admin/mail/threads/:id/reply
 *   POST /admin/mail/threads/:id/close | /reopen
 *   POST /admin/mail/attachments       (multipart; stages a file)
 *   GET  /admin/mail/attachments/:id   (download)
 *
 * Backend: backend/apps/api/src/modules/mail/mail.controller.ts
 */

import { apiFetch } from "@/lib/api/client"

export type MailDesk = "customer_care" | "administrator" | "bank_manager"
export type MailThreadStatus = "open" | "closed"

export type MailDeskOption = {
  desk: MailDesk
  label: string
  fromEmail: string
  fromName: string
}

export type MailThread = {
  id: string
  userId: string | null
  toEmail: string
  toName: string | null
  desk: MailDesk
  subject: string
  status: MailThreadStatus
  unread: boolean
  lastMessageAt: string | null
  createdAt: string
  lastSnippet: string | null
  lastDirection: "outbound" | "inbound" | null
}

export type MailAttachmentMeta = {
  id: string
  filename: string
  contentType: string
  sizeBytes: number
}

export type MailMessage = {
  id: string
  threadId: string
  direction: "outbound" | "inbound"
  desk: MailDesk
  fromEmail: string
  fromName: string | null
  toEmail: string
  subject: string
  bodyHtml: string
  bodyText: string
  createdAt: string
  attachments: MailAttachmentMeta[]
}

/** Attachment staged via the upload endpoint, echoed back on send/reply. */
export type StagedAttachment = {
  storageKey: string
  filename: string
  contentType: string
  sizeBytes: number
}

export function listMailDesks(): Promise<MailDeskOption[]> {
  return apiFetch<MailDeskOption[]>("/admin/mail/desks")
}

export function listMailThreads(args?: {
  desk?: MailDesk
  status?: MailThreadStatus
  q?: string
}): Promise<MailThread[]> {
  const p = new URLSearchParams()
  if (args?.desk) p.set("desk", args.desk)
  if (args?.status) p.set("status", args.status)
  if (args?.q) p.set("q", args.q)
  const qs = p.toString()
  return apiFetch<MailThread[]>(`/admin/mail/threads${qs ? `?${qs}` : ""}`)
}

export function getMailThread(
  threadId: string,
): Promise<{ thread: MailThread; messages: MailMessage[] }> {
  return apiFetch(`/admin/mail/threads/${encodeURIComponent(threadId)}/messages`)
}

export function sendMail(body: {
  desk: MailDesk
  toUserId?: string
  toEmail: string
  toName?: string
  subject: string
  greeting?: string
  bodyHtml: string
  signature?: string
  attachments?: StagedAttachment[]
}): Promise<{ thread: MailThread; message: MailMessage }> {
  return apiFetch("/admin/mail/send", { method: "POST", body })
}

export function replyMail(
  threadId: string,
  body: { bodyHtml: string; signature?: string; attachments?: StagedAttachment[] },
): Promise<MailMessage> {
  return apiFetch(
    `/admin/mail/threads/${encodeURIComponent(threadId)}/reply`,
    { method: "POST", body },
  )
}

export function closeMailThread(threadId: string): Promise<{ id: string; status: MailThreadStatus }> {
  return apiFetch(`/admin/mail/threads/${encodeURIComponent(threadId)}/close`, { method: "POST" })
}

export function reopenMailThread(threadId: string): Promise<{ id: string; status: MailThreadStatus }> {
  return apiFetch(`/admin/mail/threads/${encodeURIComponent(threadId)}/reopen`, { method: "POST" })
}

/** Stage an attachment; returns metadata to include on the send/reply call. */
export function uploadMailAttachment(file: File): Promise<StagedAttachment> {
  const fd = new FormData()
  fd.append("file", file)
  return apiFetch<StagedAttachment>("/admin/mail/attachments", {
    method: "POST",
    body: fd,
  })
}

/** Absolute URL for downloading a persisted (e.g. inbound) attachment. */
export function mailAttachmentUrl(id: string): string {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? ""
  return `${base}/admin/mail/attachments/${encodeURIComponent(id)}`
}
