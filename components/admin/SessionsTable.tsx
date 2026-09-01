"use client"

import { formatDistanceToNow } from "date-fns"
import { Laptop, Smartphone, Tablet } from "lucide-react"
import type { AdminSession } from "@/lib/store"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

/**
 * Renders a user's sessions (current + revoked) in a compact admin table.
 * Per the security spec (planning doc §4), revoked sessions stay visible
 * for audit — we surface that here with a muted row + "Revoked" badge.
 */
export function SessionsTable({ userId }: { userId: string }) {
  const sessions = useStore((s) =>
    s.adminSessions.filter((sess) => sess.userId === userId),
  )
  const revoke = useStore((s) => s.revokeAdminSession)
  const revokeAll = useStore((s) => s.revokeAllSessionsForUser)

  const activeCount = sessions.filter((s) => !s.revokedAt).length

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div className="text-sm font-semibold text-slate-900">
          Sessions
          <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
            {activeCount} active
          </span>
        </div>
        <button
          type="button"
          onClick={() => revokeAll(userId)}
          disabled={activeCount === 0}
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Revoke all
        </button>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
            <th className="px-4 py-2 font-medium">Device</th>
            <th className="px-4 py-2 font-medium">Location</th>
            <th className="px-4 py-2 font-medium">Last active</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <SessionRow
              key={s.id}
              sess={s}
              onRevoke={() => revoke(s.id)}
            />
          ))}
          {sessions.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                No sessions on record.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function SessionRow({
  sess,
  onRevoke,
}: {
  sess: AdminSession
  onRevoke: () => void
}) {
  const revoked = Boolean(sess.revokedAt)
  const Device = deviceIcon(sess.deviceName)
  return (
    <tr
      className={cn(
        "border-b border-slate-100 transition hover:bg-slate-50/60",
        revoked && "opacity-60",
      )}
    >
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Device className="h-4 w-4 text-slate-500" aria-hidden />
          <div>
            <div className="font-medium text-slate-900">
              {sess.deviceName}
              {sess.current && !revoked && (
                <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  This device
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500">
              {sess.os} · {sess.browser}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5 text-slate-700">{sess.location}</td>
      <td className="px-4 py-2.5 text-slate-700">
        {formatDistanceToNow(new Date(sess.lastActiveAt), { addSuffix: true })}
      </td>
      <td className="px-4 py-2.5">
        {revoked ? (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            Revoked
          </span>
        ) : (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            Active
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        {!revoked && (
          <button
            type="button"
            onClick={onRevoke}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Revoke
          </button>
        )}
      </td>
    </tr>
  )
}

function deviceIcon(name: string) {
  const n = name.toLowerCase()
  if (n.includes("iphone") || n.includes("pixel") || n.includes("galaxy"))
    return Smartphone
  if (n.includes("ipad") || n.includes("tablet")) return Tablet
  return Laptop
}
