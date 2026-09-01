"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Account, Transaction } from "@/lib/store"
import { type DisplayCurrency, convertFromBase, currencyDecimals } from "@/lib/currency"
import {
  listRecurringTransfers,
  type RecurringTransferDto,
} from "@/lib/move/api/recurring.real"

/**
 * Customer dashboard — Overview view.
 *
 * Ported from the design's `<section id="view-overview">`. Reads from the
 * existing zustand store (accounts, transactions, user, goals) so no
 * backend contract changes. Currency stays USD per the latest
 * confirmation; the design's BHD strings are mapped to the customer's
 * Account.currency at render time (defaults to USD).
 */

// Amounts are stored in the base currency (USD); these convert to the
// user's chosen display currency before formatting.
function formatBalance(amountBase: number, currency: DisplayCurrency = "USD"): {
  whole: string
  dec: string
} {
  const value = convertFromBase(amountBase, currency)
  const fixed = value.toFixed(currencyDecimals(currency))
  const [whole, dec] = fixed.split(".")
  const withSep = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return { whole: withSep, dec: dec ? `.${dec}` : "" }
}

function formatAmountInline(amount: number, currency: DisplayCurrency = "USD"): string {
  const { whole, dec } = formatBalance(Math.abs(amount), currency)
  return `${currency} ${whole}${dec}`
}

function accountTypeLabel(t: Account["type"]): string {
  switch (t) {
    case "checking": return "Everyday Current Account"
    case "savings": return "Savings Account"
    case "credit_builder": return "Credit Card"
    case "mypay": return "MyPay Account"
  }
}

/** Map a one-letter initial to use as the txn-ic letter avatar. */
function txnInitial(t: Transaction): string {
  const src = t.merchant ?? t.counterpartyName ?? t.description ?? "·"
  return src.trim().charAt(0).toUpperCase() || "·"
}

/** Aggregate the user's last-30-days outflows by category for the donut. */
const DONUT_PALETTE = [
  "#C9A24A", // gold
  "#3D3934", // charcoal hover
  "#2B2926", // navy
  "#97793A", // bronze
  "#2F8A5B", // green
] as const

function buildSpendingByCategory(
  transactions: Transaction[],
  currency: string,
): {
  total: number
  legend: { label: string; amount: number; color: string }[]
  conic: string
} {
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000
  const buckets = new Map<string, number>()
  for (const t of transactions) {
    if (t.amount >= 0) continue
    if (Date.parse(t.date) < since) continue
    const cat = (t.category || "Other").replace(/_/g, " ")
    buckets.set(cat, (buckets.get(cat) ?? 0) + Math.abs(t.amount))
  }
  const entries = [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const total = entries.reduce((s, [, v]) => s + v, 0)
  if (total === 0) {
    return {
      total: 0,
      legend: [],
      conic: `conic-gradient(${DONUT_PALETTE[1]} 0deg 360deg)`,
    }
  }
  const legend: { label: string; amount: number; color: string }[] = []
  const stops: string[] = []
  let acc = 0
  for (let i = 0; i < entries.length; i++) {
    const [label, amount] = entries[i]!
    const color = DONUT_PALETTE[i % DONUT_PALETTE.length]!
    const start = (acc / total) * 360
    acc += amount
    const end = (acc / total) * 360
    stops.push(`${color} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`)
    legend.push({ label, amount, color })
  }
  // Currency suppressed in label list (numbers only) per design.
  void currency
  return { total, legend, conic: `conic-gradient(${stops.join(", ")})` }
}

function formatGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return "Good night"
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

function formatToday(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export default function HomeTab() {
  const accounts = useStore((s) => s.accounts)
  const transactions = useStore((s) => s.transactions)
  const user = useStore((s) => s.user)
  const sessionUser = useStore((s) => s.session.user)
  const goals = useStore((s) => s.goals)

  const [hidden, setHidden] = useState(false)

  const firstName =
    sessionUser?.firstName ??
    user?.name?.split(" ")[0] ??
    "there"

  // Display currency: the user's chosen base currency (persisted). Stored
  // amounts are USD and converted to this at render time.
  const currency = useStore((s) => s.displayCurrency)

  // Upcoming payments — pulled from the user's recurring-transfer
  // schedules. Sort by nextRunAt ascending and cap at 5 rows so the
  // panel stays the same height as the spending donut.
  const [recurring, setRecurring] = useState<RecurringTransferDto[]>([])
  useEffect(() => {
    let cancelled = false
    listRecurringTransfers()
      .then((rows) => {
        if (!cancelled) setRecurring(rows)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  const upcoming = useMemo(() => {
    return recurring
      .filter((r) => r.active)
      .slice()
      .sort(
        (a, b) =>
          new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime(),
      )
      .slice(0, 5)
  }, [recurring])

  // Total balance + 30-day money-in / money-out.
  const totalBalance = useMemo(
    () => accounts.reduce((s, a) => s + a.balance, 0),
    [accounts],
  )

  const moneyFlow = useMemo(() => {
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000
    let inAmt = 0, outAmt = 0
    for (const t of transactions) {
      if (Date.parse(t.date) < since) continue
      if (t.amount >= 0) inAmt += t.amount
      else outAmt += Math.abs(t.amount)
    }
    return { in: inAmt, out: outAmt, net: inAmt - outAmt }
  }, [transactions])

  const recent = useMemo(
    () => transactions.slice(0, 6),
    [transactions],
  )

  const spending = useMemo(
    () => buildSpendingByCategory(transactions, currency),
    [transactions, currency],
  )

  // Top savings goal for the lower-right card.
  const goal = goals[0]
  const goalTarget = goal?.target ?? 0
  const goalPct =
    goal && goalTarget > 0
      ? Math.min(100, Math.round((goal.balance / goalTarget) * 100))
      : 0

  const totalDisplay = formatBalance(totalBalance, currency)
  const hiddenMark = "•••••"

  return (
    <>
      <div className="page-head">
        <h2>
          Welcome back,{" "}
          <span className="ph-greet">{firstName}</span>
        </h2>
        <p className="ph-sub">
          {formatGreeting()}, here&apos;s your money at a glance. {formatToday()}.
        </p>
      </div>

      {/* ── Balance hero ─────────────────────────────────────────── */}
      <div className="balance-hero">
        <div className="bh-main">
          <div className="bh-label">
            Total balance across accounts
            <button
              type="button"
              className="bh-eye"
              onClick={() => setHidden((h) => !h)}
              aria-label={hidden ? "Show balances" : "Hide balances"}
              title={hidden ? "Show balances" : "Hide balances"}
            >
              {hidden ? (
                <EyeOff width={16} height={16} aria-hidden />
              ) : (
                <Eye width={16} height={16} aria-hidden />
              )}
            </button>
          </div>
          <div className="bh-amt">
            <span className="cur">{currency}</span>
            {hidden ? (
              hiddenMark
            ) : (
              <>
                {totalDisplay.whole}
                <span className="dec">{totalDisplay.dec}</span>
              </>
            )}
          </div>
          <div className="bh-sub">
            {moneyFlow.net >= 0 ? (
              <>
                <span className="up">
                  ▲ {formatAmountInline(moneyFlow.net, currency)}
                </span>{" "}
                net this month
              </>
            ) : (
              <>
                ▼ {formatAmountInline(moneyFlow.net, currency)} net this month
              </>
            )}{" "}
            · across {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
          </div>
        </div>
        <div className="bh-stats">
          <div className="bh-stat">
            <div className="v">
              {hidden ? hiddenMark : formatAmountInline(moneyFlow.in, currency)}
            </div>
            <div className="l">Money in · 30 days</div>
          </div>
          <div className="bh-stat">
            <div className="v">
              {hidden ? hiddenMark : formatAmountInline(moneyFlow.out, currency)}
            </div>
            <div className="l">Money out · 30 days</div>
          </div>
        </div>
      </div>

      {/* ── Account cards ────────────────────────────────────────── */}
      <div className="acct-grid">
        {accounts.slice(0, 3).map((a) => (
          <AccountCard key={a.id} account={a} hidden={hidden} currency={currency} />
        ))}
      </div>

      {/* ── Two-column layout: recent + insights ─────────────────── */}
      <div className="cols">
        {/* LEFT — Recent transactions */}
        <div>
          <div className="panel">
            <div className="panel-head">
              <h3>Recent transactions</h3>
              <Link className="ph-link" href="/home/spending">
                View all <span>→</span>
              </Link>
            </div>
            <div className="panel-body">
              {recent.length === 0 ? (
                <p style={{ padding: "30px 0", color: "var(--ink-mute)", textAlign: "center" }}>
                  No recent transactions yet.
                </p>
              ) : (
                recent.map((t) => <TxnRow key={t.id} txn={t} currency={currency} />)
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Spending donut + goal */}
        <div>
          <div className="panel">
            <div className="panel-head">
              <h3>Spending this month</h3>
              <Link className="ph-link" href="/home/spending/insight">
                Details <span>→</span>
              </Link>
            </div>
            <div className="panel-body">
              <div className="donut-wrap">
                <div className="donut" style={{ background: spending.conic }}>
                  <div className="donut-center">
                    <span className="dc-l">Spent</span>
                    <span className="dc-v">
                      {hidden
                        ? hiddenMark
                        : formatBalance(spending.total, currency).whole}
                    </span>
                  </div>
                </div>
                <div className="donut-legend">
                  {spending.legend.length === 0 ? (
                    <div className="dl">
                      <span className="ld" style={{ background: DONUT_PALETTE[1] }} />
                      No outflows yet
                    </div>
                  ) : (
                    spending.legend.map((l) => (
                      <div className="dl" key={l.label}>
                        <span className="ld" style={{ background: l.color }} />
                        <span className="dn">{l.label}</span>
                        <span className="lv">
                          {hidden ? hiddenMark : formatBalance(l.amount, currency).whole}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><h3>Upcoming payments</h3></div>
            <div className="panel-body">
              {upcoming.length === 0 ? (
                <div
                  style={{
                    padding: "8px 0",
                    fontSize: 13,
                    color: "var(--ink-mute)",
                    textAlign: "center",
                  }}
                >
                  No scheduled transfers yet.
                </div>
              ) : (
                upcoming.map((r) => {
                  const dt = new Date(r.nextRunAt)
                  const day = String(dt.getUTCDate()).padStart(2, "0")
                  const month = dt.toLocaleString("en-US", {
                    month: "short",
                    timeZone: "UTC",
                  })
                  const toAcct = accounts.find((a) => a.id === r.toAccountId)
                  const fromAcct = accounts.find((a) => a.id === r.fromAccountId)
                  const title =
                    (toAcct ? accountTypeLabel(toAcct.type) : "Scheduled transfer")
                  const freqLabel =
                    r.frequency === "weekly"
                      ? "Weekly"
                      : r.frequency === "biweekly"
                        ? "Every 2 weeks"
                        : "Monthly"
                  const sub = fromAcct
                    ? `${freqLabel} · from ${accountTypeLabel(fromAcct.type)}`
                    : freqLabel
                  const cents = Number(r.amountCents) / 100
                  return (
                    <div className="sched" key={r.id}>
                      <span className="sched-date">
                        <span className="d">{day}</span>
                        <span className="m">{month}</span>
                      </span>
                      <div className="sched-body">
                        <div className="sn">{title}</div>
                        <div className="ss">{sub}</div>
                      </div>
                      <span className="sched-amt">
                        − {formatAmountInline(cents, currency)}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {goal && (
            <div className="panel">
              <div className="panel-head">
                <h3>{goal.name || "Savings goal"}</h3>
              </div>
              <div className="panel-body">
                <div className="goal">
                  <div className="goal-top">
                    <span className="gn">Savings goal</span>
                    <span className="gp">{goalPct}%</span>
                  </div>
                  <div className="goal-track">
                    <span style={{ width: `${goalPct}%` }} />
                  </div>
                  <div className="goal-sub">
                    {hidden
                      ? hiddenMark
                      : goalTarget > 0
                        ? `${formatAmountInline(goal.balance, currency)} of ${formatAmountInline(
                            goalTarget,
                            currency,
                          )}`
                        : formatAmountInline(goal.balance, currency)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function AccountCard({
  account,
  hidden,
  currency,
}: {
  account: Account
  hidden: boolean
  currency: DisplayCurrency
}) {
  const bal = formatBalance(Math.abs(account.balance), currency)
  const isCredit = account.type === "credit_builder"
  const isSavings = account.type === "savings"
  const apyMeta =
    account.apy != null && !isCredit
      ? `Earning ${account.apy}% APY`
      : isCredit
        ? "Credit balance"
        : "Available balance"

  return (
    <div className="acct">
      <div className="acct-top">
        <div>
          <div className="acct-type">{account.label || accountTypeLabel(account.type)}</div>
          <div className="acct-no">···· ···· ····</div>
        </div>
        <span className="acct-chip" aria-hidden>
          {isCredit ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
          ) : isSavings ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 14l4-4 3 3 5-6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="6" width="18" height="13" rx="2" />
              <path d="M3 10h18" />
            </svg>
          )}
        </span>
      </div>
      <div className={cn("acct-bal", isCredit && account.balance < 0 && "neg")}>
        <span className="cur">{currency}</span>
        {hidden ? "•••••" : `${bal.whole}${bal.dec}`}
      </div>
      <div className="acct-meta">{apyMeta}</div>
      <div className="acct-actions">
        <Link href="/home/spending">View activity</Link>
        <Link href={isCredit ? "/home/spending/card" : "/move/transfer"}>
          {isCredit ? "Manage card" : "Transfer →"}
        </Link>
      </div>
    </div>
  )
}

function TxnRow({ txn, currency }: { txn: Transaction; currency: DisplayCurrency }) {
  const incoming = txn.amount > 0
  const date = useMemo(() => {
    const d = new Date(txn.date)
    if (Number.isNaN(d.getTime())) return txn.date
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  }, [txn.date])

  const description =
    txn.description || txn.merchant || txn.counterpartyName || "Transaction"
  // Account-to-account route transfer ("Checking to Savings", "Checking to
  // Card •••• 6655") → two-way arrow, distinct from person-to-person
  // ("Transfer to Jane" / "Wire transfer to …") and merchant rows.
  const isTransfer = (txn.category ?? "").toLowerCase() === "transfer"
  const isRoute =
    !txn.merchant &&
    isTransfer &&
    !/^(?:wire\s+)?transfer\s+to\s+/i.test(description) &&
    !/^from\s+/i.test(description) &&
    /\sto\s/i.test(description)

  return (
    <div className="txn">
      <span className={cn("txn-ic", incoming && "in")}>
        {isRoute ? (
          // Account-to-account route → two-way arrow.
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m16 3 4 4-4 4" />
            <path d="M20 7H4" />
            <path d="m8 21-4-4 4-4" />
            <path d="M4 17h16" />
          </svg>
        ) : incoming ? (
          // Money in → down arrow.
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        ) : isTransfer ? (
          // Outgoing transfer (P2P / wire / ACH) → up (out) arrow.
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        ) : (
          // Outgoing non-transfer (merchant purchase) → initial avatar.
          txnInitial(txn)
        )}
      </span>
      <div className="txn-main">
        <div className="tn">{description}</div>
        <div className="tm">
          {txn.category && (
            <span className="txn-cat">{txn.category.replace(/_/g, " ")}</span>
          )}
          <span>{date}</span>
        </div>
      </div>
      <div className="txn-amt">
        <div className={cn("ta", incoming && "in")}>
          {incoming ? "+ " : "− "}
          {formatAmountInline(txn.amount, currency)}
        </div>
        <div className={cn("ta-status", txn.status === "pending" && "pending")}>
          {txn.status === "pending" ? "Pending" : "Posted"}
        </div>
      </div>
    </div>
  )
}
