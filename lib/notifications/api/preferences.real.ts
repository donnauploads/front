/**
 * GET  /notifications/preferences → NotificationPreferences
 * PUT  /notifications/preferences → NotificationPreferences
 *
 * The backend persists 5 booleans + a "large transaction" threshold.
 * BigInts arrive as strings; we keep them as strings here so the FE
 * doesn't have to deal with BigInt precision quirks.
 */

import { apiFetch } from "@/lib/api/client"

export type NotificationPreferences = {
  txAll: boolean
  txLargeOnly: boolean
  /** Stringified BigInt cents. */
  txLargeThresholdCents: string
  securityAlerts: boolean
  marketingEmail: boolean
  marketingPush: boolean
}

export function fetchPreferences(): Promise<NotificationPreferences> {
  return apiFetch<NotificationPreferences>("/notifications/preferences")
}

export type UpdatePreferencesInput = Partial<NotificationPreferences>

export function updatePreferences(
  patch: UpdatePreferencesInput,
): Promise<NotificationPreferences> {
  return apiFetch<NotificationPreferences>("/notifications/preferences", {
    method: "PUT",
    body: patch,
  })
}
