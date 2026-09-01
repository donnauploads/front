/**
 * Real adapters for the notifications surface.
 *
 *   GET  /notifications              → NotificationDto[]
 *   GET  /notifications/unread-count → { count }
 *   POST /notifications/read         → { updated }   body: { ids }
 *   POST /notifications/read-all     → { updated }
 *
 * Backend rows are converted to the frontend's AppNotification shape so the
 * existing zustand mutators (prependNotification, markNotificationsRead) can
 * be reused. Timestamps stay ISO — the dropdown formats them at render time.
 */

import { apiFetch } from "@/lib/api/client"
import type { AppNotification } from "@/lib/store"

export type NotificationDto = {
  id: string
  category: "transaction" | "offer" | "security" | "account"
  title: string
  body: string
  ctaUrl: string | null
  readAt: string | null
  createdAt: string
}

function toFrontend(n: NotificationDto): AppNotification {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    ts: n.createdAt,
    unread: n.readAt === null,
    category: n.category,
  }
}

export async function listNotifications(): Promise<AppNotification[]> {
  const rows = await apiFetch<NotificationDto[]>("/notifications")
  return rows.map(toFrontend)
}

export async function markRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  await apiFetch<{ updated: number }>("/notifications/read", {
    method: "POST",
    body: { ids },
  })
}

export async function markAllRead(): Promise<void> {
  await apiFetch<{ updated: number }>("/notifications/read-all", {
    method: "POST",
  })
}

export async function clearAllNotifications(): Promise<void> {
  await apiFetch<{ deleted: number }>("/notifications", { method: "DELETE" })
}
