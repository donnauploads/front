/**
 * Customer profile preferences — persisted server-side so they follow the
 * account across devices.
 *
 *   GET /me/preferences           → UserPreferenceDto
 *   PUT /me/preferences { …patch } → UserPreferenceDto
 *
 * Backend lives at backend/apps/api/src/modules/profile/profile.controller.ts.
 */

import { apiFetch } from "@/lib/api/client"

export type ThemePref = "system" | "light" | "dark"

export type UserPreferenceDto = {
  userId: string
  theme: ThemePref
  doNotSell: boolean
  marketingData: boolean
  analytics: boolean
  shareContacts: boolean
}

export function getMyPreferences(): Promise<UserPreferenceDto> {
  return apiFetch<UserPreferenceDto>("/me/preferences")
}

export type UpdatePreferencesBody = Partial<
  Pick<
    UserPreferenceDto,
    "theme" | "doNotSell" | "marketingData" | "analytics" | "shareContacts"
  >
>

export function updateMyPreferences(
  patch: UpdatePreferencesBody,
): Promise<UserPreferenceDto> {
  return apiFetch<UserPreferenceDto>("/me/preferences", {
    method: "PUT",
    body: patch,
  })
}
