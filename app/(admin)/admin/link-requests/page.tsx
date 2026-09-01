"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Clock, Loader2, ShieldAlert, Trash2, X } from "lucide-react"
import { useToast } from "@/components/providers/ToastProvider"
import { ApiError } from "@/lib/api/errors"
import {
  approveLinkRequest,
  deleteLinkRequest,
  listPendingLinkRequests,
  rejectLinkRequest,
  type PendingLinkRequest,
} from "@/lib/move/api/link-auth.real"

const POLL_MS = 15_000

export default function LinkRequestsPage() {
  const [rows, setRows] = useState<PendingLinkRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const { toast } = useToast()

  const refresh = useCallback(async () => {
    try {
      const data = await listPendingLinkRequests()
      setRows(data)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load requests.")
    }
  }, [])

  useEffect(() => {
    void refresh()
    const t = setInterval(() => void refresh(), POLL_MS)
    return () => clearInterval(t)
  }, [refresh])

  async function onApprove(id: string) {
    setBusyId(id)
    try {
      await approveLinkRequest(id)
      toast("Approved — customer notified.", { variant: "success" })
      await refresh()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Approve failed.", { variant: "error" })
    } finally {
      setBusyId(null)
    }
  }

  async function onDelete(id: string, label: string) {
    if (!confirm(`Permanently delete the ${label} request? This can't be undone.`)) {
      return
    }
    setBusyId(id)
    // Optimistic remove — the realtime push to the customer happens
    // server-side, so they update without waiting on our refetch.
    const snapshot = rows
    setRows((prev) => prev?.filter((r) => r.id !== id) ?? null)
    try {
      await deleteLinkRequest(id)
      toast("Request deleted.", { variant: "success" })
    } catch (e) {
      setRows(snapshot)
      toast(e instanceof ApiError ? e.message : "Delete failed.", {
        variant: "error",
      })
    } finally {
      setBusyId(null)
    }
  }

  async function onReject() {
    if (!rejectingId || !reason.trim()) return
    setBusyId(rejectingId)
    try {
      await rejectLinkRequest(rejectingId, reason.trim())
      toast("Rejected — customer notified.", { variant: "info" })
      setRejectingId(null)
      setReason("")
      await refresh()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Reject failed.", { variant: "error" })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Linked-account requests
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Bank credentials customers submitted via the linking flow. Approve
          only after verifying the creds offline — the row is created with
          full transfer privileges.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white">
        {rows == null ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No pending link requests.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => {
              const awaiting = r.status === "awaiting_otp"
              const verified = r.status === "awaiting_approval"
              return (
                <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {r.institutionName}
                      </div>
                      {awaiting ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          <Clock className="h-3 w-3" aria-hidden /> Awaiting OTP
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          <ShieldAlert className="h-3 w-3" aria-hidden /> Verified
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {r.customer ? (
                        <>
                          <span className="font-medium text-slate-700">
                            {r.customer.name}
                          </span>{" "}
                          · {r.customer.email}
                        </>
                      ) : (
                        <span className="text-slate-400">user removed</span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      Submitted {new Date(r.createdAt).toLocaleString()}
                      {r.otpEmail ? ` · OTP sent to ${r.otpEmail}` : ""}
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                      type="button"
                      disabled={!verified || busyId === r.id}
                      onClick={() => onApprove(r.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {busyId === r.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      )}
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => {
                        setRejectingId(r.id)
                        setReason("")
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => onDelete(r.id, r.institutionName)}
                      aria-label="Delete request"
                      title="Delete request"
                      className="inline-flex items-center justify-center rounded-lg bg-slate-100 p-1.5 text-slate-600 transition hover:bg-rose-100 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyId === r.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {rejectingId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
        >
          <button
            aria-label="Cancel"
            onClick={() => setRejectingId(null)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative w-full max-w-md rounded-t-3xl bg-white p-5 ring-1 ring-slate-200 sm:rounded-2xl sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Reject request</h2>
            <p className="mt-1 text-sm text-slate-500">
              The customer will receive an email with this reason. They can
              re-submit the request.
            </p>
            <label className="mt-4 block">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Reason
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={280}
                placeholder="E.g. We couldn't verify the credentials with this institution."
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reason.trim() || busyId === rejectingId}
                onClick={onReject}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyId === rejectingId ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
