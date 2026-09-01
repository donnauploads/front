"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  centsToDollars,
  listAdminTransactions,
  type AdminTxListItem,
  type AdminTxServerStatus,
} from "@/lib/admin/api/transactions.real"
import {
  getAdminUser,
  type AdminUserAccount,
} from "@/lib/admin/api/users.real"
import {
  AdminTransactionDeleteConfirm,
  AdminTransactionEditor,
  type EditorMode,
} from "@/components/admin/AdminTransactionEditor"
import { peekSocket, getSocket } from "@/lib/realtime/socket"

const PAGE_SIZE = 20

/**
 * Admin transactions scoped to a single user. Uses the same data layer +
 * responsive layout as /admin/transactions, plus per-user account picker
 * and the create / edit / delete actions wired to the new admin endpoints.
 */
export default function UserTransactionsPage() {
  const params = useParams<{ id: string }>()
  const userId = params?.id ?? ""

  const [items, setItems] = useState<AdminTxListItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [accounts, setAccounts] = useState<AdminUserAccount[]>([])
  const [accountId, setAccountId] = useState<string>("")

  const [editorMode, setEditorMode] = useState<EditorMode | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [toDelete, setToDelete] = useState<AdminTxListItem | null>(null)

  const fetchSeqRef = useRef(0)
  const loadFirstPage = useCallback(async () => {
    if (!userId) return
    const seq = ++fetchSeqRef.current
    setLoading(true)
    setError(null)
    try {
      const [txRes, userRes] = await Promise.all([
        listAdminTransactions({ userId, limit: PAGE_SIZE }),
        getAdminUser(userId).catch(() => null),
      ])
      if (fetchSeqRef.current !== seq) return
      setItems(txRes.items)
      setNextCursor(txRes.nextCursor)
      if (userRes) {
        setAccounts(userRes.accounts)
        if (userRes.accounts.length > 0 && !accountId) {
          setAccountId(userRes.accounts[0]!.id)
        }
      }
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
  }, [userId, accountId])

  useEffect(() => {
    void loadFirstPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function loadMore() {
    if (!nextCursor || loadingMore || !userId) return
    setLoadingMore(true)
    try {
      const res = await listAdminTransactions({
        userId,
        cursor: nextCursor,
        limit: PAGE_SIZE,
      })
      setItems((prev) => [...prev, ...res.items])
      setNextCursor(res.nextCursor)
    } catch {
      /* swallow — next click retries */
    } finally {
      setLoadingMore(false)
    }
  }

  // Live updates — overrides/hides/creates applied elsewhere flow in.
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
      setItems((prev) => {
        // effective:null + hidden:true is the gateway's "row is gone" wire.
        if (payload.hidden && !payload.effective) {
          return prev.filter((row) => row.id !== payload.transactionId)
        }
        return prev.map((row) => {
          if (row.id !== payload.transactionId) return row
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
        })
      })
    }
    sock.on("transaction.updated", onUpdated)
    return () => {
      sock?.off("transaction.updated", onUpdated)
    }
  }, [])

  function openCreate() {
    if (!accountId) return
    setEditorMode({ kind: "create", accountId })
    setEditorOpen(true)
  }
  function openEdit(txn: AdminTxListItem) {
    setEditorMode({ kind: "edit", txn })
    setEditorOpen(true)
  }
  function openDelete(txn: AdminTxListItem) {
    setToDelete(txn)
  }

  function onSaved(fresh: AdminTxListItem) {
    // Create returns a freshly-flattened row; edit returns just the
    // effective fields. We normalize by re-fetching the first page, which
    // keeps cursors honest if the new row pushes one off the end.
    void loadFirstPage()
  }
  function onDeleted(id: string) {
    setItems((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="space-y-5">
      <Link
        href={`/admin/users/${userId}`}
        className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to user
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="mt-1 text-sm text-slate-500">
            {items.length}
            {nextCursor ? "+" : ""} loaded for this user.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {accounts.length > 0 && (
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wider text-slate-500">
                Account
              </span>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1 h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label || a.type}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={openCreate}
            disabled={!accountId}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> New transaction
          </button>
        </div>
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
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          No transactions for this user.
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {items.map((t) => (
              <li key={t.id}>
                <TxCard
                  txn={t}
                  onEdit={() => openEdit(t)}
                  onDelete={() => openDelete(t)}
                />
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Occurred</th>
                  <th className="px-4 py-2.5 font-medium">Description</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Override?</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
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
        <div className="ml-auto">
          <RowActions onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
    </div>
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
