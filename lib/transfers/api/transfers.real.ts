/**
 * Customer-facing transfer endpoints. Used by the wire-transfer flow
 * (and any other "money-out" surface that wants to drive
 * /transfers directly rather than via /pay).
 *
 *   POST /transfers/quote     → fee + ETA estimate (no elevation needed)
 *   POST /transfers           → submit; needs x-elevation header
 *   GET  /transfers/:id       → poll status
 */

import { apiFetch } from "@/lib/api/client"

export type TransferKind =
  | "internal"
  | "ach_in"
  | "ach_out"
  | "wire_in"
  | "wire_out"
  | "p2p"

export type TransferDetail = {
  id: string
  kind: TransferKind
  status: "pending" | "posted" | "declined" | "reversed"
  amountCents: string
  feeCents: string
  fromAccountId: string
  toAccountId: string | null
  instant: boolean
  initiatedAt: string
  settledAt: string | null
  failureReason: string | null
}

export function getTransfer(transferId: string): Promise<TransferDetail> {
  return apiFetch<TransferDetail>(`/transfers/${transferId}`)
}

/** FX conversion snapshot returned by the backend for a cross-currency
 *  wire. `rate` is settlement units per 1 send unit (USD per 1 BHD);
 *  `source` is "live" (rate feed) or "peg" (fallback table). */
export type FxQuote = {
  sendCurrency: string
  sendAmountMinor: string
  settleCurrency: string
  settleCents: string
  rate: number
  asOf: string
  source: "live" | "peg"
}

export type QuoteResult = {
  valid: boolean
  feeCents: string
  etaText: string
  minAmountCents: string
  maxAmountCents: string
  reason?: string | null
  /** USD settlement amount (= amountCents for same-currency wires). */
  settleCents?: string
  /** Present only for cross-currency wires. */
  fx?: FxQuote | null
}

export type InitiateResult = {
  transferId: string
  status: string
  pendingTransactionId: string
  feeCents: string
  estimatedSettleMs: number
  fx?: FxQuote | null
}

export function quoteTransfer(input: {
  fromAccountId: string
  kind: TransferKind
  amountCents: string
  instant?: boolean
  /** Required when `kind === 'wire_out'` to get the correct fee. */
  wireScope?: "domestic" | "international"
  /** FX: send currency + amount in its minor units. When set the backend
   *  converts to a USD settlement and returns `fx` (unless it's USD). */
  sendCurrency?: string
  sendAmountMinor?: string
}): Promise<QuoteResult> {
  return apiFetch<QuoteResult>("/transfers/quote", {
    method: "POST",
    body: input,
  })
}

export type VerifyBeneficiaryResult = {
  valid: boolean
  beneficiaryName: string | null
}

/** Live check used by the wire form as the customer types the routing +
 *  account (or SWIFT + IBAN). Confirms the numbers belong to an approved
 *  beneficiary at the entered bank. Read-only — safe to call (debounced)
 *  on every keystroke. */
export function verifyBeneficiary(input: {
  type: "local" | "international"
  bankName?: string
  beneficiaryName?: string
  routingNumber?: string
  accountNumber?: string
  swiftBic?: string
  iban?: string
}): Promise<VerifyBeneficiaryResult> {
  return apiFetch<VerifyBeneficiaryResult>("/transfers/verify-beneficiary", {
    method: "POST",
    body: input,
  })
}

export type WireDetails = {
  type: "local" | "international"
  beneficiaryName: string
  bankName: string
  routingNumber?: string
  accountNumber?: string
  swiftBic?: string
  iban?: string
  country?: string
}

export function initiateTransfer(input: {
  fromAccountId: string
  /** Required for internal State Bank-to-State Bank transfers. The backend rejects
   *  other kinds if this is set to a different user's account. */
  toAccountId?: string
  kind: TransferKind
  amountCents: string
  instant?: boolean
  note?: string
  /** Free-form details we tuck into the Transfer row so the admin
   *  review queue can see the wire's beneficiary info. */
  externalRef?: string
  /** Required when kind=`wire_out`. Used by the backend to validate
   *  the beneficiary against the admin's approved list. */
  wireDetails?: WireDetails
  /** FX: send currency + amount in its minor units. When set, the backend
   *  converts to USD at submit time and settles that USD amount. */
  sendCurrency?: string
  sendAmountMinor?: string
  /** Short-lived PIN/biometric elevation token. Required — the backend's
   *  ElevationGuard rejects requests without it. */
  elevationToken: string
}): Promise<InitiateResult> {
  const idempotencyKey =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `wire-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return apiFetch<InitiateResult>("/transfers", {
    method: "POST",
    body: {
      fromAccountId: input.fromAccountId,
      kind: input.kind,
      amountCents: input.amountCents,
      ...(input.toAccountId ? { toAccountId: input.toAccountId } : {}),
      ...(input.instant != null ? { instant: input.instant } : {}),
      ...(input.note ? { note: input.note } : {}),
      ...(input.externalRef ? { externalRef: input.externalRef } : {}),
      ...(input.wireDetails ? { wireDetails: input.wireDetails } : {}),
      ...(input.sendCurrency ? { sendCurrency: input.sendCurrency } : {}),
      ...(input.sendAmountMinor != null
        ? { sendAmountMinor: input.sendAmountMinor }
        : {}),
    },
    headers: {
      "idempotency-key": idempotencyKey,
      "x-elevation": input.elevationToken,
    },
  })
}
