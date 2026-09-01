"use client"

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { EyeOff, X } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useStore } from "@/lib/store"
import type { AdminTxStatus, TxOverride } from "@/lib/store"
import {
  applyOverride,
  effectiveBalance,
  patchTransaction,
} from "@/lib/admin/api/transactions"
import { useToast } from "@/components/providers/ToastProvider"
import { cn } from "@/lib/utils"
import { useIsAtLeast } from "./RoleGate"
import { MoneyInput } from "@/components/ui/MoneyInput"
import { BalanceGuardModal } from "./BalanceGuardModal"

const CATEGORY_OPTIONS = [
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
  "Other",
] as const

const STATUS_OPTIONS: AdminTxStatus[] = [
  "pending",
  "settled",
  "declined",
  "reversed",
  "hidden",
]

export function TransactionEditSheet({
  txnId,
  onClose,
}: {
  txnId: string | null
  onClose: () => void
}) {
  const txns = useStore((s) => s.adminTxns)
  const overrides = useStore((s) => s.txOverrides)
  const setOverride = useStore((s) => s.setTxOverride)
  const clearOverride = useStore((s) => s.clearTxOverride)
  const { toast } = useToast()
  const isSuperadmin = useIsAtLeast("superadmin")

  const rec = txnId ? txns.find((t) => t.id === txnId) : null
  const override = txnId ? overrides[txnId] : undefined
  const eff = rec ? applyOverride(rec, override) : null

  // Form state
  const [amount, setAmount] = useState("")
  const [occurredAt, setOccurredAt] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState<AdminTxStatus>("settled")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [guard, setGuard] = useState<null | {
    accountLabel: string
    userName: string
    projectedBalance: number
    suggestedOffset?: { recordId: string; proposedAmount: number }
  }>(null)

  useEffect(() => {
    if (!eff) return
    setAmount(String(eff.effective.amount))
    setOccurredAt(toLocalInput(eff.effective.occurredAt))
    setDescription(eff.effective.description)
    setCategory(eff.effective.category)
    setStatus(eff.effective.status)
    setReason("")
  }, [txnId])

  const projectedBalance = useMemo(() => {
    if (!rec) return 0
    const tentative: TxOverride = {
      amount: parseFloat(amount) || 0,
      occurredAt: fromLocalInput(occurredAt),
      description,
      category,
      status,
      reason: reason || "preview",
      overriddenAt: new Date().toISOString(),
      overriddenBy: "admin@cbb.gov.bh",
    }
    return effectiveBalance(rec.accountId, txns, {
      ...overrides,
      [rec.id]: tentative,
    })
  }, [rec, txns, overrides, amount, occurredAt, description, category, status])

  const currentBalance = useMemo(
    () => (rec ? effectiveBalance(rec.accountId, txns, overrides) : 0),
    [rec, txns, overrides],
  )

  if (!rec || !eff) return null

  const delta = projectedBalance - currentBalance

  async function submit(opts?: { forceAllowNegative?: boolean }) {
    if (!rec) return
    if (reason.trim().length < 5) {
      toast("Reason is required (≥5 chars).", { variant: "error" })
      return
    }
    setSubmitting(true)
    const res = await patchTransaction(
      rec.id,
      {
        amount: parseFloat(amount),
        occurredAt: fromLocalInput(occurredAt),
        description,
        category,
        status,
        reason,
        by: "admin@cbb.gov.bh",
        forceAllowNegative: opts?.forceAllowNegative,
      },
      { txns, overrides },
    )
    setSubmitting(false)
    if (!res.ok) {
      setGuard({
        accountLabel: res.accountLabel,
        userName: res.userName,
        projectedBalance: res.projectedBalance,
        suggestedOffset: res.suggestedOffset,
      })
      return
    }
    setOverride(rec.id, res.override)
    toast(`Pushed live to ${rec.userName}'s app`, {
      variant: "success",
      duration: 2200,
    })
    onClose()
  }

  function acceptOffset() {
    if (!rec || !guard?.suggestedOffset) return
    const offsetRec = txns.find((t) => t.id === guard.suggestedOffset!.recordId)
    if (!offsetRec) return
    const now = new Date().toISOString()
    // Apply the user's edit + the offset edit atomically (both via the store).
    setOverride(rec.id, {
      amount: parseFloat(amount),
      occurredAt: fromLocalInput(occurredAt),
      description,
      category,
      status,
      reason,
      overriddenAt: now,
      overriddenBy: "admin@cbb.gov.bh",
    })
    const existing = overrides[offsetRec.id]
    setOverride(offsetRec.id, {
      ...existing,
      amount: guard.suggestedOffset.proposedAmount,
      reason: `Auto-offset for ${rec.id}: ${reason}`,
      overriddenAt: now,
      overriddenBy: "admin@cbb.gov.bh",
    })
    toast(`Pushed live to ${rec.userName}'s app`, {
      variant: "success",
      duration: 2200,
    })
    setGuard(null)
    onClose()
  }

  function allowNegative() {
    setGuard(null)
    void submit({ forceAllowNegative: true })
  }

  function doClear() {
    if (!rec) return
    clearOverride(rec.id)
    toast("Override cleared.", { variant: "info", duration: 1800 })
    onClose()
  }

  function hideRow() {
    setStatus("hidden")
    if (!reason.trim()) {
      toast("Add a reason, then save to hide.", { variant: "info" })
      return
    }
    void submit()
  }

  return (
    <>
      <AnimatePresence>
        {txnId && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-900/40"
              onClick={onClose}
            />
            <motion.aside
              key="sheet"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.22 }}
              className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl"
            >
              <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500">
                    Edit transaction
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">
                    {rec.id}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {/* Original vs Effective */}
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs">
                  <Column title="Original">
                    <Kv k="Amount" v={fmtMoney(rec.amount)} />
                    <Kv
                      k="Occurred"
                      v={format(new Date(rec.occurredAt), "MMM d, yyyy h:mm a")}
                    />
                    <Kv k="Description" v={rec.description} />
                    <Kv k="Category" v={rec.category} />
                    <Kv k="Status" v={rec.status} />
                  </Column>
                  <Column title="Effective" emphasised>
                    <Kv
                      k="Amount"
                      v={fmtMoney(eff.effective.amount)}
                      changed={eff.effective.amount !== rec.amount}
                    />
                    <Kv
                      k="Occurred"
                      v={format(
                        new Date(eff.effective.occurredAt),
                        "MMM d, yyyy h:mm a",
                      )}
                      changed={eff.effective.occurredAt !== rec.occurredAt}
                    />
                    <Kv
                      k="Description"
                      v={eff.effective.description}
                      changed={eff.effective.description !== rec.description}
                    />
                    <Kv
                      k="Category"
                      v={eff.effective.category}
                      changed={eff.effective.category !== rec.category}
                    />
                    <Kv
                      k="Status"
                      v={eff.effective.status}
                      changed={eff.effective.status !== rec.status}
                    />
                  </Column>
                </div>

                {/* Form */}
                <form
                  className="mt-5 space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void submit()
                  }}
                >
                  <Field label="Amount (negative = outflow)">
                    <MoneyInput
                      value={amount}
                      onChange={setAmount}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm focus:border-slate-400 focus:outline-none"
                    />
                    <DeltaChip
                      delta={delta}
                      currentBalance={currentBalance}
                      projectedBalance={projectedBalance}
                      accountLabel={rec.accountLabel}
                    />
                  </Field>

                  <Field label="Occurred at">
                    <input
                      type="datetime-local"
                      value={occurredAt}
                      onChange={(e) => setOccurredAt(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-slate-400 focus:outline-none"
                    />
                  </Field>

                  <Field label="Description">
                    <input
                      type="text"
                      maxLength={120}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-slate-400 focus:outline-none"
                    />
                    <div className="mt-1 text-[10px] text-slate-400">
                      {description.length}/120
                    </div>
                  </Field>

                  <Field label="Category">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm focus:border-slate-400 focus:outline-none"
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Status">
                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value as AdminTxStatus)
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm focus:border-slate-400 focus:outline-none"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {status === "hidden" && (
                      <div className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                        Customer will no longer see this transaction.
                      </div>
                    )}
                  </Field>

                  <Field label="Reason (audit log)">
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      placeholder="Why is this override needed?"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    />
                  </Field>
                </form>
              </div>

              <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3">
                <div className="flex gap-2">
                  {override && (
                    <button
                      type="button"
                      onClick={doClear}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Clear override
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={hideRow}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <EyeOff className="h-3 w-3" aria-hidden /> Hide
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void submit()}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {submitting ? "Saving…" : "Apply override"}
                  </button>
                </div>
              </footer>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <BalanceGuardModal
        open={!!guard}
        onClose={() => setGuard(null)}
        info={guard}
        canForce={isSuperadmin}
        onAcceptOffset={acceptOffset}
        onAllowNegative={allowNegative}
      />
    </>
  )
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInput(v: string): string {
  return new Date(v).toISOString()
}

function Column({
  title,
  emphasised,
  children,
}: {
  title: string
  emphasised?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div
        className={cn(
          "mb-1 text-[10px] uppercase tracking-wider",
          emphasised ? "text-violet-700" : "text-slate-500",
        )}
      >
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Kv({
  k,
  v,
  changed,
}: {
  k: string
  v: string
  changed?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] uppercase tracking-wider text-slate-400">
        {k}
      </span>
      <span
        className={cn(
          "truncate text-xs",
          changed ? "font-semibold text-violet-700" : "text-slate-700",
        )}
      >
        {v}
      </span>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  )
}

function DeltaChip({
  delta,
  currentBalance,
  projectedBalance,
  accountLabel,
}: {
  delta: number
  currentBalance: number
  projectedBalance: number
  accountLabel: string
}) {
  if (Math.abs(delta) < 0.005) return null
  const positive = delta > 0
  return (
    <div className="mt-1 inline-flex items-center gap-2 text-[11px]">
      <span
        className={cn(
          "rounded-full px-2 py-0.5 font-semibold",
          positive
            ? "bg-emerald-100 text-emerald-700"
            : "bg-rose-100 text-rose-700",
        )}
      >
        Δ {positive ? "+" : ""}
        {delta.toFixed(2)}
      </span>
      <span className="text-slate-500">
        {accountLabel}: {fmtMoney(currentBalance)} →{" "}
        <span
          className={cn(
            projectedBalance < 0 ? "text-rose-700" : "text-slate-700",
          )}
        >
          {fmtMoney(projectedBalance)}
        </span>
      </span>
    </div>
  )
}
