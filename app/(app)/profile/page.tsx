"use client"

import Link from "next/link"
import {
  Bell,
  Camera,
  ChevronRight,
  CreditCard,
  FileText,
  HelpCircle,
  Lock,
  LogOut,
  Palette,
  Receipt,
  ShieldCheck,
  UserCircle2,
  type LucideIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { BRAND_NAME } from "@/lib/brand"
import { logout as apiLogout } from "@/lib/auth/api/auth.real"
import { useMocks as USE_MOCKS } from "@/lib/dev/use-mocks-flag"

/**
 * Settings hub. Restyled to the design's panel + .move-row pattern while
 * keeping the existing Next.js route architecture (one sub-route per
 * settings section). Each `Row` keeps its existing `href`; only markup
 * + classes changed.
 */

type Row = { href: string; title: string; body?: string; Icon: LucideIcon }

const SUPPORT: Row[] = [
  {
    href: "/profile/help",
    Icon: HelpCircle,
    title: "Help & support",
    body: "FAQs or chat with us",
  },
  {
    href: "/profile/security",
    Icon: ShieldCheck,
    title: "Security & login",
    body: "Password, biometrics, devices",
  },
]

const ACCOUNT_BASE: Row[] = [
  {
    href: "/profile/personal-info",
    Icon: UserCircle2,
    title: "Personal information",
    body: "Update details, handle, and photo",
  },
  {
    href: "/profile/account-details",
    Icon: Receipt,
    title: "Account details",
    body: "Limits, settings",
  },
  {
    href: "/home/spending/card",
    Icon: CreditCard,
    title: "Cards",
    body: "Manage virtual & physical cards",
  },
  {
    href: "/profile/documents",
    Icon: FileText,
    title: "Statements & documents",
    body: "Monthly statements and tax forms",
  },
]

const PREFERENCES: Row[] = [
  {
    href: "/profile/privacy",
    Icon: Lock,
    title: "Privacy",
    body: "Data sharing and analytics",
  },
  {
    href: "/profile/notifications",
    Icon: Bell,
    title: "Notifications",
    body: "Choose what alerts you receive",
  },
  {
    href: "/profile/appearance",
    Icon: Palette,
    title: "Appearance",
    body: "Light, dark, or system theme",
  },
]

export default function ProfileTab() {
  const router = useRouter()
  const user = useStore((s) => s.user)
  const clearSession = useStore((s) => s.clearSession)

  async function onSignOut(e: React.MouseEvent) {
    if (USE_MOCKS) return // let the Link route happen
    e.preventDefault()
    try {
      await apiLogout()
    } catch {
      // Even if the server call fails we still want to clear local state.
    }
    clearSession()
    router.replace("/login")
  }

  const initials = user?.initials ?? "AR"
  const name = user?.name ?? "Customer"
  const handle = user?.novaTag ?? ""
  const memberSince = user?.memberSince ?? new Date().getFullYear().toString()

  const account: Row[] = ACCOUNT_BASE

  return (
    <>
      <div className="page-head">
        <h2>Settings</h2>
        <p className="ph-sub">
          Manage your profile, security, card controls, and notifications.
        </p>
      </div>

      {/* ── Identity tile ──────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-body" style={{ padding: "24px 22px 8px" }}>
          <div className="set-profile">
            <Link
              href="/profile/personal-info"
              className="sp-av-wrap"
              aria-label="Edit profile photo"
            >
              <span className="sp-av">
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" />
                ) : (
                  initials
                )}
              </span>
              <span className="sp-av-cam" aria-hidden>
                <Camera />
              </span>
            </Link>
            <div style={{ minWidth: 0 }}>
              <div className="sp-name">{name}</div>
              <div className="sp-sub">
                {handle ? `${handle} · ` : ""}Member since {memberSince}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Support panel ──────────────────────────────────────────── */}
      <div className="pf-group">Support</div>
      <div className="panel">
        <div className="panel-body">
          {SUPPORT.map((r) => (
            <ProfileRow key={r.href} row={r} />
          ))}
        </div>
      </div>

      {/* ── Account panel ──────────────────────────────────────────── */}
      <div className="pf-group">Account</div>
      <div className="panel">
        <div className="panel-body">
          {account.map((r) => (
            <ProfileRow key={r.href} row={r} />
          ))}
        </div>
      </div>

      {/* ── Preferences panel ──────────────────────────────────────── */}
      <div className="pf-group">Preferences</div>
      <div className="panel">
        <div className="panel-body">
          {PREFERENCES.map((r) => (
            <ProfileRow key={r.href} row={r} />
          ))}
        </div>
      </div>

      {/* ── Sign out ──────────────────────────────────────────────── */}
      <Link
        href={USE_MOCKS ? "/" : "/login"}
        onClick={onSignOut}
        className="pf-signout"
      >
        <LogOut width={16} height={16} aria-hidden />
        Sign out
      </Link>
      <div className="pf-version">
        {BRAND_NAME} Online Banking
        <br />
        Version 1.0.0
      </div>
    </>
  )
}

function ProfileRow({ row }: { row: Row }) {
  const { Icon } = row
  return (
    <Link className="move-row" href={row.href}>
      <span className="mr-ic">
        <Icon strokeWidth={2} aria-hidden />
      </span>
      <span className="mr-body">
        <span className="mr-title">{row.title}</span>
        {row.body && <span className="mr-sub">{row.body}</span>}
      </span>
      <ChevronRight className="mr-chev" aria-hidden />
    </Link>
  )
}
