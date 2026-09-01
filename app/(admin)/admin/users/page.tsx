"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Loader2, Search, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  displayNameOf,
  searchAdminUsers,
  type AdminUserRow,
  type AdminUserStatus,
} from "@/lib/admin/api/users.real"
import type { Role } from "@/lib/store"

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 350

/**
 * Admin users — live list against /admin/users.
 *
 * Layout mirrors the transactions page: stacked cards on `<md`, a
 * horizontally-scrollable table on `md+`. The search input drives the
 * backend `q` param directly (debounced) so name/email/$tag/phone all
 * hit Prisma's `contains` filter.
 */
export default function UsersPage() {
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [debounced, setDebounced] = useState("")

  // Debounce the search so we don't flood the API per keystroke.
  useEffect(() => {
    const t = setTimeout(
      () => setDebounced(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    )
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchSeqRef = useRef(0)
  const load = useCallback(async () => {
    const seq = ++fetchSeqRef.current
    setLoading(true)
    setError(null)
    try {
      const data = await searchAdminUsers({
        q: debounced || undefined,
        limit: PAGE_SIZE,
      })
      if (fetchSeqRef.current !== seq) return
      setRows(data)
    } catch (err) {
      if (fetchSeqRef.current !== seq) return
      setError(
        err instanceof Error
          ? err.message || "Couldn't load users."
          : "Couldn't load users.",
      )
      setRows([])
    } finally {
      if (fetchSeqRef.current === seq) setLoading(false)
    }
  }, [debounced])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length}
            {rows.length === PAGE_SIZE ? "+" : ""} shown — search by name,
            email, $tag, or phone.
          </p>
        </div>
        <Link
          href="/admin/users/create"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          New user
        </Link>
      </div>

      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 focus-within:border-slate-400">
        <Search className="h-4 w-4 text-slate-400" aria-hidden />
        <input
          type="text"
          autoFocus
          placeholder="Search users…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
      </label>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-10 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading users…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          {debounced ? `No users match "${debounced}".` : "No users yet."}
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards. Hidden ≥md. */}
          <ul className="space-y-2 md:hidden">
            {rows.map((u) => (
              <li key={u.id}>
                <UserCard user={u} />
              </li>
            ))}
          </ul>

          {/* Desktop: table inside an overflow-x-auto so it scrolls
              horizontally rather than overflowing the layout. */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">$tag</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Joined</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <UserRow key={u.id} user={u} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Row / Card ──────────────────────────────────────────────────────────

function UserRow({ user: u }: { user: AdminUserRow }) {
  return (
    <tr className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/60">
      <td className="px-4 py-2.5">
        <div className="font-medium text-slate-900">{displayNameOf(u)}</div>
        <div className="text-xs text-slate-500">{u.email}</div>
      </td>
      <td className="px-4 py-2.5 font-mono text-xs text-slate-700">
        {u.novaTag ?? "—"}
      </td>
      <td className="px-4 py-2.5">
        <RolePill role={u.role} />
      </td>
      <td className="px-4 py-2.5">
        <StatusPill status={u.status} />
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-600">
        {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
      </td>
      <td className="px-4 py-2.5 text-right">
        <Link
          href={`/admin/users/${u.id}`}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          View
        </Link>
      </td>
    </tr>
  )
}

function UserCard({ user: u }: { user: AdminUserRow }) {
  return (
    <Link
      href={`/admin/users/${u.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">
            {displayNameOf(u)}
          </div>
          <div className="truncate text-[11px] text-slate-500">{u.email}</div>
          {u.novaTag && (
            <div className="mt-0.5 font-mono text-[11px] text-slate-600">
              {u.novaTag}
            </div>
          )}
        </div>
        <RolePill role={u.role} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
        <StatusPill status={u.status} />
        <span className="ml-auto">
          {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
        </span>
      </div>
    </Link>
  )
}

function RolePill({ role }: { role: Role }) {
  const map: Record<Role, string> = {
    customer: "bg-slate-100 text-slate-700",
    admin: "bg-slate-900 text-white",
    superadmin: "bg-violet-100 text-violet-700",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
        map[role],
      )}
    >
      {role}
    </span>
  )
}

function StatusPill({ status }: { status: AdminUserStatus }) {
  const map: Record<AdminUserStatus, string> = {
    active: "bg-emerald-100 text-emerald-700",
    frozen: "bg-amber-100 text-amber-700",
    closed: "bg-rose-100 text-rose-700",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
        map[status],
      )}
    >
      {status.replace("_", " ")}
    </span>
  )
}
