"use client"

import { useEffect, useState } from "react"
import { Bug, RotateCcw, Zap, X } from "lucide-react"
import { useStore } from "@/lib/store"
import { useToast } from "@/components/providers/ToastProvider"
import { merchantGradient } from "@/lib/fixtures/transactions"

const TEST_MERCHANTS = [
  { merchant: "Trader Joe's", category: "Groceries", amount: -32.4 },
  { merchant: "Chipotle", category: "Dining", amount: -14.85 },
  { merchant: "Uber", category: "Transport", amount: -18.2 },
  { merchant: "Apple", category: "Subscriptions", amount: -2.99 },
  { merchant: "Refund, Amazon", category: "Shopping", amount: 21.0 },
  { merchant: "Coffee Project", category: "Dining", amount: -6.5 },
] as const

/**
 * Dev-only floating helper. Renders only when:
 *   - NODE_ENV !== "production", OR
 *   - the URL contains `?dev=1` (so reviewers can poke at the production build too).
 */
export function DevPanel() {
  const [visible, setVisible] = useState(false)
  const [open, setOpen] = useState(false)
  const addTransaction = useStore((s) => s.addTransaction)
  const settleTransaction = useStore((s) => s.settleTransaction)
  const setAccounts = useStore((s) => s.setAccounts)
  const accounts = useStore((s) => s.accounts)
  const resetDemo = useStore((s) => s.resetDemo)
  const { toast } = useToast()

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      setVisible(true)
      return
    }
    try {
      const sp = new URLSearchParams(window.location.search)
      if (sp.get("dev") === "1") setVisible(true)
    } catch {}
  }, [])

  if (!visible) return null

  function injectTransaction() {
    const pick =
      TEST_MERCHANTS[Math.floor(Math.random() * TEST_MERCHANTS.length)]
    const id = `tx_inj_${Date.now()}`
    addTransaction({
      id,
      accountId: "acct_spending",
      amount: pick.amount,
      currency: "USD",
      description: pick.merchant,
      category: pick.category,
      merchant: pick.merchant,
      status: "pending",
      date: new Date().toISOString(),
    })
    // Reflect the change in Spending balance immediately (will settle in ~30s)
    setAccounts(
      accounts.map((a) =>
        a.id === "acct_spending"
          ? { ...a, balance: +(a.balance + pick.amount).toFixed(2) }
          : a,
      ),
    )
    toast(
      `${pick.merchant} · ${pick.amount > 0 ? "+" : "−"}$${Math.abs(pick.amount).toFixed(2)}`,
      { variant: "info" },
    )
    window.setTimeout(() => {
      settleTransaction(id)
    }, 30_000)
  }

  return (
    <>
      <button
        type="button"
        aria-label="Demo controls"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 right-4 z-[70] flex h-12 w-12 items-center justify-center rounded-full bg-flush/90 text-fern ring-1 ring-fern/40 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.55)] backdrop-blur transition active:scale-95 hover:bg-flush lg:bottom-6 lg:right-6"
      >
        <Bug className="h-5 w-5" aria-hidden />
      </button>

      {open && (
        <div className="fixed bottom-40 right-4 z-[70] w-60 overflow-hidden rounded-2xl bg-flush/95 ring-1 ring-white/10 backdrop-blur-xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)] lg:bottom-24 lg:right-6">
          <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
              Demo controls
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-ink/80 hover:bg-white/10"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </div>
          <div className="space-y-1 p-2">
            <DevAction
              Icon={Zap}
              label="Inject test transaction"
              onClick={() => {
                injectTransaction()
                setOpen(false)
              }}
            />
            <DevAction
              Icon={RotateCcw}
              label="Reset demo data"
              danger
              onClick={() => {
                if (
                  window.confirm(
                    "Wipe localStorage and reload with fresh demo data?",
                  )
                ) {
                  resetDemo()
                }
              }}
            />
          </div>
          <div className="border-t border-white/5 px-3 py-2 text-[10px] text-ink-muted">
            Visible in dev, or on prod via <code className="text-fern">?dev=1</code>.
          </div>
        </div>
      )}
    </>
  )
}

function DevAction({
  Icon,
  label,
  onClick,
  danger,
}: {
  Icon: typeof Zap
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold transition active:scale-95 " +
        (danger
          ? "text-rose-300 hover:bg-rose-500/10"
          : "text-ink hover:bg-white/5")
      }
    >
      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />
      {label}
    </button>
  )
}

// Silence unused-import warning if a future refactor drops merchantGradient.
void merchantGradient
