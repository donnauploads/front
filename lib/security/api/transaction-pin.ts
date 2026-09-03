/**
 * Transaction-PIN endpoints. Every money-movement call must be preceded
 * by a PIN verification — the verify response returns a short-lived
 * elevation token that the caller passes in the next request via the
 * `x-elevation` header.
 *
 *   GET  /me/security/transaction-pin         → { enabled }
 *   POST /me/security/transaction-pin         → 204 (set or change)
 *   POST /me/security/transaction-pin/verify  → { elevationToken, scope }
 */

import { apiFetch } from "@/lib/api/client"

export type PinStatus = { enabled: boolean }

export type ElevationScope =
  | "transfer:authorize"
  | "profile:edit"
  | "card:reveal"
  | "security:manage"

export type VerifyPinResult = {
  elevationToken: string
  scope: ElevationScope
}

export function getTransactionPinStatus(): Promise<PinStatus> {
  return apiFetch<PinStatus>("/me/security/transaction-pin")
}

export function setTransactionPin(args: {
  newPin: string
  currentPin?: string
  currentPassword?: string
}): Promise<void> {
  return apiFetch<void>("/me/security/transaction-pin", {
    method: "POST",
    body: {
      newPin: args.newPin,
      ...(args.currentPin ? { currentPin: args.currentPin } : {}),
      ...(args.currentPassword
        ? { currentPassword: args.currentPassword }
        : {}),
    },
  })
}

export function verifyTransactionPin(
  pin: string,
  scope: ElevationScope = "transfer:authorize",
): Promise<VerifyPinResult> {
  // Only send `scope` when it diverges from the backend's default —
  // keeps the call compatible with backends running the old DTO that
  // didn't yet accept the field.
  const body: Record<string, unknown> = { pin }
  if (scope !== "transfer:authorize") body.scope = scope
  return apiFetch<VerifyPinResult>("/me/security/transaction-pin/verify", {
    method: "POST",
    body,
  })
}
