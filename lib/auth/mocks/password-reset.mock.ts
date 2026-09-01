/**
 * Mock layer for the password-reset landing page (`/recover/password`).
 *
 * Maps to backend endpoints from planning doc 2.1.22 — plus a small
 * convenience `validate` endpoint we'll add on the server so the landing
 * page can sanity-check the token before showing the form.
 *
 *   POST /auth/recover/password/validate  → validateToken()
 *   POST /auth/recover/password/reset     → resetPassword()
 *
 * Toggle the mock off later with NEXT_PUBLIC_USE_MOCKS=false.
 */

const USE_MOCKS =
  (process.env.NEXT_PUBLIC_USE_MOCKS ?? "true").toLowerCase() !== "false"

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export type ValidateTokenResult =
  | { valid: true }
  | { valid: false; reason: "missing" | "expired" | "invalid" }

export async function validateToken(
  token: string | null | undefined,
): Promise<ValidateTokenResult> {
  if (!USE_MOCKS) {
    throw new Error("validateToken: real backend not implemented yet.")
  }
  await wait(300)
  if (!token) return { valid: false, reason: "missing" }
  // Useful test sentinel — query `?token=expired` to exercise the error UI.
  if (token === "expired") return { valid: false, reason: "expired" }
  if (token === "invalid") return { valid: false, reason: "invalid" }
  return { valid: true }
}

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; code: "TOKEN_USED" | "TOKEN_EXPIRED" | "WEAK_PASSWORD" }

export async function resetPassword(args: {
  token: string
  newPassword: string
}): Promise<ResetPasswordResult> {
  if (!USE_MOCKS) {
    throw new Error("resetPassword: real backend not implemented yet.")
  }
  await wait(600)
  // Test sentinels — useful for exercising the error states from the URL bar.
  if (args.newPassword === "failtest") {
    return { ok: false, code: "TOKEN_USED" }
  }
  if (args.token === "expired") {
    return { ok: false, code: "TOKEN_EXPIRED" }
  }
  return { ok: true }
}
