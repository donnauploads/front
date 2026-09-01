/**
 * Real adapter for the avatar endpoints.
 *
 *   POST /me/avatar (multipart) → { avatarUrl }
 *   DELETE /me/avatar           → 204
 *
 * Backend: backend/apps/api/src/modules/profile/profile.controller.ts.
 * The upload route caps payloads at 5 MB via multer. Anything bigger
 * surfaces a 413 from the backend; we map common failure modes to the
 * existing UploadAvatarResult union so the editor UI can render specific
 * messages.
 */

import { apiFetch } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import {
  ACCEPTED_AVATAR_TYPES,
  MAX_AVATAR_BYTES,
  type UploadAvatarResult,
} from "../mocks/avatar.mock"

export async function uploadAvatar(
  file: Blob,
): Promise<UploadAvatarResult> {
  // Pre-flight client-side so the UI shows specific reasons before we
  // even round-trip.
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, code: "TOO_LARGE" }
  }
  if (
    file.type &&
    !ACCEPTED_AVATAR_TYPES.includes(
      file.type as (typeof ACCEPTED_AVATAR_TYPES)[number],
    )
  ) {
    return { ok: false, code: "BAD_TYPE" }
  }

  const form = new FormData()
  // Multer's @UploadedFile() picks up the field named "file".
  // Provide a filename so the server-side mime sniff has something to
  // chew on — Blob doesn't carry one.
  const ext = (file.type.split("/")[1] || "png").toLowerCase()
  form.append("file", file, `avatar.${ext}`)

  try {
    const res = await apiFetch<{ avatarUrl: string }>("/me/avatar", {
      method: "POST",
      body: form,
      // Avatars are small (≤5 MB); 30s is plenty even on flaky links.
      timeout: 30_000,
    })
    return { ok: true, avatarUrl: res.avatarUrl }
  } catch (err) {
    if (err instanceof ApiError) {
      // Backend's multer fires 413 on oversize, Nest's ValidationPipe
      // fires 400 on bad payloads. Anything else is a generic failure.
      if (err.status === 413) return { ok: false, code: "TOO_LARGE" }
      if (err.status === 400) return { ok: false, code: "BAD_TYPE" }
    }
    return { ok: false, code: "UPLOAD_FAILED" }
  }
}

export async function removeAvatar(): Promise<{ ok: true }> {
  await apiFetch<void>("/me/avatar", { method: "DELETE" })
  return { ok: true }
}
