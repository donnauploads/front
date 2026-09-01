/**
 * Real adapters for personal profile updates.
 *
 *   GET   /me        → MeDto
 *   PATCH /me        → MeDto    (fields: firstName, lastName, novaTag, bio, phoneE164)
 *
 * Avatar upload + preferences live in separate files. Email is read-only
 * from the FE; changing it requires support (production policy).
 */

import { apiFetch } from "@/lib/api/client"

export type MeDto = {
  id: string
  email: string
  phoneE164: string | null
  novaTag: string | null
  firstName: string | null
  lastName: string | null
  dob: string | null
  avatarUrl: string | null
  bio: string | null
  role: "customer" | "admin" | "superadmin"
  status: string
}

export type UpdateMeInput = {
  firstName?: string
  lastName?: string
  /** Must start with @ and match /^@[a-z0-9_]{2,30}$/i */
  novaTag?: string
  bio?: string
  /** E.164 only: `+` then 6–15 digits. */
  phoneE164?: string
}

export function fetchMe(): Promise<MeDto> {
  return apiFetch<MeDto>("/me")
}

/**
 * Backend requires an `x-elevation` token scoped to `profile:edit` for
 * mutations. The caller obtains one by verifying the user's transaction
 * PIN first.
 */
export function updateMe(
  input: UpdateMeInput,
  elevationToken: string,
): Promise<MeDto> {
  return apiFetch<MeDto>("/me", {
    method: "PATCH",
    body: input,
    headers: { "x-elevation": elevationToken },
  })
}
