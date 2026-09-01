/**
 * Mock layer for the customer transaction feed. Wraps the existing
 * fixture array. Pagination is faked but the response shape matches the
 * real backend (items + nextCursor).
 */

import type { Transaction } from "@/lib/store"
import { transactions as allTransactions } from "@/lib/mock-data"

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export type ListTransactionsArgs = {
  accountId?: string
  limit?: number
  cursor?: string | null
  q?: string
}

export type TransactionListPage = {
  items: Transaction[]
  nextCursor: string | null
}

const DEFAULT_LIMIT = 25

export async function listTransactions(
  args: ListTransactionsArgs = {},
): Promise<TransactionListPage> {
  await wait(180)
  const limit = Math.min(args.limit ?? DEFAULT_LIMIT, 100)
  const filtered = allTransactions
    .filter((t) => (args.accountId ? t.accountId === args.accountId : true))
    .filter((t) =>
      args.q
        ? [t.description, t.merchant, t.category]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(args.q.toLowerCase())
        : true,
    )
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
  const start = args.cursor ? Number(args.cursor) : 0
  const slice = filtered.slice(start, start + limit)
  const nextCursor =
    start + limit < filtered.length ? String(start + limit) : null
  return { items: slice, nextCursor }
}
