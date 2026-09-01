"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { listKycQueue, type KycQueueItem } from "@/lib/admin/api/queue.real"
import { peekSocket, getSocket } from "@/lib/realtime/socket"
import { cn } from "@/lib/utils"

type Filter = KycQueueItem["status"] | "all"

const STATUS_FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "in_review", label: "In review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
]

/**
 * KYC review queue. Calls `GET /admin/kyc/queue` with status / from / to
 * query params so Approved and Rejected tabs aren't empty. Refetches
 * whenever the filter changes and on `admin.queue.changed` so new
 * submissions surface in real time.
 */
export default function KycQueuePage() {
  const [rows, setRows] = useState<KycQueueItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>("pending")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const refresh = useCallback(() => {
    // Translate UI date inputs ("yyyy-mm-dd") into ISO timestamps so the
    // backend can range-filter `submittedAt`. `to` is bumped to the end
    // of the day so a same-day submission still lands in the range.
    const fromIso = from ? new Date(`${from}T00:00:00`).toISOString() : undefined
    const toIso = to
      ? (() => {
          const d = new Date(`${to}T23:59:59.999`)
          return d.toISOString()
        })()
      : undefined
    listKycQueue({
      limit: 200,
      statuses:
        filter === "all"
          ? undefined
          : ([filter] as Array<KycQueueItem["status"]>),
      from: fromIso,
      to: toIso,
    })
      .then((r) => {
        setRows(r)
        setError(null)
      })
      .catch(() => setError("Couldn't load KYC submissions."))
  }, [filter, from, to])

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

  const filtered = useMemo(() => {
    if (rows === null) return []
    return [...rows].sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1
      if (b.status === "pending" && a.status !== "pending") return 1
      return (
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      )
    })
  }, [rows])

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            KYC review
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows === null
              ? "Loading…"
              : `${filtered.length} submission${
                  filtered.length === 1 ? "" : "s"
                } match the current filter.`}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex rounded-lg bg-white p-1 ring-1 ring-slate-200">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                filter === f.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <DateInput label="From" value={from} onChange={setFrom} />
        <DateInput label="To" value={to} onChange={setTo} />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-2.5 font-medium">Submitted</th>
              <th className="px-4 py-2.5 font-medium">User</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows !== null &&
              filtered.map((k) => {
                const name =
                  [k.user.firstName, k.user.lastName]
                    .filter(Boolean)
                    .join(" ")
                    .trim() || k.user.email
                return (
                  <tr
                    key={k.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-2.5 text-slate-700">
                      {formatDistanceToNow(new Date(k.submittedAt), {
                        addSuffix: true,
                      })}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-900">{name}</div>
                      <div className="text-xs text-slate-500">
                        {k.user.email}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={k.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/admin/kyc/${k.userId}`}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                )
              })}
            {rows !== null && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Nothing matches that filter.
                </td>
              </tr>
            )}
            {rows === null && !error && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Loading…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-500">
      {label}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
      />
    </label>
  )
}

export function StatusBadge({ status }: { status: KycQueueItem["status"] }) {
  const map: Record<KycQueueItem["status"], { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
    in_review: { label: "In review", cls: "bg-sky-100 text-sky-700" },
    approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "Rejected", cls: "bg-rose-100 text-rose-700" },
  }
  const m = map[status]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
        m.cls,
      )}
    >
      {m.label}
    </span>
  )
}
