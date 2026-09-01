"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search, X, CreditCard, BarChart3 } from "lucide-react"
import { format } from "date-fns"
import { PullToRefresh } from "@/components/ui/PullToRefresh"
import { useToast } from "@/components/providers/ToastProvider"
import { TransactionDetailSheet } from "@/components/spending/TransactionDetailSheet"
import { useStore } from "@/lib/store"
import type { Transaction } from "@/lib/store"
import { formatMoney } from "@/lib/currency"
import { applyOverridesToFeed } from "@/lib/admin/applyOverridesToFeed"
import { listTransactions } from "@/lib/transactions/api/transactions"
import { listAccounts } from "@/lib/accounts/api/accounts"
import { useMocks as USE_MOCKS } from "@/lib/dev/use-mocks-flag"
import { cn } from "@/lib/utils"

/**
 * Transactions feed — ported to the design's `view-transactions` shell.
 *
 * Top: page-head with heading + sub.
 * Body: `.panel` with `.txn-filters` (search + category + status selects)
 * then `.panel-body` containing date-grouped `.txn` rows.
 *
 * All data wiring (store reads + refresh + WS) preserved verbatim.
 */

type CategoryFilter = "all" | string
type StatusFilter = "all" | "in" | "out"

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "income", label: "Income" },
  { value: "groceries", label: "Groceries" },
  { value: "dining", label: "Dining" },
  { value: "bills", label: "Bills" },
  { value: "transport", label: "Transport" },
  { value: "shopping", label: "Shopping" },
  { value: "transfer", label: "Transfer" },
] as const

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "in", label: "Money in" },
  { value: "out", label: "Money out" },
]

export default function SpendingDetailPage() {
  const router = useRouter()
  const accounts = useStore((s) => s.accounts)
  const rawTxns = useStore((s) => s.transactions)
  const overrides = useStore((s) => s.txOverrides)
  const transactionsStatus = useStore((s) => s.data.transactionsStatus)
  const setTransactions = useStore((s) => s.setTransactions)
  const setTransactionsStatus = useStore((s) => s.setTransactionsStatus)
  const setTransactionsCursor = useStore((s) => s.setTransactionsCursor)
  const setAccounts = useStore((s) => s.setAccounts)

  const loadingFeed =
    !USE_MOCKS &&
    (transactionsStatus === "loading" || transactionsStatus === "unknown") &&
    rawTxns.length === 0

  const allTxns = applyOverridesToFeed(rawTxns, overrides)

  // Per-account label lookup so each row shows its own account (the page
  // spans every account now, not just checking).
  const accountLabelById = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of accounts) m.set(a.id, a.label)
    return m
  }, [accounts])

  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<CategoryFilter>("all")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [activeTxn, setActiveTxn] = useState<Transaction | null>(null)

  // Re-pull accounts + the user's transaction feed on mount so the
  // header balance + list are fresh on back-nav. Best-effort.
  useEffect(() => {
    if (USE_MOCKS) return
    let cancelled = false
    void Promise.allSettled([
      listAccounts().then((a) => {
        if (!cancelled) setAccounts(a)
      }),
      (async () => {
        setTransactionsStatus("loading")
        const page = await listTransactions({ limit: 50 })
        if (cancelled) return
        setTransactions(page.items)
        setTransactionsCursor(page.nextCursor)
        setTransactionsStatus("ready")
      })().catch(() => {
        if (!cancelled) setTransactionsStatus("error")
      }),
    ])
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredTxns = useMemo(() => {
    const q = query.trim().toLowerCase()
    // Show activity across ALL of the customer's accounts (not just
    // checking). Account-scoping is surfaced per-row via the account label.
    return allTxns
      .filter((t) => {
        if (status === "in") return t.amount > 0
        if (status === "out") return t.amount < 0
        return true
      })
      .filter((t) => {
        if (category === "all") return true
        const cat = (t.category ?? "").toLowerCase()
        return cat === category
      })
      .filter((t) =>
        q
          ? [t.description, t.merchant, t.category]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(q)
          : true,
      )
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
  }, [allTxns, query, status, category])

  // Group by human date label.
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of filteredTxns) {
      const label = labelFor(t.date)
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(t)
    }
    return [...map.entries()]
  }, [filteredTxns])

  const { toast } = useToast()
  async function refresh() {
    if (USE_MOCKS) {
      await new Promise((r) => setTimeout(r, 800))
      toast("Transactions refreshed", { variant: "info", duration: 1500 })
      return
    }
    try {
      setTransactionsStatus("loading")
      const [page, accts] = await Promise.all([
        listTransactions({ limit: 50 }),
        listAccounts(),
      ])
      setTransactions(page.items)
      setTransactionsCursor(page.nextCursor)
      setAccounts(accts)
      setTransactionsStatus("ready")
      toast("Refreshed", { variant: "info", duration: 1500 })
    } catch {
      setTransactionsStatus("error")
      toast("Couldn't refresh.", { variant: "error", duration: 2000 })
    }
  }

  return (
    <PullToRefresh onRefresh={refresh}>
      <button
        type="button"
        onClick={() => router.back()}
        className="view-back"
        aria-label="Back"
      >
        <ArrowLeft aria-hidden /> Back
      </button>

      <div className="page-head">
        <h2>Transactions</h2>
        <p className="ph-sub">
          Search and filter activity across all your accounts.
        </p>
      </div>

      <div className="panel">
        <div className="txn-filters">
          <div className="txn-search">
            <Search aria-hidden />
            <input
              type="search"
              placeholder="Search merchant, category…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search transactions"
            />
            {query && (
              <button
                type="button"
                className="clear-btn"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                <X width={14} height={14} aria-hidden />
              </button>
            )}
          </div>
          <label className="txn-select">
            <span>Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter by category"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </label>
          <label className="txn-select">
            <span>Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </label>
        </div>

        <div className="panel-body flush">
          {loadingFeed && (
            <div className="txn-empty">Loading transactions…</div>
          )}
          {!loadingFeed && groups.length === 0 && (
            <div className="txn-empty">
              {transactionsStatus === "error"
                ? "Couldn't load transactions. Pull to refresh."
                : "No matching transactions."}
            </div>
          )}
          {groups.map(([label, rows]) => (
            <div key={label}>
              <div className="txn-date-head">{label}</div>
              {rows.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="txn-row"
                  onClick={() => setActiveTxn(t)}
                  aria-label={`Open ${t.description ?? "transaction"}`}
                >
                  <TxnRow txn={t} accountLabel={accountLabelById.get(t.accountId) ?? ""} />
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Quick links — kept from the prior page so users can jump to the
          card or insights without bouncing back to home first. */}
      <div className="actions-bar" style={{ gridTemplateColumns: "repeat(2, 1fr)", marginTop: 24 }}>
        <Link className="action-btn" href="/home/spending/card">
          <span className="action-ic"><CreditCard aria-hidden /></span>
          <span className="al">Card</span>
        </Link>
        <Link className="action-btn" href="/home/spending/insight">
          <span className="action-ic"><BarChart3 aria-hidden /></span>
          <span className="al">Insights</span>
        </Link>
      </div>

      <TransactionDetailSheet
        txn={activeTxn}
        onClose={() => setActiveTxn(null)}
      />
    </PullToRefresh>
  )
}

/* ─── Single txn row — design's .txn markup ───────────────────────── */

function TxnRow({
  txn,
  accountLabel,
}: {
  txn: Transaction
  accountLabel: string
}) {
  const currency = useStore((s) => s.displayCurrency)
  const incoming = txn.amount > 0
  const dateLabel = useMemo(() => {
    const dt = new Date(txn.date)
    if (Number.isNaN(dt.getTime())) return txn.date
    return format(dt, "d MMM yyyy")
  }, [txn.date])
  const description = txn.description || txn.merchant || "Transaction"
  const initial =
    (txn.merchant ?? txn.description ?? "·").trim().charAt(0).toUpperCase() ||
    "·"
  // Account-to-account route transfer ("Checking to Savings", "Checking to
  // Card •••• 6655") → a two-way arrow, distinct from person-to-person
  // ("Transfer to Jane" / "Wire transfer to …") and merchant rows. Excludes
  // the person-directed phrasings, which also contain " to ".
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
          initial
        )}
      </span>
      <div className="txn-main">
        <div className="tn">{description}</div>
        <div className="tm">
          {txn.category && (
            <span className="txn-cat">{capitalize(txn.category)}</span>
          )}
          <span>
            {dateLabel}
            {accountLabel ? ` · ${accountLabel}` : ""}
          </span>
        </div>
      </div>
      <div className="txn-amt">
        <div className={cn("ta", incoming && "in")}>
          {incoming ? "+ " : "− "}
          {formatMoney(Math.abs(txn.amount), currency)}
        </div>
        <div className={cn("ta-status", txn.status)}>
          {txn.status === "pending" ? "Pending" : "Posted"}
        </div>
      </div>
    </div>
  )
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

function labelFor(iso: string): string {
  const dt = new Date(iso)
  const now = new Date()
  const sameDay = dt.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay) return "Today"
  if (dt.toDateString() === yesterday.toDateString()) return "Yesterday"
  return format(dt, "EEEE, MMM d, yyyy")
}

function capitalize(s: string): string {
  if (!s) return s
  return s[0]!.toUpperCase() + s.slice(1)
}

