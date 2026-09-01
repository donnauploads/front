import type { Transaction, TxOverride } from "@/lib/store"

/**
 * Project admin overrides onto the customer-facing transaction feed.
 * Drops rows whose effective admin status is hidden/declined/reversed so
 * the customer never sees them. Shared by /home/spending and the insight
 * aggregate so the two views can't diverge.
 */
export function applyOverridesToFeed(
  txns: Transaction[],
  overrides: Record<string, TxOverride>,
): Transaction[] {
  const out: Transaction[] = []
  for (const t of txns) {
    const o = overrides[t.id]
    if (!o) {
      out.push(t)
      continue
    }
    if (
      o.status === "hidden" ||
      o.status === "declined" ||
      o.status === "reversed"
    ) {
      continue
    }
    out.push({
      ...t,
      amount: o.amount ?? t.amount,
      date: o.occurredAt ?? t.date,
      description: o.description ?? t.description,
      category: o.category ?? t.category,
      status: o.status === "pending" ? "pending" : t.status,
    })
  }
  return out
}
