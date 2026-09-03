/**
 * Client-side pre-checks for chat attachments. These are UX guard rails only —
 * the SERVER is the real gate (magic-byte validation, image re-encode, size
 * cap). Keep this in sync with the backend allowlist / SUPPORT_ATTACH_MAX_BYTES.
 */

export const ATTACH_MAX_BYTES = 10 * 1024 * 1024

export const ATTACH_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif," +
  "application/pdf,application/msword," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  ".png,.jpg,.jpeg,.webp,.gif,.pdf,.doc,.docx"

const TYPE_OK =
  /^image\/(png|jpe?g|webp|gif)$/i
const EXT_OK = /\.(png|jpe?g|webp|gif|pdf|docx?)$/i
const DOC_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])

/** Returns an error string, or null if the file looks acceptable. */
export function validateAttachment(f: File): string | null {
  if (f.size === 0) return "That file is empty."
  if (f.size > ATTACH_MAX_BYTES) return "File is larger than 10MB."
  const typeOk = TYPE_OK.test(f.type) || DOC_TYPES.has(f.type)
  const extOk = EXT_OK.test(f.name)
  if (!typeOk && !extOk) {
    return "Only images, PDF, or Word documents are allowed."
  }
  return null
}
