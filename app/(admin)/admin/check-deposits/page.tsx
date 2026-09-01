"use client"

import { useCallback, useEffect, useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { Check, Loader2, ScanLine, X } from "lucide-react"
import { ApiError } from "@/lib/api/errors"
import { useToast } from "@/components/providers/ToastProvider"
import {
  approveCheckDeposit,
  listAdminCheckDeposits,
  rejectCheckDeposit,
  type AdminCheckDepositRow,
  type CheckDepositStatusFilter,
} from "@/lib/admin/api/check-deposits.real"
import { cn } from "@/lib/utils"

const STATUS_TABS: { id: CheckDepositStatusFilter; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
]

/**
 * Admin queue for mobile check deposits. Pending rows show both image
 * sides with approve / reject buttons. Approve credits the user's
 * checking and posts a Transaction; reject requires a typed reason.
 */
export default function AdminCheckDepositsPage() {
  const [filter, setFilter] = useState<CheckDepositStatusFilter>("pending")
  const [rows, setRows] = useState<AdminCheckDepositRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectFor, setRejectFor] = useState<AdminCheckDepositRow | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listAdminCheckDeposits(filter)
      setRows(data)
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message || "Couldn't load deposits."
          : "Couldn't load deposits.",
      )
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  async function onApprove(row: AdminCheckDepositRow) {
    if (busyId) return
    setBusyId(row.id)
    try {
      await approveCheckDeposit(row.id)
      toast(`Credited ${money(row.amountCents)} to ${row.customerName}.`, {
        variant: "success",
        duration: 2200,
      })
      // Optimistic — drop the row from pending view.
      setRows((prev) => prev.filter((r) => r.id !== row.id))
    } catch (e) {
      toast(
        e instanceof ApiError
          ? e.message || "Approve failed."
          : "Approve failed.",
        { variant: "error" },
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Check deposits</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review and credit customer-submitted mobile check deposits.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition",
              filter === t.id
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-10 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading deposits…
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
          <ScanLine className="h-6 w-6 text-slate-400" aria-hidden />
          <div className="text-sm text-slate-600">
            {filter === "pending"
              ? "No deposits waiting for review."
              : `No ${filter} deposits.`}
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <DepositCard
                row={row}
                busy={busyId === row.id}
                onApprove={() => void onApprove(row)}
                onReject={() => setRejectFor(row)}
              />
            </li>
          ))}
        </ul>
      )}

      {rejectFor && (
        <RejectModal
          row={rejectFor}
          onClose={() => setRejectFor(null)}
          onDone={() => {
            setRows((prev) => prev.filter((r) => r.id !== rejectFor.id))
            setRejectFor(null)
          }}
        />
      )}
    </div>
  )
}

function DepositCard({
  row,
  busy,
  onApprove,
  onReject,
}: {
  row: AdminCheckDepositRow
  busy: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const submitted = new Date(row.submittedAt)
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-slate-900">
              {row.customerName}
            </div>
            <span
              className="rounded-full bg-slate-900/90 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-white"
              title="Reference number — matches the one shown to the customer on submit"
            >
              {row.reference}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            {row.customerEmail ?? row.customerNovaTag ?? row.userId}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Submitted{" "}
            {formatDistanceToNow(submitted, { addSuffix: true })}{" "}
            ·{" "}
            {format(submitted, "MMM d, h:mm a")}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xl font-bold text-emerald-600">
            +{money(row.amountCents)}
          </div>
          <StatusPill status={row.status} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ImagePane label="Front" url={row.frontUrl} />
        <ImagePane label="Back" url={row.backUrl} />
      </div>

      {row.status === "pending" && (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" aria-hidden /> Reject
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden />
            )}
            Approve & credit
          </button>
        </div>
      )}

      {row.status === "rejected" && row.decisionReason && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          Reason: {row.decisionReason}
        </div>
      )}
    </div>
  )
}

function ImagePane({
  label,
  url,
}: {
  label: string
  url: string | null
}) {
  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
      aria-label={`${label} side, open full size`}
    >
      <div className="aspect-[16/9] bg-slate-100">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`${label} of check`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            Image unavailable
          </div>
        )}
      </div>
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
    </a>
  )
}

function StatusPill({
  status,
}: {
  status: AdminCheckDepositRow["status"]
}) {
  const map: Record<
    AdminCheckDepositRow["status"],
    { label: string; cls: string }
  > = {
    pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
    approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "Rejected", cls: "bg-rose-100 text-rose-700" },
  }
  const m = map[status]
  return (
    <span
      className={cn(
        "mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
        m.cls,
      )}
    >
      {m.label}
    </span>
  )
}

function RejectModal({
  row,
  onClose,
  onDone,
}: {
  row: AdminCheckDepositRow
  onClose: () => void
  onDone: () => void
}) {
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  async function submit() {
    const r = reason.trim()
    if (!r) {
      setError("Add a short reason — it's recorded with the rejection.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await rejectCheckDeposit(row.id, r)
      toast("Deposit rejected.", { variant: "success", duration: 1800 })
      onDone()
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message || "Reject failed." : "Reject failed.",
      )
    } finally {
      setBusy(false)
    }
  }

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
        <h3 className="text-sm font-bold text-slate-900">
          Reject this deposit?
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          {row.customerName} · {money(row.amountCents)}
        </p>
        <label className="mt-3 block">
          <span className="block text-[11px] uppercase tracking-wider text-slate-500">
            Reason (sent to audit log)
          </span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="E.g. Image unreadable; ask customer to retry"
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </label>
        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

function money(cents: string): string {
  return (Number(BigInt(cents)) / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  })
}
