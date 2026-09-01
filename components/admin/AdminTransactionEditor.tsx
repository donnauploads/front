"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api/errors"
import { MoneyInput } from "@/components/ui/MoneyInput"
import {
  createAdminTransaction,
  deleteAdminTransaction,
  patchAdminTransaction,
  type AdminTxListItem,
  type AdminTxServerStatus,
  type CreateAdminTxBody,
  type PatchAdminTxBody,
} from "@/lib/admin/api/transactions.real"

type EditableStatus = Exclude<AdminTxServerStatus, "hidden">

const STATUS_OPTIONS: EditableStatus[] = [
  "pending",
  "posted",
  "declined",
  "reversed",
]

const CATEGORY_OPTIONS = [
  "groceries",
  "dining",
  "transport",
  "entertainment",
  "shopping",
  "bills",
  "health",
  "travel",
  "utilities",
  "transfer",
  "income",
  "other",
]

export type EditorMode =
  | { kind: "create"; accountId: string }
  | { kind: "edit"; txn: AdminTxListItem }

/**
 * Modal used for both creating a new transaction and editing an existing
 * one. The `mode` shape decides which endpoint runs on submit; the form
 * fields are identical (amount, date/time, description, category, status).
 *
 * Edit mode pre-fills from the effective (override-applied) values so the
 * admin is editing what the customer sees, not the original raw row.
 */
export function AdminTransactionEditor({
  mode,
  open,
  onClose,
  onSaved,
}: {
  mode: EditorMode | null
  open: boolean
  onClose: () => void
  onSaved: (txn: AdminTxListItem) => void
}) {
  const isEdit = mode?.kind === "edit"

  const [amountStr, setAmountStr] = useState("")
  const [occurredAt, setOccurredAt] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("other")
  const [status, setStatus] = useState<EditableStatus>("posted")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Seed the form whenever we switch what we're editing / creating. The
  // dollar amount is stored as a string so the input doesn't clobber the
  // user's typing (cents → dollars formatting).
  useEffect(() => {
    if (!mode) return
    setError(null)
    setReason("")
    if (mode.kind === "create") {
      setAmountStr("")
      setOccurredAt(toDateTimeInput(new Date()))
      setDescription("")
      setCategory("other")
      setStatus("posted")
    } else {
      const eff = mode.txn.effective
      const dollars = Number(BigInt(eff.amountCents)) / 100
      setAmountStr(dollars.toFixed(2))
      setOccurredAt(toDateTimeInput(new Date(eff.occurredAt)))
      setDescription(eff.description)
      setCategory(eff.category)
      setStatus(
        eff.status === "hidden" ? "posted" : (eff.status as EditableStatus),
      )
    }
  }, [mode])

  async function submit() {
    if (!mode) return
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      setError("Add a short reason, it's recorded in the audit log.")
      return
    }
    const amount = Number(amountStr)
    if (!Number.isFinite(amount) || amount === 0) {
      setError("Amount must be a non-zero number.")
      return
    }
    const occurred = new Date(occurredAt)
    if (Number.isNaN(occurred.getTime())) {
      setError("Pick a valid date / time.")
      return
    }
    const amountCents = String(Math.round(amount * 100))

    setBusy(true)
    setError(null)
    try {
      if (mode.kind === "create") {
        const body: CreateAdminTxBody = {
          accountId: mode.accountId,
          amountCents,
          occurredAt: occurred.toISOString(),
          description: description.trim() || "Manual adjustment",
          category,
          status,
          reason: trimmedReason,
        }
        const fresh = await createAdminTransaction(body)
        onSaved(fresh as AdminTxListItem)
      } else {
        const body: PatchAdminTxBody = {
          amountCents,
          occurredAt: occurred.toISOString(),
          description: description.trim() || "Manual adjustment",
          category,
          status,
          reason: trimmedReason,
        }
        const fresh = await patchAdminTransaction(mode.txn.id, body)
        onSaved(fresh as AdminTxListItem)
      }
      onClose()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Couldn't save changes.")
      } else {
        setError("Network error, try again.")
      }
    } finally {
      setBusy(false)
    }
  }

  if (!open || !mode) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />
      <div className="relative w-full max-w-lg rounded-t-2xl border border-slate-200 bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            {isEdit ? "Edit transaction" : "Create transaction"}
          </h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Amount (USD)">
            <MoneyInput
              value={amountStr}
              onChange={setAmountStr}
              placeholder="-12.50"
              className={cn(fieldCls, "font-mono")}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Negative = outflow, positive = inflow.
            </p>
          </Field>
          <Field label="Date / time">
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className={fieldCls}
            />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Whole Foods"
              className={fieldCls}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              For transfers, write{" "}
              <span className="font-mono text-slate-600">
                Transfer to JANE DOE
              </span>{" "}
              or{" "}
              <span className="font-mono text-slate-600">From JOHN DOE</span>{" "}
the customer feed splits the prefix from the name automatically.
            </p>
          </Field>
          <Field label="Counterparty name" className="sm:col-span-2">
            <input
              placeholder="Jane Doe, fills the recipient/sender name"
              onChange={(e) => {
                const name = e.target.value.trim()
                if (!name) return
                // Outflow (negative or unset) → "Transfer to NAME";
                // inflow (positive) → "From NAME". Matches parseTitle().
                const isInflow = Number(amountStr) > 0
                setDescription(
                  isInflow ? `From ${name}` : `Transfer to ${name}`,
                )
              }}
              className={fieldCls}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Quick fill: typing here overwrites Description with the right
              prefix based on whether the amount is positive (inflow) or
              negative (outflow).
            </p>
          </Field>
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={fieldCls}
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
              onChange={(e) => setStatus(e.target.value as EditableStatus)}
              className={fieldCls}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Reason (audit log)" className="sm:col-span-2">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this changing?"
              className={fieldCls}
            />
          </Field>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
            {isEdit ? "Save changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminTransactionDeleteConfirm({
  txn,
  open,
  onClose,
  onDeleted,
}: {
  txn: AdminTxListItem | null
  open: boolean
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setReason("")
      setError(null)
    }
  }, [open])

  if (!open || !txn) return null

  async function run() {
    const r = reason.trim()
    if (!r) {
      setError("Add a short reason, it's recorded in the audit log.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await deleteAdminTransaction(txn!.id, r)
      onDeleted(txn!.id)
      onClose()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Delete failed.")
      } else {
        setError("Network error, try again.")
      }
    } finally {
      setBusy(false)
    }
  }

  const dollars = Number(BigInt(txn.effective.amountCents)) / 100

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />
      <div className="relative w-full max-w-md rounded-t-2xl border border-slate-200 bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900">
              Delete transaction?
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {txn.effective.description} ·{" "}
              <span className="font-mono">
                {dollars.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              The account balance reverses by the effective amount. Ledger
              postings are preserved as audit trail.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-4">
          <Field label="Reason (audit log)">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why?"
              className={fieldCls}
            />
          </Field>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void run()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Small helpers ───────────────────────────────────────────────────────

const fieldCls =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn("block", className)}>
      <span className="block text-[11px] uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

/** Convert a Date to the value format expected by <input type="datetime-local">.
 *  Uses local time, since that's what the user sees. */
function toDateTimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
