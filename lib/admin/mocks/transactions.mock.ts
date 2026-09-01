import type {
  AdminTxRecord,
  AdminTxStatus,
  TxOverride,
  Transaction,
} from "@/lib/store"
import { demoAdminUsers } from "./users.mock"
import { transactions as alexTxns } from "@/lib/mock-data"

/** Simulated latency for the demo mock layer. */
const LATENCY_MS = 350

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// ─── Categories + merchants ───────────────────────────────────────────────

const CATEGORIES = [
  "Dining",
  "Groceries",
  "Transport",
  "Shopping",
  "Subscriptions",
  "Utilities",
  "Housing",
  "Income",
  "Transfer",
  "Cashback",
] as const

const MERCHANTS_BY_CAT: Record<string, string[]> = {
  Dining: ["Starbucks", "DoorDash", "Sweetgreen", "Joe & The Juice", "Chipotle"],
  Groceries: ["Whole Foods", "Trader Joe's", "Costco", "Safeway"],
  Transport: ["Uber", "Lyft", "Shell", "BART"],
  Shopping: ["Amazon", "Target", "Apple", "Best Buy"],
  Subscriptions: ["Spotify", "Netflix", "iCloud", "NYT"],
  Utilities: ["Verizon", "PG&E", "Comcast"],
  Housing: ["Brookfield Properties", "AvalonBay Rent"],
  Income: ["Acme Co. Payroll", "Globex Payroll"],
  Transfer: ["Bank Transfer In", "Bank Transfer Out"],
  Cashback: ["State Bank Cashback"],
}

// Deterministic PRNG so seeded data is stable across reloads.
function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(0xc0ffee)

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]!
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function accountIdFor(userId: string): string {
  // Alex (the demo customer) keeps the canonical id used elsewhere.
  if (userId === "u_006") return "acct_spending"
  return `acct_${userId}_checking`
}

function accountLabelFor(): string {
  return "Checking"
}

function customerStatusToAdmin(s: Transaction["status"]): AdminTxStatus {
  return s === "posted" ? "settled" : "pending"
}

function accountLabelById(id: string): string {
  if (id === "acct_spending") return "Spending"
  if (id === "acct_savings") return "Savings"
  if (id === "acct_credit_builder") return "Credit Builder"
  return "Checking"
}

/** Seed ~200 transactions spread across the existing demo users. */
function buildSeed(): AdminTxRecord[] {
  const items: AdminTxRecord[] = []

  // First, fold in Alex's real customer-feed transactions so any override
  // applied here also affects /home/spending (shared id space + selector).
  for (const t of alexTxns) {
    items.push({
      id: t.id,
      userId: "u_006",
      userName: "Alex Rivera",
      accountId: t.accountId,
      accountLabel: accountLabelById(t.accountId),
      amount: t.amount,
      currency: "USD",
      description: t.description,
      category: t.category ?? "Other",
      status: customerStatusToAdmin(t.status),
      occurredAt: t.date,
    })
  }

  // Distribute roughly per user; weight Alex heavier so the customer feed
  // has some volume to exercise.
  const customers = demoAdminUsers.filter(
    (u) => u.role === "customer" && u.status !== "pending_kyc",
  )
  const weights: Record<string, number> = {}
  for (const u of customers) {
    weights[u.id] = u.id === "u_006" ? 50 : u.id === "u_010" ? 10 : 30
  }
  const pool: string[] = []
  for (const [uid, w] of Object.entries(weights)) {
    for (let i = 0; i < w; i++) pool.push(uid)
  }

  for (let i = 0; i < 200; i++) {
    const uid = pool[i % pool.length]!
    const user = customers.find((u) => u.id === uid)!
    const cat = pick(CATEGORIES)
    const merchant = pick(MERCHANTS_BY_CAT[cat]!)
    const isCredit = cat === "Income" || cat === "Cashback" || cat === "Transfer"
    const signed = isCredit
      ? cat === "Income"
        ? round2(1800 + rand() * 800)
        : round2(5 + rand() * 60)
      : -round2(3 + rand() * 220)
    const daysBack = Math.floor(rand() * 90)
    const hour = Math.floor(rand() * 24)
    const minute = Math.floor(rand() * 60)
    const dt = new Date()
    dt.setDate(dt.getDate() - daysBack)
    dt.setHours(hour, minute, 0, 0)
    const status: AdminTxStatus =
      rand() < 0.08 ? "pending" : rand() < 0.02 ? "declined" : "settled"
    items.push({
      id: `atx_${i.toString().padStart(4, "0")}`,
      userId: uid,
      userName: user.name,
      accountId: accountIdFor(uid),
      accountLabel: accountLabelFor(),
      amount: signed,
      currency: "USD",
      description: merchant,
      category: cat,
      status,
      occurredAt: dt.toISOString(),
    })
  }
  // Sort newest first for nice initial render.
  items.sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt))
  return items
}

export const demoAdminTxns: AdminTxRecord[] = buildSeed()

// ─── Effective-value helper ───────────────────────────────────────────────

export type EffectiveTx = AdminTxRecord & {
  override?: TxOverride
  effective: {
    amount: number
    occurredAt: string
    description: string
    category: string
    status: AdminTxStatus
  }
}

export function applyOverride(
  rec: AdminTxRecord,
  override: TxOverride | undefined,
): EffectiveTx {
  return {
    ...rec,
    override,
    effective: {
      amount: override?.amount ?? rec.amount,
      occurredAt: override?.occurredAt ?? rec.occurredAt,
      description: override?.description ?? rec.description,
      category: override?.category ?? rec.category,
      status: override?.status ?? rec.status,
    },
  }
}

// ─── Balance + offset suggestion ──────────────────────────────────────────

/**
 * Compute the running balance for an account from the effective view of all
 * txns belonging to it. Hidden + declined + reversed don't count.
 */
export function effectiveBalance(
  accountId: string,
  txns: AdminTxRecord[],
  overrides: Record<string, TxOverride>,
): number {
  let bal = 0
  for (const t of txns) {
    if (t.accountId !== accountId) continue
    const eff = applyOverride(t, overrides[t.id])
    if (
      eff.effective.status === "hidden" ||
      eff.effective.status === "declined" ||
      eff.effective.status === "reversed"
    ) {
      continue
    }
    bal += eff.effective.amount
  }
  return round2(bal)
}

/**
 * Pick the last credit txn on the account to suggest as an offset.
 * Returns the record + a proposed new amount that absorbs the deficit.
 */
export function suggestOffset(
  accountId: string,
  txns: AdminTxRecord[],
  overrides: Record<string, TxOverride>,
  deficit: number,
): { record: AdminTxRecord; proposedAmount: number } | null {
  const credits = txns
    .filter((t) => t.accountId === accountId)
    .map((t) => applyOverride(t, overrides[t.id]))
    .filter((t) => t.effective.amount > 0)
    .sort(
      (a, b) =>
        +new Date(b.effective.occurredAt) - +new Date(a.effective.occurredAt),
    )
  const credit = credits[0]
  if (!credit) return null
  // Add `|deficit|` to the credit so net stays the same.
  const proposed = round2(credit.effective.amount + Math.abs(deficit))
  return { record: credit, proposedAmount: proposed }
}

// ─── Mock "API" ───────────────────────────────────────────────────────────

export type PatchTxRequest = {
  amount?: number
  occurredAt?: string
  description?: string
  category?: string
  status?: AdminTxStatus
  reason: string
  by: string
  forceAllowNegative?: boolean
}

export type PatchTxResponse =
  | { ok: true; override: TxOverride }
  | {
      ok: false
      code: "BALANCE_WOULD_GO_NEGATIVE"
      accountLabel: string
      userName: string
      projectedBalance: number
      suggestedOffset?: { recordId: string; proposedAmount: number }
    }

/**
 * Simulate the future backend endpoint. Pure function over the snapshot the
 * caller passes in — does NOT mutate the store. The page's onSubmit handler
 * applies the override via the store action on `{ ok: true }`.
 */
export async function patchTransaction(
  id: string,
  req: PatchTxRequest,
  ctx: { txns: AdminTxRecord[]; overrides: Record<string, TxOverride> },
): Promise<PatchTxResponse> {
  await sleep(LATENCY_MS)
  const rec = ctx.txns.find((t) => t.id === id)
  if (!rec) throw new Error("Transaction not found")

  // Project the override and recompute the account's balance.
  const projected: TxOverride = {
    ...req,
    overriddenAt: new Date().toISOString(),
    overriddenBy: req.by,
  }
  const nextOverrides = { ...ctx.overrides, [id]: projected }
  const newBalance = effectiveBalance(rec.accountId, ctx.txns, nextOverrides)

  if (newBalance < 0 && !req.forceAllowNegative) {
    const offset = suggestOffset(
      rec.accountId,
      ctx.txns,
      ctx.overrides,
      newBalance,
    )
    return {
      ok: false,
      code: "BALANCE_WOULD_GO_NEGATIVE",
      accountLabel: rec.accountLabel,
      userName: rec.userName,
      projectedBalance: newBalance,
      suggestedOffset: offset
        ? { recordId: offset.record.id, proposedAmount: offset.proposedAmount }
        : undefined,
    }
  }

  return { ok: true, override: projected }
}

export async function deleteOverride(): Promise<{ ok: true }> {
  await sleep(LATENCY_MS)
  return { ok: true }
}

export type BulkShiftRequest = {
  ids: string[]
  deltaDays: number
  reason: string
  by: string
}

export async function bulkShift(
  req: BulkShiftRequest,
): Promise<{ ok: true; count: number }> {
  await sleep(LATENCY_MS)
  return { ok: true, count: req.ids.length }
}
