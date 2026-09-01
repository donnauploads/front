"use client"

import { useCallback, useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { LogOut, Monitor, ShieldCheck, Wallet } from "lucide-react"
import {
  listAdminSessions,
  revokeAdminSession,
  type AdminSession,
} from "@/lib/admin/api/queue.real"
import { cn } from "@/lib/utils"

/**
 * Admin page listing every active session across all users. Active =
 * not revoked and not yet expired. Each row exposes a Revoke button
 * that calls /admin/sessions/:id/revoke; the affected device gets a
 * `session.revoked` push and is force-routed to /login within ~1s.
 *
 * Refreshes on mount + every 15s + after every revoke so the list
 * tracks reality without the operator hitting reload.
 */
export default function AdminSessionsPage() {
  const [rows, setRows] = useState<AdminSession[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    listAdminSessions()
      .then((r) => {
        setRows(r)
        setError(null)
      })
      .catch(() => setError("Couldn't load active sessions."))
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 15_000)
    return () => clearInterval(id)
  }, [refresh])

  async function revoke(row: AdminSession) {
    if (busyId) return
    if (
      !window.confirm(
        `Sign ${row.user.name} out of their ${row.device.name || "device"}?`,
      )
    )
      return
    setBusyId(row.id)
    try {
      await revokeAdminSession(row.id)
      setRows((prev) => prev?.filter((r) => r.id !== row.id) ?? null)
    } catch {
      setError("Revoke failed. Try again.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Active sessions
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows === null
              ? "Loading…"
              : `${rows.length} session${rows.length === 1 ? "" : "s"} currently live across all users.`}
          </p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 text-violet-600">
          <Wallet className="h-5 w-5" aria-hidden />
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {rows === null && !error && (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            Loading…
          </p>
        )}
        {rows !== null && rows.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            No active sessions right now.
          </p>
        )}
        {rows !== null && rows.length > 0 && (
          <>
            {/* Mobile: stacked card layout — every field stacks so nothing
                is clipped on a narrow viewport. */}
            <ul className="divide-y divide-slate-100 lg:hidden">
              {rows.map((row) => (
                <li key={row.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">
                        {row.user.name}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {row.user.email}
                      </div>
                      <div className="mt-1">
                        <RolePill role={row.user.role} />
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => revoke(row)}
                      className={cn(
                        "inline-flex flex-shrink-0 items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                        busyId === row.id
                          ? "border-rose-200 bg-rose-50 text-rose-300"
                          : "border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
                      )}
                    >
                      <LogOut className="h-3.5 w-3.5" aria-hidden />
                      {busyId === row.id ? "Revoking…" : "Revoke"}
                    </button>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <Monitor
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-slate-900">
                        {row.device.name || "Unknown device"}
                      </div>
                      <div className="truncate text-[11px] text-slate-500">
                        {[row.device.browser, row.device.os]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="truncate">{row.device.ip}</span>
                        {row.device.trusted && (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600">
                            <ShieldCheck className="h-3 w-3" aria-hidden />
                            trusted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Started{" "}
                      {formatDistanceToNow(new Date(row.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                    <span>
                      Expires in{" "}
                      {formatDistanceToNow(new Date(row.expiresAt))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: traditional table once we have room for it. */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2.5 font-medium">User</th>
                    <th className="px-4 py-2.5 font-medium">Device</th>
                    <th className="px-4 py-2.5 font-medium">Started</th>
                    <th className="px-4 py-2.5 font-medium">Expires</th>
                    <th className="px-4 py-2.5 text-center font-medium">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-slate-900">
                          {row.user.name}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {row.user.email}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <RolePill role={row.user.role} />
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <Monitor
                            className="h-4 w-4 flex-shrink-0 text-slate-400"
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm text-slate-900">
                              {row.device.name || "Unknown device"}
                            </div>
                            <div className="truncate text-[11px] text-slate-500">
                              {[row.device.browser, row.device.os]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                            <div className="truncate text-[11px] text-slate-400">
                              {row.device.ip}
                              {row.device.trusted && (
                                <span className="ml-1 inline-flex items-center gap-0.5 text-emerald-600">
                                  <ShieldCheck className="h-3 w-3" aria-hidden />
                                  trusted
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-slate-500">
                        {formatDistanceToNow(new Date(row.createdAt), {
                          addSuffix: true,
                        })}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-slate-500">
                        in {formatDistanceToNow(new Date(row.expiresAt))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => revoke(row)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                              busyId === row.id
                                ? "border-rose-200 bg-rose-50 text-rose-300"
                                : "border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
                            )}
                          >
                            <LogOut className="h-3.5 w-3.5" aria-hidden />
                            {busyId === row.id ? "Revoking…" : "Revoke"}
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
      </div>
    </div>
  )
}

function RolePill({ role }: { role: string }) {
  const map: Record<string, string> = {
    customer: "bg-slate-100 text-slate-600",
    admin: "bg-blue-100 text-blue-700",
    superadmin: "bg-violet-100 text-violet-700",
  }
  const cls = map[role] ?? map.customer
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
        cls,
      )}
    >
      {role}
    </span>
  )
}
