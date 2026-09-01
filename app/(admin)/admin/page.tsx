"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import {
  ClipboardCheck,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react"
import { useMocks as USE_MOCKS } from "@/lib/dev/use-mocks-flag"
import { useQueueCounts } from "@/lib/admin/useQueueCounts"
import {
  listKycQueue,
  type KycQueueItem,
} from "@/lib/admin/api/queue.real"
import { peekSocket, getSocket } from "@/lib/realtime/socket"

/**
 * Admin operations dashboard. Numbers + lists are pulled from the real
 * backend in wiring mode and refresh on `admin.queue.changed` WebSocket
 * events. In mocks mode we fall back to the legacy zustand-seeded view
 * (kept for the standalone UI demo).
 */
export default function AdminDashboard() {
  return USE_MOCKS ? <MocksDashboard /> : <LiveDashboard />
}

function LiveDashboard() {
  const { counts, error } = useQueueCounts()
  const [recent, setRecent] = useState<KycQueueItem[] | null>(null)
  const [recentError, setRecentError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    function refresh() {
      listKycQueue({ limit: 5 })
        .then((rows) => {
          if (!cancelled) setRecent(rows)
        })
        .catch(() => {
          if (!cancelled) setRecentError("Couldn't load recent submissions.")
        })
    }
    refresh()

    let sock = peekSocket()
    if (!sock) sock = getSocket()
    const onChange = () => refresh()
    sock.on("admin.queue.changed", onChange)
    return () => {
      cancelled = true
      sock?.off("admin.queue.changed", onChange)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Operations
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          A live snapshot of what needs attention.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="KYC pending"
          value={counts?.kycPending}
          href="/admin/kyc"
          Icon={ClipboardCheck}
          accent="bg-amber-500"
        />
        <StatCard
          label="Transfers to review"
          value={counts?.transferReviewPending}
          href="/admin/transfers/review"
          Icon={ShieldAlert}
          accent="bg-rose-500"
        />
        <StatCard
          label="KYC approved"
          value={counts?.kycApproved}
          href="/admin/kyc"
          Icon={ShieldCheck}
          accent="bg-sky-500"
        />
        <StatCard
          label="Active users"
          value={counts?.totalUsers}
          href="/admin/users"
          Icon={Users}
          accent="bg-emerald-500"
        />
        <StatCard
          label="Active sessions"
          value={counts?.activeSessions}
          href="/admin/sessions"
          Icon={Wallet}
          accent="bg-violet-500"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Recent KYC submissions
          </h2>
          <Link
            href="/admin/kyc"
            className="text-xs font-semibold text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
          >
            Full queue →
          </Link>
        </div>

        {recentError && (
          <p className="mt-3 text-xs text-rose-600">{recentError}</p>
        )}
        {recent === null && !recentError && (
          <p className="mt-3 text-xs text-slate-500">Loading…</p>
        )}
        {recent !== null && recent.length === 0 && (
          <p className="mt-3 text-xs text-slate-500">
            No pending submissions. New ones land here in real time.
          </p>
        )}
        {recent !== null && recent.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100">
            {recent.map((row) => {
              const name =
                [row.user.firstName, row.user.lastName]
                  .filter(Boolean)
                  .join(" ")
                  .trim() || row.user.email
              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {name}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {row.user.email}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <span className="text-[11px] text-slate-400">
                      {formatDistanceToNow(new Date(row.submittedAt), {
                        addSuffix: true,
                      })}
                    </span>
                    <StatusPill status={row.status} />
                    <Link
                      href={`/admin/kyc/${row.userId}`}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Review
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatusPill({
  status,
}: {
  status: KycQueueItem["status"]
}) {
  const map: Record<KycQueueItem["status"], { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
    in_review: { label: "In review", cls: "bg-sky-100 text-sky-700" },
    approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "Rejected", cls: "bg-rose-100 text-rose-700" },
  }
  const m = map[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.cls}`}
    >
      {m.label}
    </span>
  )
}

function StatCard({
  label,
  value,
  href,
  Icon,
  accent,
}: {
  label: string
  value: number | undefined
  href: string
  Icon: typeof Users
  accent: string
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${accent}`}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900">
        {value === undefined ? "—" : value.toLocaleString()}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </Link>
  )
}

/** Legacy mocks-mode dashboard — unchanged from the original UI demo. */
function MocksDashboard() {
  // Lazy import to avoid pulling zustand admin slices in wired mode.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { useStore } = require("@/lib/store") as typeof import("@/lib/store")
  const pendingKyc = useStore((s) =>
    s.adminKyc.filter((k) => k.status === "pending").length,
  )
  const inReviewKyc = useStore((s) =>
    s.adminKyc.filter((k) => k.status === "in_review").length,
  )
  const totalUsers = useStore((s) => s.adminUsers.length)
  const activeSessions = useStore(
    (s) => s.adminSessions.filter((sess) => !sess.revokedAt).length,
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Operations
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          A quick snapshot of what needs attention.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="KYC pending"
          value={pendingKyc}
          href="/admin/kyc"
          Icon={ClipboardCheck}
          accent="bg-amber-500"
        />
        <StatCard
          label="KYC in review"
          value={inReviewKyc}
          href="/admin/kyc"
          Icon={ShieldCheck}
          accent="bg-sky-500"
        />
        <StatCard
          label="Users"
          value={totalUsers}
          href="/admin/users"
          Icon={Users}
          accent="bg-emerald-500"
        />
        <StatCard
          label="Active sessions"
          value={activeSessions}
          href="/admin/users"
          Icon={Wallet}
          accent="bg-violet-500"
        />
      </div>
    </div>
  )
}
