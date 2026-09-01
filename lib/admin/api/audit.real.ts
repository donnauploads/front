/**
 * Admin audit trail — GET /admin/audit
 *
 * Backend: backend/apps/api/src/modules/admin-audit/admin-audit.controller.ts
 */

import { apiFetch } from "@/lib/api/client"

export type AuditLogEntry = {
  id: string
  action: string
  targetType: string
  targetId: string
  metadata: Record<string, unknown>
  createdAt: string
  actor: { id: string; name: string; email: string }
}

export function listAuditLogs(args?: {
  actorUserId?: string
  targetType?: string
  targetId?: string
  limit?: number
}): Promise<AuditLogEntry[]> {
  const p = new URLSearchParams()
  if (args?.actorUserId) p.set("actorUserId", args.actorUserId)
  if (args?.targetType) p.set("targetType", args.targetType)
  if (args?.targetId) p.set("targetId", args.targetId)
  if (args?.limit) p.set("limit", String(args.limit))
  const qs = p.toString()
  return apiFetch<AuditLogEntry[]>(`/admin/audit${qs ? `?${qs}` : ""}`)
}
