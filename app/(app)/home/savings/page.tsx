"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Loader2,
  Plus,
  TrendingUp,
} from "lucide-react"
import { applyOverridesToFeed } from "@/lib/admin/applyOverridesToFeed"
import { AnimatedBalance } from "@/components/ui/AnimatedBalance"
import { GoalCard, NewGoalTile } from "@/components/savings/GoalCard"
import { NewGoalModal } from "@/components/savings/NewGoalModal"
import { GoalDetailSheet } from "@/components/savings/GoalDetailSheet"
import { AutosaveModal } from "@/components/savings/AutosaveModal"
import { useToast } from "@/components/providers/ToastProvider"
import { useStore } from "@/lib/store"
import type { SavingsGoal } from "@/lib/store"
import { type DisplayCurrency, convertFromBase, currencyDecimals } from "@/lib/currency"

export default function SavingsDetailPage() {
  const router = useRouter()
  const goals = useStore((s) => s.goals)
  const accounts = useStore((s) => s.accounts)
  const accountsStatus = useStore((s) => s.data.accountsStatus)
  const transactions = useStore((s) => s.transactions)
  const txOverrides = useStore((s) => s.txOverrides)
  const balancesVisible = useStore((s) => s.prefs.balancesVisible)
  const currency = useStore((s) => s.displayCurrency)

  // Prefer the savings account balance from the real account record when we
  // have one; fall back to summing goal balances (covers mock mode + pre-load).
  const savingsAccount = useMemo(
    () => accounts.find((a) => a.type === "savings"),
    [accounts],
  )
  const goalsTotal = goals.reduce((s, g) => s + g.balance, 0)
  const total = savingsAccount?.balance ?? goalsTotal
  const apy = savingsAccount?.apy ?? 1.0
  const loading = accountsStatus === "loading" && goals.length === 0

  // Transactions feed scoped to the savings account. Pulls from the same
  // store slice that the home / spending pages read, so the
  // RealtimeProvider's `transaction.created` / `transaction.updated`
  // pushes flow in without a refetch.
  const savingsTxns = useMemo(() => {
    if (!savingsAccount) return []
    return applyOverridesToFeed(transactions, txOverrides)
      .filter((t) => t.accountId === savingsAccount.id)
      .slice()
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
  }, [transactions, txOverrides, savingsAccount])

  const [newGoalOpen, setNewGoalOpen] = useState(false)
  const [autosaveOpen, setAutosaveOpen] = useState(false)
  const [activeGoal, setActiveGoal] = useState<SavingsGoal | null>(null)
  const { toast } = useToast()

  function flashSaved() {
    toast("Autosave updated")
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-3 pb-8 md:px-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="view-back"
        aria-label="Back"
      >
        <ArrowLeft aria-hidden />
        Back
      </button>

      {/* Hero */}
      <section className="text-center">
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-ink-muted">
          Savings
          <span className="rounded-full bg-fern/20 px-2.5 py-0.5 text-[11px] font-semibold text-fern ring-1 ring-fern/30">
            {apy.toFixed(2)}% APY
          </span>
        </div>
        <AnimatedBalance
          value={total}
          className="mt-2 block font-display text-5xl font-bold tracking-tight text-ink md:text-6xl"
        />
        <div className="mt-1 text-xs text-ink-muted">
          Across {goals.length} goal{goals.length === 1 ? "" : "s"}
        </div>
      </section>

      {/* Actions */}
      <section className="mt-7 grid grid-cols-2 gap-3">
        <ActionButton
          label="Add Money"
          Icon={Plus}
          onClick={() => router.push("/move")}
        />
        <ActionButton
          label="Autosave"
          Icon={TrendingUp}
          onClick={() => setAutosaveOpen(true)}
        />
      </section>

      {/* Goals — horizontally scrollable */}
      <section className="mt-8">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display text-lg font-bold tracking-tight text-ink">
            Goals
          </h2>
          <span className="text-xs text-ink-muted">
            {goals.length} active
          </span>
        </div>

        {loading ? (
          <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-white/[0.04] p-6 text-sm text-ink-muted ring-1 ring-white/10">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading your goals…
          </div>
        ) : goals.length === 0 ? (
          <div className="mt-3 rounded-2xl bg-white/[0.04] p-6 text-center ring-1 ring-white/10">
            <div className="text-sm font-semibold text-ink">
              No goals yet
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Create your first savings goal and start stacking.
            </p>
            <button
              type="button"
              onClick={() => setNewGoalOpen(true)}
              className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-ink transition hover:bg-brand-bright"
            >
              <Plus className="h-4 w-4" aria-hidden />
              New goal
            </button>
          </div>
        ) : (
          <div className="no-scrollbar mt-3 -mx-4 overflow-x-auto px-4 pb-1 md:-mx-6 md:px-6">
            <div className="flex snap-x snap-mandatory gap-3">
              {goals.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  onClick={() => setActiveGoal(g)}
                />
              ))}
              <NewGoalTile onClick={() => setNewGoalOpen(true)} />
            </div>
          </div>
        )}
      </section>

      {/* Transactions — scoped to the savings account, live via the
          RealtimeProvider's store push. */}
      <section className="mt-8">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display text-lg font-bold tracking-tight text-ink">
            Transactions
          </h2>
          <span className="text-xs text-ink-muted">
            {savingsTxns.length === 0
              ? "none yet"
              : `${savingsTxns.length} total`}
          </span>
        </div>

        {savingsTxns.length === 0 ? (
          <div className="mt-3 rounded-2xl bg-white/[0.04] p-6 text-center text-sm text-ink-muted ring-1 ring-white/10">
            No savings activity yet. Transfers in and out will show up here.
          </div>
        ) : (
          <ul className="mt-3 overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/5 divide-y divide-white/5">
            {savingsTxns.slice(0, 20).map((t) => {
              const isCredit = t.amount > 0
              const Icon = isCredit ? ArrowDownLeft : ArrowUpRight
              const { prefix, name } = parseTitle(t, isCredit)
              const dt = new Date(t.date)
              const dateLabel = Number.isNaN(dt.getTime())
                ? ""
                : format(dt, "MMM d, yyyy, h:mm a")
              return (
                <li key={t.id}>
                  <div className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-fern/15 text-fern">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm tracking-tight">
                        {prefix && (
                          <span className="font-medium text-ink/70">
                            {prefix}{" "}
                          </span>
                        )}
                        <span className="font-semibold uppercase text-ink">
                          {name}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        {dateLabel}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-xs font-semibold tabular-nums text-white">
                        {balancesVisible
                          ? formatAmount(t.amount, currency)
                          : "••••"}
                      </span>
                      <SavingsStatusPill status={t.status} />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <NewGoalModal
        open={newGoalOpen}
        onClose={() => setNewGoalOpen(false)}
      />
      <GoalDetailSheet
        goal={activeGoal}
        onClose={() => setActiveGoal(null)}
      />
      <AutosaveModal
        open={autosaveOpen}
        onClose={() => setAutosaveOpen(false)}
        onSaved={flashSaved}
      />
    </div>
  )
}

function ActionButton({
  label,
  Icon,
  onClick,
}: {
  label: string
  Icon: typeof ArrowLeftRight
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl bg-white/5 px-3 py-4 ring-1 ring-white/10 transition hover:bg-white/10 hover:ring-fern/40"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fern/15 text-fern">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <span className="text-xs font-semibold text-ink">{label}</span>
    </button>
  )
}

/** Same heuristic as RecentTransactions: split into lowercased prefix +
 *  uppercased counterparty so transfers read "from SHELL HOMES" / "transfer
 *  to SHELL HOMES LLC". Keeping a local copy avoids a circular import. */
function parseTitle(
  t: {
    description: string
    merchant?: string
    counterpartyName?: string
    category?: string
    amount: number
  },
  isCredit: boolean,
): { prefix: string; name: string } {
  if (t.counterpartyName && t.counterpartyName.trim()) {
    return {
      prefix: isCredit ? "from" : "transfer to",
      name: t.counterpartyName.trim(),
    }
  }
  const desc = (t.description ?? "").trim()
  const transferTo = /^transfer\s+to\s+(.+)$/i.exec(desc)
  if (transferTo) return { prefix: "transfer to", name: transferTo[1]!.trim() }
  const from = /^from\s+(.+)$/i.exec(desc)
  if (from) return { prefix: "from", name: from[1]!.trim() }
  if (t.merchant && t.merchant.trim()) {
    return { prefix: isCredit ? "from" : "transfer to", name: t.merchant.trim() }
  }
  const isTransfer = (t.category ?? "").toLowerCase() === "transfer"
  if (!isTransfer && desc) return { prefix: "", name: desc }
  return {
    prefix: isCredit ? "from" : "transfer to",
    name: isCredit ? "Sender" : "Recipient",
  }
}

function formatAmount(amount: number, currency: DisplayCurrency = "USD"): string {
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : ""
  const dp = currencyDecimals(currency)
  return (
    sign +
    convertFromBase(Math.abs(amount), currency).toLocaleString("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: dp,
      maximumFractionDigits: dp,
    })
  )
}

function SavingsStatusPill({ status }: { status: "pending" | "posted" }) {
  if (status === "pending") {
    return (
      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
        Pending
      </span>
    )
  }
  return (
    <span className="rounded-full bg-fern/15 px-2 py-0.5 text-[10px] font-semibold text-fern">
      Successful
    </span>
  )
}
