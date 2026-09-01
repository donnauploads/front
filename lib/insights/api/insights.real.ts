/**
 * Insights endpoints. Backed by materialised views server-side, so they
 * see every settled transaction — not just the most recent page the FE
 * happens to have in its store.
 *
 *   GET /insights/monthly?accountId=&months=
 *   GET /insights/by-category?accountId=&monthStart=
 */

import { apiFetch } from "@/lib/api/client"

export type MonthlyTotals = {
  yearMonth: string // "2026-05"
  monthStart: string // ISO
  totalInCents: string // bigint as string
  totalOutCents: string
  txCount: number
}

export type CategoryTotals = {
  monthStart: string
  category: string // lowercase enum: 'groceries' | 'dining' | ...
  totalSpentCents: string
  txCount: number
}

export function getMonthlyInsights(args?: {
  accountId?: string
  months?: number
}): Promise<MonthlyTotals[]> {
  const p = new URLSearchParams()
  if (args?.accountId) p.set("accountId", args.accountId)
  if (args?.months) p.set("months", String(args.months))
  const qs = p.toString()
  return apiFetch<MonthlyTotals[]>(`/insights/monthly${qs ? `?${qs}` : ""}`)
}

export function getCategoryInsights(args?: {
  accountId?: string
  monthStart?: Date
}): Promise<CategoryTotals[]> {
  const p = new URLSearchParams()
  if (args?.accountId) p.set("accountId", args.accountId)
  if (args?.monthStart) p.set("monthStart", args.monthStart.toISOString())
  const qs = p.toString()
  return apiFetch<CategoryTotals[]>(
    `/insights/by-category${qs ? `?${qs}` : ""}`,
  )
}
