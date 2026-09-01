"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import {
  ClipboardCheck,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  ScanLine,
  ScrollText,
  ShieldAlert,
  Users,
  Wallet,
  X,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { logout as apiLogout } from "@/lib/auth/api/auth.real"
import { useMocks as USE_MOCKS } from "@/lib/dev/use-mocks-flag"
import { useQueueCounts } from "@/lib/admin/useQueueCounts"

type ItemKey = "kyc" | "transfers" | "users" | "transactions" | "support" | "mail" | "dashboard" | "audit"

const ITEMS: ReadonlyArray<{
  href: string
  label: string
  Icon: typeof Users
  badgeKey?: ItemKey
}> = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/kyc", label: "KYC", Icon: ClipboardCheck, badgeKey: "kyc" },
  {
    href: "/admin/transfers/review",
    label: "Transfers",
    Icon: ShieldAlert,
    badgeKey: "transfers",
  },
  { href: "/admin/users", label: "Users", Icon: Users },
  { href: "/admin/wires", label: "Wires", Icon: Landmark },
  { href: "/admin/link-requests", label: "Link requests", Icon: Landmark },
  { href: "/admin/check-deposits", label: "Check deposits", Icon: ScanLine },
  { href: "/admin/transactions", label: "Transactions", Icon: Wallet },
  { href: "/admin/support", label: "Support", Icon: LifeBuoy, badgeKey: "support" },
  { href: "/admin/mail", label: "Mail", Icon: Mail, badgeKey: "mail" },
  { href: "/admin/audit", label: "Audit Log", Icon: ScrollText },
]

export function LeftRail({
  mobileOpen = false,
  onCloseMobile,
}: {
  /** When true, the sidebar slides in as an overlay on small screens. */
  mobileOpen?: boolean
  /** Called when the user dismisses the mobile drawer (backdrop tap, X,
   *  or nav-link click). Ignored on `md+` where the rail is always visible. */
  onCloseMobile?: () => void
}) {
  const pathname = usePathname() ?? ""
  const router = useRouter()
  const setFakeRole = useStore((s) => s.setFakeRole)
  const clearSession = useStore((s) => s.clearSession)
  // Live counts only run in real-wiring mode; in mocks we skip the
  // network call so demos don't 401.
  const { counts } = USE_MOCKS ? { counts: null } : useQueueCounts() // eslint-disable-line react-hooks/rules-of-hooks
  const badgeFor = (k?: ItemKey): number => {
    if (!k || !counts) return 0
    if (k === "kyc") return counts.kycPending
    if (k === "transfers") return counts.transferReviewPending
    if (k === "support") return counts.supportUnreadThreads ?? 0
    if (k === "mail") return counts.mailUnreadThreads ?? 0
    return 0
  }

  // Close the mobile drawer on route change.
  useEffect(() => {
    if (mobileOpen) onCloseMobile?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  async function signOut() {
    if (USE_MOCKS) {
      setFakeRole("customer")
      router.push("/home")
      return
    }
    try {
      await apiLogout()
    } catch {
      // Best-effort — still clear local state below.
    }
    clearSession()
    router.replace("/login")
  }

  return (
    <>
      {/* Mobile backdrop — only rendered when the drawer is open. */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
        />
      )}

      <aside
        className={cn(
          "flex h-screen w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-5 transition-transform",
          // Mobile: off-canvas drawer that slides in from the left when
          // open. Desktop (md+): always-visible static rail (override the
          // transform so nothing snaps when the prop flips).
          "fixed inset-y-0 left-0 z-50 -translate-x-full md:static md:translate-x-0 md:flex",
          mobileOpen && "translate-x-0",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-1">
          <Link
            href="/admin"
            className="flex items-center gap-2 px-2"
            onClick={onCloseMobile}
          >
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white">
              Admin
            </span>
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:hidden"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <nav className="mt-6 flex-1 space-y-1">
          {ITEMS.map(({ href, label, Icon, badgeKey }) => {
            const active =
              href === "/admin"
                ? pathname === "/admin"
                : pathname === href || pathname.startsWith(href + "/")
            const count = badgeFor(badgeKey)
            return (
              <Link
                key={href}
                href={href}
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100",
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />
                <span className="flex-1">{label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-bold leading-none",
                      active
                        ? "bg-white text-slate-900"
                        : "bg-rose-500 text-white",
                    )}
                  >
                    {count > 50 ? "50+" : count}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
      </aside>
    </>
  )
}
