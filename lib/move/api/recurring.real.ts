/**
 * Recurring-transfer adapter. Wraps the NestJS endpoints under
 * `/recurring-transfers` and maps the API DTO (cents/ISO/UUIDs) into a
 * shape the UI can use directly.
 *
 *   GET    /recurring-transfers          → list mine
 *   POST   /recurring-transfers          → create
 *   PATCH  /recurring-transfers/:id      → update (amount, freq/dayOf, active)
 *   DELETE /recurring-transfers/:id      → hard-delete
 */

import { apiFetch } from "@/lib/api/client"

export type RecurringFrequency = "weekly" | "biweekly" | "monthly"

/** Wire shape from the backend `toDto` mapper. amountCents is a string
 *  because it's a BigInt server-side. */
export type RecurringTransferDto = {
  id: string
  fromAccountId: string
  toAccountId: string
  amountCents: string
  frequency: RecurringFrequency
  dayOf: number
  active: boolean
  nextRunAt: string
  lastRunAt: string | null
}

export function listRecurringTransfers(): Promise<RecurringTransferDto[]> {
  return apiFetch("/recurring-transfers")
}

export function createRecurringTransfer(input: {
  fromAccountId: string
  toAccountId: string
  amountCents: string
  frequency: RecurringFrequency
  dayOf: number
  /** From AuthorizeTransfer — sent as `x-elevation` to satisfy the
   *  controller's `@RequiresElevation('transfer:authorize')`. */
  elevationToken: string
}): Promise<RecurringTransferDto> {
  const { elevationToken, ...body } = input
  return apiFetch("/recurring-transfers", {
    method: "POST",
    body,
    headers: { "x-elevation": elevationToken },
  })
}

export function updateRecurringTransfer(
  id: string,
  patch: Partial<{
    amountCents: string
    frequency: RecurringFrequency
    dayOf: number
    active: boolean
  }>,
): Promise<RecurringTransferDto> {
  return apiFetch(`/recurring-transfers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  })
}

export function deleteRecurringTransfer(id: string): Promise<void> {
  return apiFetch(`/recurring-transfers/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}
