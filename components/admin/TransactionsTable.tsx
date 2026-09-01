"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { Pencil } from "lucide-react"
import { useStore } from "@/lib/store"
import type { AdminTxStatus } from "@/lib/store"
import { applyOverride, type EffectiveTx } from "@/lib/admin/api/transactions"
import { cn } from "@/lib/utils"
import { useIsAtLeast } from "./RoleGate"
import { TransactionEditSheet } from "./TransactionEditSheet"
import { BulkShiftBar } from "./BulkShiftBar"

type SortKey = "occurredAt" | "amount" | "userName"
type SortDir = "asc" | "desc"

const STATUS_OPTIONS: { id: AdminTxStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "settled", label: "Settled" },
  { id: "pending", label: "Pending" },
  { id: "declined", label: "Declined" },
  { id: "reversed", label: "Reversed" },
  { id: "hidden", label: "Hidden" },
]

export function TransactionsTable({ userId }: { userId?: string }) {
  const allTxns = useStore((s) => s.adminTxns)
  const overrides = useStore((s) => s.txOverrides)
  const isSuperadmin = useIsAtLeast("superadmin")

  const [userQuery, setUserQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminTxStatus | "all">("all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [onlyOverridden, setOnlyOverridden] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>("occurredAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const rows: EffectiveTx[] = useMemo(() => {
    const base = allTxns
      .filter((t) => (userId ? t.userId === userId : true))
      .filter((t) =>
        userQuery.trim() && !userId
          ? t.userName.toLowerCase().includes(userQuery.trim().toLowerCase())
          : true,
      )
      .map((t) => applyOverride(t, overrides[t.id]))
      .filter((t) =>
        statusFilter === "all" ? true : t.effective.status === statusFilter,
      )
      .filter((t) => {
        if (from && new Date(t.effective.occurredAt) < new Date(from))
          return false
        if (to) {
          const end = new Date(to)
          end.setHours(23, 59, 59, 999)
          if (new Date(t.effective.occurredAt) > end) return false
        }
        return true
      })
      .filter((t) => (onlyOverridden ? !!t.override : true))

    base.sort((a, b) => {
      let cmp = 0
      if (sortKey === "occurredAt") {
        cmp =
          +new Date(a.effective.occurredAt) -
          +new Date(b.effective.occurredAt)
      } else if (sortKey === "amount") {
        cmp = a.effective.amount - b.effective.amount
      } else if (sortKey === "userName") {
        cmp = a.userName.localeCompare(b.userName)
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return base
  }, [
    allTxns,
    overrides,
    userId,
    userQuery,
    statusFilter,
    from,
    to,
    onlyOverridden,
    sortKey,
    sortDir,
  ])

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(k)
      setSortDir(k === "userName" ? "asc" : "desc")
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllVisible() {
    if (selected.size === rows.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(rows.map((r) => r.id)))
    }
  }

  const allChecked = rows.length > 0 && selected.size === rows.length

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        {!userId && (
          <label className="flex items-center gap-2 text-xs text-slate-500">
            User
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Search by name…"
              className="h-8 w-56 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </label>
        )}
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Status
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as AdminTxStatus | "all")
            }
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <DateInput label="From" value={from} onChange={setFrom} />
        <DateInput label="To" value={to} onChange={setTo} />
        <label className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={onlyOverridden}
            onChange={(e) => setOnlyOverridden(e.target.checked)}
            className="h-3.5 w-3.5 accent-slate-900"
          />
          Has override
        </label>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              {isSuperadmin && (
                <th className="w-9 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAllVisible}
                    aria-label="Select all visible"
                    className="h-3.5 w-3.5 accent-slate-900"
                  />
                </th>
              )}
              <Th onClick={() => toggleSort("occurredAt")} active={sortKey === "occurredAt"} dir={sortDir}>
                Occurred
              </Th>
              {!userId && (
                <Th onClick={() => toggleSort("userName")} active={sortKey === "userName"} dir={sortDir}>
                  User
                </Th>
              )}
              <th className="px-4 py-2.5 font-medium">Account</th>
              <Th onClick={() => toggleSort("amount")} active={sortKey === "amount"} dir={sortDir} right>
                Amount
              </Th>
              <th className="px-4 py-2.5 font-medium">Description</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Override?</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <Row
                key={t.id}
                txn={t}
                showUser={!userId}
                showCheckbox={isSuperadmin}
                checked={selected.has(t.id)}
                onCheck={() => toggleRow(t.id)}
                onEdit={() => setActiveId(t.id)}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={isSuperadmin ? 10 : userId ? 8 : 9}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  No transactions match the filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TransactionEditSheet
        txnId={activeId}
        onClose={() => setActiveId(null)}
      />
      {isSuperadmin && selected.size > 0 && (
        <BulkShiftBar
          ids={[...selected]}
          onDone={() => setSelected(new Set())}
        />
      )}
    </div>
  )
}

function Th({
  children,
  onClick,
  active,
  dir,
  right,
}: {
  children: React.ReactNode
  onClick: () => void
  active: boolean
  dir: SortDir
  right?: boolean
}) {
  return (
    <th
      className={cn(
        "cursor-pointer px-4 py-2.5 font-medium select-none",
        right && "text-right",
      )}
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active && (
          <span aria-hidden className="text-slate-400">
            {dir === "asc" ? "▲" : "▼"}
          </span>
        )}
      </span>
    </th>
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

function Row({
  txn,
  showUser,
  showCheckbox,
  checked,
  onCheck,
  onEdit,
}: {
  txn: EffectiveTx
  showUser: boolean
  showCheckbox: boolean
  checked: boolean
  onCheck: () => void
  onEdit: () => void
}) {
  const amount = txn.effective.amount
  const isCredit = amount > 0
  return (
    <tr className="border-b border-slate-100 align-top transition hover:bg-slate-50/60">
      {showCheckbox && (
        <td className="px-3 py-2.5">
          <input
            type="checkbox"
            checked={checked}
            onChange={onCheck}
            aria-label="Select transaction"
            className="h-3.5 w-3.5 accent-slate-900"
          />
        </td>
      )}
      <td className="px-4 py-2.5 text-xs text-slate-700">
        {format(new Date(txn.effective.occurredAt), "MMM d, h:mm a")}
      </td>
      {showUser && (
        <td className="px-4 py-2.5">
          <div className="font-medium text-slate-900">{txn.userName}</div>
          <div className="font-mono text-[10px] text-slate-400">
            {txn.userId}
          </div>
        </td>
      )}
      <td className="px-4 py-2.5 text-slate-700">{txn.accountLabel}</td>
      <td
        className={cn(
          "px-4 py-2.5 text-right font-mono text-xs",
          isCredit ? "text-emerald-600" : "text-slate-900",
        )}
      >
        {isCredit ? "+" : ""}
        {amount.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })}
      </td>
      <td className="px-4 py-2.5 text-slate-700">{txn.effective.description}</td>
      <td className="px-4 py-2.5 text-slate-700">{txn.effective.category}</td>
      <td className="px-4 py-2.5">
        <TxStatusBadge status={txn.effective.status} />
      </td>
      <td className="px-4 py-2.5">
        {txn.override ? (
          <OverrideBadge txn={txn} />
        ) : (
          <span className="text-xs text-slate-400"></span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Pencil className="h-3 w-3" aria-hidden /> Edit
        </button>
      </td>
    </tr>
  )
}

export function TxStatusBadge({ status }: { status: AdminTxStatus }) {
  const map: Record<AdminTxStatus, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
    settled: { label: "Settled", cls: "bg-emerald-100 text-emerald-700" },
    declined: { label: "Declined", cls: "bg-rose-100 text-rose-700" },
    reversed: { label: "Reversed", cls: "bg-slate-200 text-slate-700" },
    hidden: { label: "Hidden", cls: "bg-slate-900 text-white" },
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

function OverrideBadge({ txn }: { txn: EffectiveTx }) {
  if (!txn.override) return null
  const diffs: { label: string; from: string; to: string }[] = []
  if (txn.override.amount !== undefined && txn.override.amount !== txn.amount) {
    diffs.push({
      label: "Amount",
      from: txn.amount.toFixed(2),
      to: txn.effective.amount.toFixed(2),
    })
  }
  if (
    txn.override.occurredAt !== undefined &&
    txn.override.occurredAt !== txn.occurredAt
  ) {
    diffs.push({
      label: "Date",
      from: format(new Date(txn.occurredAt), "MMM d"),
      to: format(new Date(txn.effective.occurredAt), "MMM d"),
    })
  }
  if (
    txn.override.description !== undefined &&
    txn.override.description !== txn.description
  ) {
    diffs.push({
      label: "Desc",
      from: txn.description,
      to: txn.effective.description,
    })
  }
  if (
    txn.override.category !== undefined &&
    txn.override.category !== txn.category
  ) {
    diffs.push({
      label: "Category",
      from: txn.category,
      to: txn.effective.category,
    })
  }
  if (
    txn.override.status !== undefined &&
    txn.override.status !== txn.status
  ) {
    diffs.push({
      label: "Status",
      from: txn.status,
      to: txn.effective.status,
    })
  }
  return (
    <div className="group relative inline-block">
      <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
        edited
      </span>
      <div className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden min-w-[220px] rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-lg group-hover:block">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">
          Override
        </div>
        {diffs.map((d) => (
          <div key={d.label} className="mt-1 flex items-center justify-between gap-3">
            <span className="text-slate-500">{d.label}</span>
            <span className="font-mono">
              <span className="text-slate-400 line-through">{d.from}</span>{" "}
              <span className="text-slate-900">{d.to}</span>
            </span>
          </div>
        ))}
        {diffs.length === 0 && (
          <div className="mt-1 text-slate-400">No effective change.</div>
        )}
      </div>
    </div>
  )
}
