/**
 * Real adapter for the customer transaction feed.
 *
 *   GET /transactions?accountId=&limit=&cursor=&q=&categories=&status=&from=&to=
 *   GET /transactions/:id
 *
 * Backend lives at apps/api/src/modules/transactions/transactions.controller.ts.
 * Returns `{ items, nextCursor }`. We normalize each row to the existing
 * frontend `Transaction` shape so the spending feed renders without UI
 * churn — backend statuses 'declined'/'reversed' fold into 'posted' for
 * display, mirroring how the override layer treats them.
 */

import { apiFetch } from "@/lib/api/client"
import type { Transaction } from "@/lib/store"
import type {
  ListTransactionsArgs,
  TransactionListPage,
} from "../mocks/transactions.mock"

type BackendTransactionDto = {
  id: string
  accountId: string
  kind: string
  status: "pending" | "posted" | "declined" | "reversed"
  amountCents: string
  currency: string
  description: string
  category: string
  note: string | null
  occurredAt: string
  postedAt: string | null
  merchant: { id: string; name: string } | null
  counterpartyName: string | null
}

type BackendListResponse = {
  items: BackendTransactionDto[]
  nextCursor: string | null
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)
}

function toFrontendTransaction(t: BackendTransactionDto): Transaction {
  return {
    id: t.id,
    accountId: t.accountId,
    amount: Number(BigInt(t.amountCents)) / 100,
    currency: "USD",
    description: t.description,
    category: capitalize(t.category),
    merchant: t.merchant?.name,
    counterpartyName: t.counterpartyName ?? undefined,
    // Backend has 4 statuses; the customer-facing feed only models 2. We
    // surface 'pending' verbatim and treat declined/reversed/posted as
    // posted — same logic the admin override layer uses.
    status: t.status === "pending" ? "pending" : "posted",
    date: t.occurredAt,
  }
}

export async function listTransactions(
  args: ListTransactionsArgs = {},
): Promise<TransactionListPage> {
  const params = new URLSearchParams()
  if (args.accountId) params.set("accountId", args.accountId)
  if (args.limit != null) params.set("limit", String(args.limit))
  if (args.cursor) params.set("cursor", args.cursor)
  if (args.q) params.set("q", args.q)
  const qs = params.toString()
  const path = qs ? `/transactions?${qs}` : "/transactions"
  const res = await apiFetch<BackendListResponse>(path)
  return {
    items: res.items.map(toFrontendTransaction),
    nextCursor: res.nextCursor,
  }
}
