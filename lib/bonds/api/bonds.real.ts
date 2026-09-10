/**
 * Customer bonds endpoints.
 *   GET  /bonds                  → Bond[]
 *   POST /bonds/:id/withdraw     → { transferId, ... }  (PIN-gated, held for review)
 */
import { apiFetch } from "@/lib/api/client"
import type { DisplayCurrency } from "@/lib/currency"

export type Bond = {
  id: string
  label: string
  principalCents: string
  /** Admin-set display currency. Shown as-is (no FX conversion). */
  currency: DisplayCurrency
  createdAt: string
  maturityAt: string
  lockedByAdmin: boolean
  waivePeriod: boolean
  matured: boolean
  withdrawable: boolean
  daysRemaining: number
  /** Total term length (issue → maturity) in days. */
  termDays: number
  /** Days of the term elapsed so far (clamped to [0, termDays]). */
  daysElapsed: number
  status: "active" | "withdrawn"
  /** Admin-set fixed rate, as a percentage (5.25 = 5.25%). */
  ratePct: number
  /** Principal at issue, in cents. */
  openingPrincipalCents: string
  /** Net admin-recorded earnings (profit minus losses), in cents. Signed. */
  earningsCents: string
}

export type BondActivityEntry = {
  id: string
  kind: "opening" | "profit" | "loss" | "deposit" | "withdrawal"
  /** Signed cents. */
  amountCents: string
  description: string
  occurredAt: string
  status: "posted" | "pending" | "declined" | "reversed"
}

/** Newest-first history for one bond: profit/loss, withdrawals, opening. */
export function getBondActivity(bondId: string): Promise<BondActivityEntry[]> {
  return apiFetch<BondActivityEntry[]>(`/bonds/${encodeURIComponent(bondId)}/activity`)
}

export type BondWithdrawPayload =
  | { destination: "internal"; toAccountId: string }
  | { destination: "external"; linkedAccountId: string }
  | {
      destination: "crypto"
      walletAddress: string
      asset: string
      network: string
    }

export function listBonds(): Promise<Bond[]> {
  return apiFetch<Bond[]>("/bonds")
}

/** Redeem a matured bond in full. Requires the `transfer:authorize` elevation
 *  token (from the PIN/biometric step). Backend holds it for admin review. */
export function withdrawBond(
  bondId: string,
  payload: BondWithdrawPayload,
  elevationToken: string,
): Promise<{ transferId: string; status: string }> {
  return apiFetch(`/bonds/${encodeURIComponent(bondId)}/withdraw`, {
    method: "POST",
    body: payload,
    headers: {
      "idempotency-key":
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      "x-elevation": elevationToken,
    },
  })
}
