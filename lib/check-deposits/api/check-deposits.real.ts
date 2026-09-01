/**
 * POST /check-deposits — multipart upload.
 *
 *   Fields:
 *     amountCents (string)        BigInt-safe stringified cents
 *     front       (image file)    JPEG/PNG/WebP, ≤ 8 MB
 *     back        (image file)    JPEG/PNG/WebP, ≤ 8 MB
 *
 * Returns 202 (Accepted) with a deposit id; admin gets an email with both
 * sides attached and processes the deposit out-of-band.
 */

import { apiFetch } from "@/lib/api/client"

export type CheckDepositResult = {
  id: string
  amountCents: string
  submittedAt: string
  status: "pending_review"
}

export function submitCheckDeposit(args: {
  /** USD ledger amount (base currency). */
  amountDollars: number
  /** The amount the user typed, in their DISPLAY currency's minor units. */
  displayAmountCents: number
  /** The user's display currency code (e.g. "USD", "EUR"). */
  displayCurrency: string
  front: Blob
  back: Blob
}): Promise<CheckDepositResult> {
  const form = new FormData()
  form.append("amountCents", String(Math.round(args.amountDollars * 100)))
  form.append("displayAmountCents", String(Math.round(args.displayAmountCents)))
  form.append("displayCurrency", args.displayCurrency)
  form.append("front", args.front, "front.jpg")
  form.append("back", args.back, "back.jpg")
  // 60s — image uploads on phone networks can be slow.
  return apiFetch<CheckDepositResult>("/check-deposits", {
    method: "POST",
    body: form,
    timeout: 60_000,
  })
}
