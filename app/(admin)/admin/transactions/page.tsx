"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Loader2, Pencil, Search, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  centsToDollars,
  listAdminTransactions,
  type AdminTxListItem,
  type AdminTxServerStatus,
  type ListAdminTxQuery,
} from "@/lib/admin/api/transactions.real"
import {
  AdminTransactionDeleteConfirm,
  AdminTransactionEditor,
  type EditorMode,
} from "@/components/admin/AdminTransactionEditor"
import { peekSocket, getSocket } from "@/lib/realtime/socket"

const STATUS_OPTIONS: { id: AdminTxServerStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "posted", label: "Posted" },
  { id: "pending", label: "Pending" },
  { id: "declined", label: "Declined" },
  { id: "reversed", label: "Reversed" },
  { id: "hidden", label: "Hidden" },
]

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 350

/**
 * Admin transactions — full live list against /admin/transactions.
 *
 * Layout: a single horizontally-scrollable table on md+ widths and a
 * vertical card stack on narrower screens. Filters are real query params
 * on the backend (status is post-filtered client-side because the API
 * doesn't accept a status param yet). Cursor-paginated, with a socket
 * subscription to `transaction.updated` so rows reflect overrides /
 * hides as they happen without a refetch.
 */
export default function AdminTransactionsPage() {
  const [items, setItems] = useState<AdminTxListItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<AdminTxServerStatus | "all">(
    "all",
  )
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Editor + delete modal state.
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [toDelete, setToDelete] = useState<AdminTxListItem | null>(null)

  // Debounce the name search so we don't refetch on every keystroke. The
  // backend's `userId` param accepts a UUID, so until we wire a search
  // endpoint we filter client-side by the user's name in the loaded rows.
  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedSearch(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    )
    return () => clearTimeout(t)
  }, [searchInput])

  // Convert filter state into the API query (date range only). Wrap in
  // useMemo so the fetch effect doesn't re-run on unrelated re-renders.
  const baseQuery: ListAdminTxQuery = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      limit: PAGE_SIZE,
    }),
    [from, to],
  )

  // ─── Fetching ────────────────────────────────────────────────────────
  const fetchSeqRef = useRef(0)

  const loadFirstPage = useCallback(async () => {
    const seq = ++fetchSeqRef.current
    setLoading(true)
    setError(null)
    try {
      const res = await listAdminTransactions(baseQuery)
      if (fetchSeqRef.current !== seq) return
      setItems(res.items)
      setNextCursor(res.nextCursor)
    } catch (err) {
      if (fetchSeqRef.current !== seq) return
      setError(
        err instanceof Error
          ? err.message || "Couldn't load transactions."
          : "Couldn't load transactions.",
      )
      setItems([])
      setNextCursor(null)
    } finally {
      if (fetchSeqRef.current === seq) setLoading(false)
    }
  }, [baseQuery])

  useEffect(() => {
    void loadFirstPage()
  }, [loadFirstPage])

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await listAdminTransactions({
        ...baseQuery,
        cursor: nextCursor,
      })
      setItems((prev) => [...prev, ...res.items])
      setNextCursor(res.nextCursor)
    } catch {
      // Don't surface a fatal error for pagination — the next click can retry.
    } finally {
      setLoadingMore(false)
    }
  }

  // ─── Live updates via the realtime gateway ───────────────────────────
  useEffect(() => {
    let sock = peekSocket()
    if (!sock) sock = getSocket()
    function onUpdated(payload: {
      transactionId: string
      effective: {
        amountCents: string
        occurredAt: string
        description: string
        category: string
        status: string
      } | null
      hidden: boolean
    }) {
      setItems((prev) =>
        prev.map((row) => {
          if (row.id !== payload.transactionId) return row
          // `effective: null` plus `hidden: true` means the row was hidden.
          if (payload.hidden && !payload.effective) {
            return {
              ...row,
              hidden: true,
              effective: { ...row.effective, status: "hidden" },
            }
          }
          if (!payload.effective) return row
          return {
            ...row,
            hidden: !!payload.hidden,
            effective: {
              amountCents: payload.effective.amountCents,
              occurredAt: payload.effective.occurredAt,
              description: payload.effective.description,
              category: payload.effective.category,
              status: payload.effective.status as AdminTxServerStatus,
            },
          }
        }),
      )
    }
    sock.on("transaction.updated", onUpdated)
    return () => {
      sock?.off("transaction.updated", onUpdated)
    }
  }, [])

  // Editor / delete handlers.
  function openEdit(txn: AdminTxListItem) {
    setEditorMode({ kind: "edit", txn })
    setEditorOpen(true)
  }
  function openDelete(txn: AdminTxListItem) {
    setToDelete(txn)
  }
  function onSaved(_fresh: AdminTxListItem) {
    // Edits broadcast `transaction.updated` and the socket effect below
    // already merges them into local state, so a refetch isn't required.
    setEditorOpen(false)
  }
  function onDeleted(id: string) {
    setItems((prev) => prev.filter((r) => r.id !== id))
  }

  // ─── Display filtering (status + name search, client-side) ───────────
  const visible = useMemo(() => {
    return items.filter((t) => {
      if (statusFilter !== "all" && t.effective.status !== statusFilter)
        return false
      if (debouncedSearch) {
        const needle = debouncedSearch.toLowerCase()
        const id = (t.userId ?? "").toLowerCase()
        if (!id.includes(needle)) return false
      }
      return true
    })
  }, [items, statusFilter, debouncedSearch])

  const overrideCount = useMemo(
    () => items.filter((t) => !!t.override).length,
    [items],
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="mt-1 text-sm text-slate-500">
            {items.length} loaded
            {nextCursor ? "+" : ""} · {overrideCount} with overrides
          </p>
        </div>
      </div>

      {/* Filters — wraps cleanly on mobile. */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[180px] sm:min-w-[240px]">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filter by user id…"
            aria-label="Filter by user id"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as AdminTxServerStatus | "all")
          }
          aria-label="Status"
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="From"
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="To"
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-10 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading transactions…
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          No transactions match the filter.
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards. Hidden ≥md. */}
          <ul className="space-y-2 md:hidden">
            {visible.map((t) => (
              <li key={t.id}>
                <TxCard
                  txn={t}
                  onEdit={() => openEdit(t)}
                  onDelete={() => openDelete(t)}
                />
              </li>
            ))}
          </ul>

          {/* Desktop: table. Hidden <md. The wrapper allows horizontal scroll
              for moderately narrow tablet widths without overflowing the
              admin layout's main column. */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Occurred</th>
                  <th className="px-4 py-2.5 font-medium">User</th>
                  <th className="px-4 py-2.5 font-medium">Description</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Amount
                  </th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Override?</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <TxRow
                    key={t.id}
                    txn={t}
                    onEdit={() => openEdit(t)}
                    onDelete={() => openDelete(t)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {nextCursor && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {loadingMore && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                )}
                Load more
              </button>
            </div>
          )}
        </>
      )}

      <AdminTransactionEditor
        mode={editorMode}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={onSaved}
      />
      <AdminTransactionDeleteConfirm
        txn={toDelete}
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onDeleted={onDeleted}
      />
    </div>
  )
}

// ─── Row / Card ──────────────────────────────────────────────────────────

function TxRow({
  txn,
  onEdit,
  onDelete,
}: {
  txn: AdminTxListItem
  onEdit: () => void
  onDelete: () => void
}) {
  const amount = centsToDollars(txn.effective.amountCents)
  const isCredit = amount > 0
  return (
    <tr className="border-b border-slate-100 align-top transition last:border-b-0 hover:bg-slate-50/60">
      <td className="px-4 py-2.5 text-xs text-slate-700">
        {format(new Date(txn.effective.occurredAt), "MMM d, h:mm a")}
      </td>
      <td className="px-4 py-2.5">
        <Link
          href={`/admin/users/${txn.userId}`}
          className="font-mono text-[11px] text-slate-700 hover:text-slate-900 hover:underline"
        >
          {txn.userId.slice(0, 8)}…
        </Link>
      </td>
      <td className="px-4 py-2.5 text-slate-800">
        <div className="line-clamp-1">{txn.effective.description}</div>
      </td>
      <td className="px-4 py-2.5 text-xs text-slate-600">
        {txn.effective.category}
      </td>
      <td
        className={cn(
          "px-4 py-2.5 text-right font-mono text-xs",
          isCredit ? "text-emerald-600" : "text-slate-900",
        )}
      >
        {isCredit ? "+" : ""}
        {amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}
      </td>
      <td className="px-4 py-2.5">
        <StatusPill status={txn.effective.status} hidden={txn.hidden} />
      </td>
      <td className="px-4 py-2.5">
        {txn.override ? (
          <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
            edited
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <RowActions onEdit={onEdit} onDelete={onDelete} />
      </td>
    </tr>
  )
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
      >
        <Pencil className="h-3 w-3" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50"
      >
        <Trash2 className="h-3 w-3" aria-hidden />
      </button>
    </div>
  )
}

function TxCard({
  txn,
  onEdit,
  onDelete,
}: {
  txn: AdminTxListItem
  onEdit: () => void
  onDelete: () => void
}) {
  const amount = centsToDollars(txn.effective.amountCents)
  const isCredit = amount > 0
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="line-clamp-1 text-sm font-medium text-slate-900">
            {txn.effective.description}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {format(new Date(txn.effective.occurredAt), "MMM d, h:mm a")}
          </div>
        </div>
        <div
          className={cn(
            "flex-shrink-0 text-right font-mono text-sm font-semibold",
            isCredit ? "text-emerald-600" : "text-slate-900",
          )}
        >
          {isCredit ? "+" : ""}
          {amount.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
        <StatusPill status={txn.effective.status} hidden={txn.hidden} />
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
          {txn.effective.category}
        </span>
        {txn.override && (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-700">
            edited
          </span>
        )}
        <Link
          href={`/admin/users/${txn.userId}`}
          className="ml-auto font-mono text-[10px] text-slate-500 hover:text-slate-900 hover:underline"
        >
          {txn.userId.slice(0, 8)}…
        </Link>
      </div>
      <div className="mt-2 flex justify-end">
        <RowActions onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  )
}

function StatusPill({
  status,
  hidden,
}: {
  status: AdminTxServerStatus
  hidden: boolean
}) {
  if (hidden) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
        Hidden
      </span>
    )
  }
  const map: Record<AdminTxServerStatus, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
    posted: { label: "Posted", cls: "bg-emerald-100 text-emerald-700" },
    declined: { label: "Declined", cls: "bg-rose-100 text-rose-700" },
    reversed: { label: "Reversed", cls: "bg-slate-200 text-slate-700" },
    hidden: { label: "Hidden", cls: "bg-slate-900 text-white" },
  }
  const m = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-700" }
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
