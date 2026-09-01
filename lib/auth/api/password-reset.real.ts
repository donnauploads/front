/**
 * Real adapter for password-reset endpoints (planning doc 2.1.22 + the
 * convenience `validate` route the landing page needs). Backend not built
 * yet — stubs throw so WIRE-3 acceptance is observable.
 */

import type {
  ResetPasswordResult,
  ValidateTokenResult,
} from "../mocks/password-reset.mock"

const NOT_IMPL = "password-reset: real backend not implemented yet (WIRE-4)."

export async function validateToken(
  _token: string | null | undefined,
): Promise<ValidateTokenResult> {
  throw new Error(NOT_IMPL)
}

export async function resetPassword(_args: {
  token: string
  newPassword: string
}): Promise<ResetPasswordResult> {
  throw new Error(NOT_IMPL)
}
