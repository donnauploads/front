"use client"

import { useEffect, useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { ChevronDown, Loader2, ScrollText, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { listAuditLogs, type AuditLogEntry } from "@/lib/admin/api/audit.real"

/**
 * Admin audit trail. Read-only list of every audited admin action
 * (approvals, role changes, transfer decisions, etc.) from /admin/audit.
 * Responsive: stacked cards on small screens, a table on md+.
 */
export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")

  useEffect(() => {
    setLoading(true)
    listAuditLogs({ limit: 300 })
      .then(setRows)
      .catch(() => setError("Couldn't load the audit log."))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) =>
      [r.action, r.targetType, r.targetId, r.actor.name, r.actor.email]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    )
  }, [rows, q])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-slate-700" />
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Audit Log</h1>
            <p className="mt-0.5 text-sm text-slate-500">{rows.length} recorded actions</p>
          </div>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search action, target, actor…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-rose-600">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">No audit entries.</p>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-2.5 md:hidden">
            {filtered.map((r) => (
              <AuditCard key={r.id} row={r} />
            ))}
          </div>

          {/* md+: table */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5 font-semibold">Time</th>
                    <th className="px-4 py-2.5 font-semibold">Actor</th>
                    <th className="px-4 py-2.5 font-semibold">Action</th>
                    <th className="px-4 py-2.5 font-semibold">Target</th>
                    <th className="px-4 py-2.5 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <AuditRow key={r.id} row={r} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function fmtTime(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

function hasMeta(m: Record<string, unknown>) {
  return m && Object.keys(m).length > 0
}

function AuditRow({ row }: { row: AuditLogEntry }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
        <td className="whitespace-nowrap px-4 py-3 text-slate-500" title={new Date(row.createdAt).toLocaleString()}>
          {fmtTime(row.createdAt)}
        </td>
        <td className="px-4 py-3">
          <div className="font-medium text-slate-800">{row.actor.name}</div>
          <div className="text-xs text-slate-400">{row.actor.email}</div>
        </td>
        <td className="px-4 py-3">
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">{row.action}</code>
        </td>
        <td className="px-4 py-3">
          <span className="text-slate-600">{row.targetType}</span>
          <span className="block font-mono text-xs text-slate-400">{row.targetId}</span>
        </td>
        <td className="px-4 py-3">
          {hasMeta(row.metadata) ? (
            <button
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              {open ? "Hide" : "View"}
              <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
            </button>
          ) : (
            <span className="text-xs text-slate-300">—</span>
          )}
        </td>
      </tr>
      {open && hasMeta(row.metadata) && (
        <tr className="bg-slate-50/70">
          <td colSpan={5} className="px-4 py-3">
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(row.metadata, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  )
}

function AuditCard({ row }: { row: AuditLogEntry }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-start justify-between gap-2">
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">{row.action}</code>
        <span className="flex-shrink-0 text-[11px] text-slate-400" title={new Date(row.createdAt).toLocaleString()}>
          {fmtTime(row.createdAt)}
        </span>
      </div>
      <div className="mt-2 text-sm text-slate-700">
        <span className="text-slate-400">by </span>
        {row.actor.name}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {row.targetType} · <span className="font-mono">{row.targetId}</span>
      </div>
      {hasMeta(row.metadata) && (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500"
          >
            {open ? "Hide details" : "View details"}
            <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
          </button>
          {open && (
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[11px] text-slate-100">
              {JSON.stringify(row.metadata, null, 2)}
            </pre>
          )}
        </>
      )}
    </div>
  )
}
