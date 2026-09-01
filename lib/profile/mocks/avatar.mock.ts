/**
 * Mock layer for the avatar upload endpoints from the integration plan
 * (Stage 12 / planning doc 2.13.3 — `POST /me/profile/avatar` + the
 * implicit `DELETE` for removal).
 *
 *   POST   /me/profile/avatar  (multipart)  → uploadAvatar(file)
 *   DELETE /me/profile/avatar              → removeAvatar()
 *
 * Toggle the mock off later with NEXT_PUBLIC_USE_MOCKS=false.
 */

const USE_MOCKS =
  (process.env.NEXT_PUBLIC_USE_MOCKS ?? "true").toLowerCase() !== "false"

export const ACCEPTED_AVATAR_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5 MB

export type UploadAvatarResult =
  | { ok: true; avatarUrl: string }
  | { ok: false; code: "TOO_LARGE" | "BAD_TYPE" | "UPLOAD_FAILED" }

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

/**
 * Accepts an already-cropped image as a Blob/File. We round-trip it as a
 * `data:` URL so the mock response is identical in shape to what the real
 * backend will return (an S3-signed URL there, a data URL here — both
 * usable as the `src` of an `<img>`).
 */
export async function uploadAvatar(
  file: Blob,
): Promise<UploadAvatarResult> {
  if (!USE_MOCKS) {
    throw new Error("uploadAvatar: real backend not implemented yet.")
  }
  // Defensive guards — caller should also pre-validate to surface UX errors
  // before we even hit this code path.
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
  await wait(450)
  const dataUrl = await blobToDataUrl(file)
  return { ok: true, avatarUrl: dataUrl }
}

export async function removeAvatar(): Promise<{ ok: true }> {
  if (!USE_MOCKS) {
    throw new Error("removeAvatar: real backend not implemented yet.")
  }
  await wait(250)
  return { ok: true }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("READ_FAILED"))
    reader.readAsDataURL(blob)
  })
}
