/**
 * Real adapter for admin session listing + revocation (planning doc
 * 2.17.3). Backend not implemented — stubbed.
 */

import type { AdminSession } from "@/lib/store"

const NOT_IMPL = "admin/sessions: real backend not implemented yet (WIRE-4)."

export async function listSessions(_userId?: string): Promise<AdminSession[]> {
  throw new Error(NOT_IMPL)
}

export async function revokeSession(_id: string): Promise<void> {
  throw new Error(NOT_IMPL)
}

export async function revokeAllForUser(_userId: string): Promise<void> {
  throw new Error(NOT_IMPL)
}
