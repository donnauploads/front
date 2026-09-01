/**
 * Card endpoints.
 *
 *   GET    /cards                    → CardDto[]
 *   GET    /cards/:id                → CardDto
 *   POST   /cards/:id/freeze         → CardDto
 *   POST   /cards/:id/unfreeze       → CardDto
 *   POST   /cards/:id/reveal         → RevealDto (requires x-elevation: card:reveal)
 *   POST   /cards/:id/replace        → CardDto (newly issued)
 *   POST   /cards/:id/activate       → CardDto
 *
 * Backend lives at backend/apps/api/src/modules/cards/cards.controller.ts.
 */

import { apiFetch } from "@/lib/api/client"

export type CardDto = {
  id: string
  accountId: string
  type: "virtual" | "physical"
  last4: string
  expMonth: number
  expYear: number
  status:
    | "active"
    | "frozen"
    | "replaced"
    | "shipped"
    | "delivered"
    | "lost"
    | "stolen"
    | "expired"
    | "canceled"
  spendingLimitCents: string | null
  issuedAt: string
  activatedAt: string | null
  frozenAt: string | null
}

export type RevealDto = {
  pan: string
  cvv: string
  expMonth: number
  expYear: number
  ttlSeconds: number
}

export function listCards(): Promise<CardDto[]> {
  return apiFetch<CardDto[]>("/cards")
}

export function getCard(id: string): Promise<CardDto> {
  return apiFetch<CardDto>(`/cards/${id}`)
}

export function freezeCard(id: string): Promise<CardDto> {
  return apiFetch<CardDto>(`/cards/${id}/freeze`, { method: "POST" })
}

export function unfreezeCard(id: string): Promise<CardDto> {
  return apiFetch<CardDto>(`/cards/${id}/unfreeze`, { method: "POST" })
}

export function revealCard(id: string, elevationToken: string): Promise<RevealDto> {
  return apiFetch<RevealDto>(`/cards/${id}/reveal`, {
    method: "POST",
    headers: { "x-elevation": elevationToken },
  })
}

export function replaceVirtualCard(id: string): Promise<CardDto> {
  return apiFetch<CardDto>(`/cards/${id}/replace`, { method: "POST" })
}

export function activateCard(id: string): Promise<CardDto> {
  return apiFetch<CardDto>(`/cards/${id}/activate`, { method: "POST" })
}

export function orderPhysicalCard(input: {
  accountId: string
  shipAddress: Record<string, unknown>
}): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/cards/orders`, {
    method: "POST",
    body: input,
  })
}
