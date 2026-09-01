"use client"

import { useCallback, useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { ArrowRight, Check, ShieldAlert, X } from "lucide-react"
import {
  decideTransfer,
  listTransferReviewQueue,
  type TransferReviewItem,
} from "@/lib/admin/api/queue.real"
import { peekSocket, getSocket } from "@/lib/realtime/socket"
import { cn } from "@/lib/utils"

/**
 * Admin transfer review queue. Lists every outbound transfer that hit
 * the review threshold and is still awaiting a decision. Each row has
 * inline approve / reject buttons — rejecting prompts for a reason
 * which the backend stores in the audit log and uses as the customer-
 * facing failure reason.
 *
 * The list refetches itself whenever the realtime gateway broadcasts
 * `admin.queue.changed` (every initiate/approve/reject emits one), so
 * concurrent admin actions stay in sync without polling.
 */
export default function TransferReviewPage() {
  const [items, setItems] = useState<TransferReviewItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectFor, setRejectFor] = useState<TransferReviewItem | null>(null)

  const refresh = useCallback(() => {
    listTransferReviewQueue(100)
      .then((r) => {
        setItems(r.items)
        setError(null)
      })
      .catch(() => setError("Couldn't load the review queue."))
  }, [])

  useEffect(() => {
    refresh()
    let sock = peekSocket()
    if (!sock) sock = getSocket()
    const onChange = () => refresh()
    sock.on("admin.queue.changed", onChange)
    return () => {
      sock?.off("admin.queue.changed", onChange)
    }
  }, [refresh])

  async function approve(row: TransferReviewItem) {
    if (busyId) return
    setBusyId(row.id)
    try {
      await decideTransfer(row.id, "approved")
      // Drop the row optimistically; the WS event will reconcile.
      setItems((prev) => prev?.filter((r) => r.id !== row.id) ?? null)
    } catch {
      setError("Approve failed. Try again.")
    } finally {
      setBusyId(null)
    }
  }

  async function reject(row: TransferReviewItem, reason: string) {
    if (busyId || !reason.trim()) return
    setBusyId(row.id)
    try {
      await decideTransfer(row.id, "rejected", reason.trim())
      setItems((prev) => prev?.filter((r) => r.id !== row.id) ?? null)
      setRejectFor(null)
    } catch {
      setError("Reject failed. Try again.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Transfers awaiting review
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Outbound transfers above the threshold are held until an admin
            decides. {items?.length ?? 0}{" "}
            {items?.length === 1 ? "item" : "items"} pending.
          </p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-600">
          <ShieldAlert className="h-5 w-5" aria-hidden />
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      {items === null && !error && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          Loading…
        </div>
      )}
      {items !== null && items.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          Nothing to review. New holds will appear here in real time.
        </div>
      )}
      {items !== null && items.length > 0 && (
        <>
          {/* Mobile: stacked cards. Hidden ≥md. */}
          <ul className="space-y-2 md:hidden">
            {items.map((row) => (
              <li key={row.id}>
                <ReviewCard
                  row={row}
                  busy={busyId === row.id}
                  onApprove={() => approve(row)}
                  onReject={() => setRejectFor(row)}
                />
              </li>
            ))}
          </ul>

          {/* Desktop: table inside an overflow-x-auto so it scrolls
              horizontally rather than overflowing the layout. */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Submitted</th>
                  <th className="px-4 py-2.5 font-medium">From</th>
                  <th className="px-2 py-2.5 font-medium"></th>
                  <th className="px-4 py-2.5 font-medium">To</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-4 py-2.5 text-center font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
            <tbody>
              {items.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 transition hover:bg-slate-50/60"
                >
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDistanceToNow(new Date(row.initiatedAt), {
                      addSuffix: true,
                    })}
                    <div className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono uppercase text-slate-600">
                      {row.kind}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <PartyCell
                      name={row.sender?.name}
                      sub={
                        row.sender?.novaTag ??
                        row.sender?.email ??
                        row.fromAccount?.label ??
                        "—"
                      }
                      mask={row.fromAccount?.mask}
                    />
                  </td>
                  <td className="px-2 py-3 text-slate-300">
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <PartyCell
                      name={row.recipient?.name ?? row.toAccount?.label}
                      sub={
                        row.recipient?.novaTag ??
                        row.recipient?.email ??
                        row.toAccount?.label ??
                        "External"
                      }
                      mask={row.toAccount?.mask}
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-slate-900 tabular-nums">
                    {formatCents(row.amountCents)}
                    {row.feeCents !== "0" && (
                      <div className="text-[10px] font-normal text-slate-400">
                        +{formatCents(row.feeCents)} fee
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => approve(row)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                          busyId === row.id
                            ? "bg-emerald-100 text-emerald-400"
                            : "bg-emerald-600 text-white hover:bg-emerald-700",
                        )}
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => setRejectFor(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      {rejectFor && (
        <RejectModal
          row={rejectFor}
          onClose={() => setRejectFor(null)}
          onSubmit={(reason) => reject(rejectFor, reason)}
          busy={busyId === rejectFor.id}
        />
      )}
    </div>
  )
}

function PartyCell({
  name,
  sub,
  mask,
}: {
  name?: string | null
  sub?: string | null
  mask?: string | null
}) {
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium text-slate-900">
        {name || "Unknown"}
      </div>
      <div className="truncate text-[11px] text-slate-500">
        {sub}
        {mask ? ` · ••${mask}` : ""}
      </div>
    </div>
  )
}

function ReviewCard({
  row,
  busy,
  onApprove,
  onReject,
}: {
  row: TransferReviewItem
  busy: boolean
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2 text-[11px] text-slate-500">
        <span>
          {formatDistanceToNow(new Date(row.initiatedAt), { addSuffix: true })}
        </span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono uppercase text-slate-600">
          {row.kind}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <PartyCell
          name={row.sender?.name}
          sub={
            row.sender?.novaTag ??
            row.sender?.email ??
            row.fromAccount?.label ??
            "—"
          }
          mask={row.fromAccount?.mask}
        />
        <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-300" aria-hidden />
        <PartyCell
          name={row.recipient?.name ?? row.toAccount?.label}
          sub={
            row.recipient?.novaTag ??
            row.recipient?.email ??
            row.toAccount?.label ??
            "External"
          }
          mask={row.toAccount?.mask}
        />
      </div>

      <div className="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-3">
        <span className="text-[11px] uppercase tracking-wider text-slate-500">
          Amount
        </span>
        <span className="text-right">
          <span className="block font-mono text-base font-semibold text-slate-900 tabular-nums">
            {formatCents(row.amountCents)}
          </span>
          {row.feeCents !== "0" && (
            <span className="text-[10px] text-slate-400">
              +{formatCents(row.feeCents)} fee
            </span>
          )}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onApprove}
          className={cn(
            "inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition",
            busy
              ? "bg-emerald-100 text-emerald-400"
              : "bg-emerald-600 text-white hover:bg-emerald-700",
          )}
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Reject
        </button>
      </div>
    </div>
  )
}

function RejectModal({
  row,
  onClose,
  onSubmit,
  busy,
}: {
  row: TransferReviewItem
  onClose: () => void
  onSubmit: (reason: string) => void
  busy: boolean
}) {
  const [reason, setReason] = useState("")
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">
          Reject this transfer?
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {formatCents(row.amountCents)} from {row.sender?.name ?? "user"} —
          the sender's account will be credited back and they'll be notified.
        </p>
        <label className="mt-4 block text-xs font-semibold text-slate-700">
          Reason (required)
        </label>
        <textarea
          autoFocus
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="E.g. AML review, duplicate request, suspected fraud…"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-rose-400 focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(reason)}
            disabled={busy || !reason.trim()}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {busy ? "Rejecting…" : "Reject + refund"}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatCents(cents: string): string {
  const dollars = Number(cents) / 100
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
