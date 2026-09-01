/**
 * Real adapter for the customer accounts list.
 *
 *   GET /accounts → Account[]
 *
 * Backend lives at apps/api/src/modules/accounts/accounts.controller.ts.
 * Returns balance as a signed integer string of cents and APY as basis
 * points. We normalize to the frontend's existing `Account` shape (dollars
 * as Number, APY as percent decimal — e.g. 0.5 for 0.5%).
 */

import { apiFetch } from "@/lib/api/client"
import type { Account } from "@/lib/store"

type BackendAccountDto = {
  id: string
  type: "checking" | "savings"
  label: string
  balanceCents: string
  apyBps: number | null
  status: "active" | "frozen" | "closed"
  mockRoutingNumber: string
  mockAccountNumberMasked: string
  openedAt: string
}

function toFrontendAccount(b: BackendAccountDto): Account {
  return {
    id: b.id,
    type: b.type,
    label: b.label,
    balance: Number(BigInt(b.balanceCents)) / 100,
    currency: "USD",
    ...(b.apyBps != null ? { apy: b.apyBps / 100 } : {}),
  }
}

export async function listAccounts(): Promise<Account[]> {
  const rows = await apiFetch<BackendAccountDto[]>("/accounts")
  return rows.map(toFrontendAccount)
}
