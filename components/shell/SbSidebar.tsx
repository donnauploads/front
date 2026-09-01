"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"

/** Time-of-day greeting from the device's local clock (which reflects the
 *  user's timezone/location). */
function greetingForHour(h: number): string {
  if (h < 5) return "Good night"
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  if (h < 22) return "Good evening"
  return "Good night"
}

/**
 * Customer-app sidebar — ported from the design's `<aside class="sidebar">`.
 * 268px navy-deep panel with the State Bank logo on white, a greeting tile,
 * grouped nav, and a foot strip with support + settings + sign-out.
 *
 * Mobile (≤860px): the sidebar is `position: fixed` + `transform:
 * translateX(-100%)` by default and slides in when `.sidebar.open` is
 * applied. The `open` flag is owned by the parent (AppShell) so the
 * topbar burger can toggle it.
 */

type NavEntry = {
  label: string
  href: string
  icon: React.ReactNode
  /** Routes that should keep this entry highlighted (allows nested URLs
   *  like /home/spending/card to still show "Cards" as active). */
  matches?: (pathname: string) => boolean
}

export type SbSidebarProps = {
  open: boolean
  onClose: () => void
  user?: {
    firstName?: string
    role?: string
    memberSince?: string
  }
}

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11 12 3l9 8" />
      <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" />
    </svg>
  ),
  accounts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </svg>
  ),
  transfer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3v14M17 17l-4-4M17 17l4-4" />
      <path d="M7 21V7M7 7l4 4M7 7l-4 4" />
    </svg>
  ),
  cards: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  ),
  linked: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8" />
    </svg>
  ),
  txns: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  ),
  insights: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-9-9v9Z" />
      <path d="M12 3a9 9 0 0 1 9 9h-9Z" />
    </svg>
  ),
  statements: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </svg>
  ),
  support: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8 2 2 0 1 1-2.8 2.8 1.6 1.6 0 0 0-2.7 1.1 2 2 0 0 1-4 0 1.6 1.6 0 0 0-2.7-1.1 2 2 0 1 1-2.8-2.8A1.6 1.6 0 0 0 3 13.4a2 2 0 0 1 0-4 1.6 1.6 0 0 0 1.7-2.4 2 2 0 1 1 2.8-2.8A1.6 1.6 0 0 0 10 4.6a2 2 0 0 1 4 0 1.6 1.6 0 0 0 2.7 1.1 2 2 0 1 1 2.8 2.8 1.6 1.6 0 0 0-.1 2.5Z" />
    </svg>
  ),
  signout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  ),
}

/** Route map — keeps the design's view labels but points each entry at
 *  the existing Next.js routes so deep-links + Next routing keep working
 *  while we restyle pages chunk by chunk. */
const BANKING: NavEntry[] = [
  {
    label: "Home",
    href: "/home",
    icon: ICONS.home,
    matches: (p) => p === "/home" || p === "/",
  },
  {
    label: "Accounts",
    href: "/accounts",
    icon: ICONS.accounts,
    matches: (p) =>
      p.startsWith("/accounts") ||
      p.startsWith("/home/savings") ||
      p === "/home/invest",
  },
  {
    label: "Pay & Transfer",
    href: "/move",
    icon: ICONS.transfer,
    matches: (p) => p.startsWith("/move"),
  },
  {
    label: "Cards",
    href: "/home/spending/card",
    icon: ICONS.cards,
    matches: (p) => p.startsWith("/home/spending/card"),
  },
  {
    label: "Linked accounts",
    href: "/move/linked",
    icon: ICONS.linked,
    matches: (p) => p.startsWith("/move/linked"),
  },
]

const INSIGHTS: NavEntry[] = [
  {
    label: "Transactions",
    href: "/home/spending",
    icon: ICONS.txns,
    matches: (p) =>
      p === "/home/spending" ||
      (p.startsWith("/home/spending") && !p.startsWith("/home/spending/card")),
  },
  {
    label: "Spending Insights",
    href: "/home/spending/insight",
    icon: ICONS.insights,
    matches: (p) => p.startsWith("/home/spending/insight"),
  },
  {
    label: "Statements",
    href: "/profile/documents",
    icon: ICONS.statements,
    matches: (p) => p.startsWith("/profile/documents"),
  },
]

function isActive(entry: NavEntry, pathname: string): boolean {
  if (entry.matches) return entry.matches(pathname)
  return pathname === entry.href
}

export function SbSidebar({ open, onClose, user }: SbSidebarProps) {
  const pathname = usePathname() ?? "/"
  const sessionUser = useStore((s) => s.session.user)

  const displayName =
    user?.firstName ?? sessionUser?.firstName ?? "there"
  const role = user?.role ?? sessionUser?.role ?? "Personal Banking"
  const memberSince = user?.memberSince ?? "Personal customer"

  // Time-of-day greeting — computed on the client so it reflects the user's
  // local clock/timezone (SSR-safe: starts at a neutral default, updates on
  // mount, and re-checks hourly so it flips morning→afternoon→evening live).
  const [greeting, setGreeting] = useState("Hello")
  useEffect(() => {
    const tick = () => setGreeting(greetingForHour(new Date().getHours()))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      {/* Backdrop + click-to-close (only visible at ≤860px via CSS). */}
      <div
        className={cn("side-overlay", open && "open")}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={cn("sidebar", open && "open")}
        aria-label="Banking navigation"
      >
        <Link href="/home" className="side-brand" aria-label="Bank home">
          {/* White-on-transparent lockup (lp2) sits directly on the dark
              sidebar header — matches the login/signup brand panels. */}
          <img
            className="side-logo"
            src="/lp2.png"
            alt="State Bank"
          />
        </Link>

        <div className="side-entity">
          <div className="se-label">{greeting}</div>
          <div className="se-name">{displayName}</div>
          <div className="se-meta">{memberSince}</div>
        </div>

        <nav className="side-nav" aria-label="Banking">
          <div className="nav-group-label">Banking</div>
          {BANKING.map((e) => (
            <SidebarLink
              key={e.label}
              entry={e}
              active={isActive(e, pathname)}
              onNavigate={onClose}
            />
          ))}

          <div className="nav-group-label">Insights</div>
          {INSIGHTS.map((e) => (
            <SidebarLink
              key={e.label}
              entry={e}
              active={isActive(e, pathname)}
              onNavigate={onClose}
            />
          ))}
        </nav>

        <div className="side-foot">
          <SidebarLink
            entry={{
              label: "Help & Support",
              href: "/profile/help",
              icon: ICONS.support,
              matches: (p) => p.startsWith("/profile/help"),
            }}
            active={pathname.startsWith("/profile/help")}
            onNavigate={onClose}
          />
          <SidebarLink
            entry={{
              label: "Settings",
              href: "/profile",
              icon: ICONS.settings,
              matches: (p) =>
                p === "/profile" ||
                (p.startsWith("/profile") && !p.startsWith("/profile/help") && !p.startsWith("/profile/documents")),
            }}
            active={
              pathname === "/profile" ||
              (pathname.startsWith("/profile") &&
                !pathname.startsWith("/profile/help") &&
                !pathname.startsWith("/profile/documents"))
            }
            onNavigate={onClose}
          />
          <Link
            href="/login"
            className="snav"
            onClick={onClose}
            aria-label="Sign out"
          >
            {ICONS.signout}
            Sign out
          </Link>
        </div>

        {/* `role` consumed to keep the type unused-clean even when the
            design copy doesn't show it visibly. */}
        <span hidden>{role}</span>
      </aside>
    </>
  )
}

function SidebarLink({
  entry,
  active,
  onNavigate,
}: {
  entry: NavEntry
  active: boolean
  onNavigate: () => void
}) {
  return (
    <Link
      href={entry.href}
      className={cn("snav", active && "active")}
      onClick={onNavigate}
    >
      {entry.icon}
      {entry.label}
    </Link>
  )
}
