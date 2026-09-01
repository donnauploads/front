"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useStore } from "@/lib/store"
import {
  clearAllNotifications,
  markRead as apiMarkRead,
} from "@/lib/notifications/api/notifications.real"
import { useTheme } from "next-themes"
import { logout as apiLogout } from "@/lib/auth/api/auth.real"
import { cn } from "@/lib/utils"
import { CURRENCY_OPTIONS } from "@/lib/currency"
import { TopBarSearch } from "./TopBarSearch"

/**
 * Customer-app topbar — ported from the design's `<header class="topbar">`.
 * Burger (≤860px) → page title + breadcrumb → spacer → search (≥860px) →
 * notification dropdown → user dropdown.
 *
 * The two dropdowns reuse the existing zustand `notifications` slice and
 * the existing `apiLogout` + `apiMarkRead` + `clearAllNotifications`
 * helpers — no behavior change vs the previous TopBar, only markup.
 */

export type SbTopBarProps = {
  onToggleSidebar: () => void
}

/** Route → { crumb, title } table. The design fed these in via
 *  `data-title` / `data-crumb` on each `.snav`; on Next.js we derive from
 *  the current pathname. */
const TITLES: Array<{
  match: (p: string) => boolean
  title: string
  crumb: string
}> = [
  { match: (p) => p === "/home" || p === "/", title: "Home", crumb: "Personal Banking" },
  { match: (p) => p.startsWith("/home/savings"), title: "Savings", crumb: "Your money" },
  { match: (p) => p === "/home/invest", title: "Invest", crumb: "Your money" },
  { match: (p) => p.startsWith("/home/spending/card"), title: "Cards", crumb: "Your money" },
  { match: (p) => p.startsWith("/home/spending/insight"), title: "Spending Insights", crumb: "Activity" },
  { match: (p) => p.startsWith("/home/spending"), title: "Transactions", crumb: "Activity" },
  { match: (p) => p === "/move", title: "Pay & Transfer", crumb: "Move money" },
  { match: (p) => p.startsWith("/move/linked"), title: "Linked accounts", crumb: "Your money" },
  { match: (p) => p.startsWith("/move/recurring"), title: "Recurring", crumb: "Move money" },
  { match: (p) => p.startsWith("/move/transfer"), title: "Transfer", crumb: "Move money" },
  { match: (p) => p.startsWith("/move/wire"), title: "Wire", crumb: "Move money" },
  { match: (p) => p.startsWith("/move/atm"), title: "ATM finder", crumb: "Move money" },
  { match: (p) => p.startsWith("/move/deposit"), title: "Deposit", crumb: "Move money" },
  { match: (p) => p.startsWith("/deals"), title: "Deals", crumb: "Offers" },
  { match: (p) => p.startsWith("/profile/help"), title: "Help & Support", crumb: "Account" },
  { match: (p) => p.startsWith("/profile/documents"), title: "Statements", crumb: "Activity" },
  { match: (p) => p.startsWith("/profile/security"), title: "Security & login", crumb: "Account" },
  { match: (p) => p.startsWith("/profile/personal-info"), title: "Personal info", crumb: "Account" },
  { match: (p) => p.startsWith("/profile/notifications"), title: "Notifications", crumb: "Account" },
  { match: (p) => p.startsWith("/profile/appearance"), title: "Appearance", crumb: "Account" },
  { match: (p) => p.startsWith("/profile/privacy"), title: "Privacy", crumb: "Account" },
  { match: (p) => p.startsWith("/profile/account-details"), title: "Account details", crumb: "Account" },
  { match: (p) => p === "/profile", title: "Settings", crumb: "Account" },
]

function resolveTitle(pathname: string) {
  for (const entry of TITLES) {
    if (entry.match(pathname)) return { title: entry.title, crumb: entry.crumb }
  }
  return { title: "Banking", crumb: "Personal Banking" }
}

function relTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return iso
  const diff = Date.now() - t
  const sec = Math.round(diff / 1000)
  if (sec < 60) return "just now"
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day}d`
  const wk = Math.round(day / 7)
  if (wk < 5) return `${wk}w`
  return `${Math.round(day / 30)}mo`
}

export function SbTopBar({ onToggleSidebar }: SbTopBarProps) {
  const pathname = usePathname() ?? "/"
  const router = useRouter()
  const { setTheme } = useTheme()
  const { title, crumb } = useMemo(() => resolveTitle(pathname), [pathname])

  const notifications = useStore((s) => s.notifications)
  const markNotificationsRead = useStore((s) => s.markNotificationsRead)
  const setNotifications = useStore((s) => s.setNotifications)
  const sessionUser = useStore((s) => s.session.user)
  const displayCurrency = useStore((s) => s.displayCurrency)
  const setDisplayCurrency = useStore((s) => s.setDisplayCurrency)

  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [expandedNotifs, setExpandedNotifs] = useState<Set<string>>(new Set())

  function toggleNotifExpanded(id: string) {
    setExpandedNotifs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    // Tapping a row marks just THAT notification as read (server + local).
    // Opening the bell no longer bulk-marks everything — see below.
    const n = notifications.find((x) => x.id === id)
    if (n?.unread) {
      apiMarkRead([id]).catch(() => {})
      markNotificationsRead([id])
    }
  }
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => n.unread).length

  // Outside-click close for both popovers.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (notifOpen && !notifRef.current?.contains(e.target as Node)) {
        setNotifOpen(false)
      }
      if (userOpen && !userRef.current?.contains(e.target as Node)) {
        setUserOpen(false)
      }
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [notifOpen, userOpen])

  // Opening the bell no longer auto-marks everything read — a notification
  // is marked read when its row is tapped (toggleNotifExpanded), or via the
  // explicit "Mark all read" action below. This keeps unread rows visible so
  // they can be tapped/expanded first.

  async function onMarkAllRead() {
    const ids = notifications.filter((n) => n.unread).map((n) => n.id)
    if (ids.length === 0) return
    apiMarkRead(ids).catch(() => {})
    markNotificationsRead(ids)
  }

  async function onClearAll() {
    if (notifications.length === 0) return
    const snapshot = notifications
    setNotifications([])
    try {
      await clearAllNotifications()
    } catch {
      setNotifications(snapshot)
    }
  }

  async function onSignOut() {
    setUserOpen(false)
    // Return to the normal light theme on logout — the dark theme is a
    // dashboard-only preference and shouldn't carry into the logged-out
    // (login) experience.
    setTheme("light")
    try {
      await apiLogout()
    } catch {
      /* fall through — even if the network call fails we still want to
         drop the user back to the login route */
    }
    router.push("/login")
  }

  const initials = useMemo(() => {
    const f = sessionUser?.firstName?.[0] ?? ""
    const l = sessionUser?.lastName?.[0] ?? ""
    return (f + l || "??").toUpperCase()
  }, [sessionUser])

  // Show the user's uploaded photo when present; fall back to initials.
  const avatarUrl = sessionUser?.avatarUrl ?? null

  const displayName =
    [sessionUser?.firstName, sessionUser?.lastName]
      .filter(Boolean)
      .join(" ") || "Customer"

  const emailMasked = useMemo(() => {
    const e = sessionUser?.email
    if (!e) return ""
    const [user, host] = e.split("@")
    if (!user || !host) return e
    return `${user.slice(0, 2)}${"*".repeat(Math.max(0, user.length - 2))}@${host}`
  }, [sessionUser?.email])

  return (
    <header className="topbar">
      <button
        type="button"
        className="tb-burger"
        aria-label="Open menu"
        onClick={onToggleSidebar}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <div className="tb-title">
        <span className="tb-crumb">{crumb}</span>
        <h1>{title}</h1>
      </div>

      <div className="tb-spacer" />

      <TopBarSearch />

      <div className="tb-pop" ref={notifRef}>
        <button
          type="button"
          className="tb-icon"
          aria-label="Notifications"
          onClick={() => setNotifOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="tb-badge">{unreadCount > 50 ? "50+" : unreadCount}</span>
          )}
        </button>
        <div className={cn("tb-menu notif-menu", notifOpen && "open")}>
          <div className="tb-menu-head">
            <h4>Notifications</h4>
            <div className="tm-actions">
              <button
                type="button"
                className="tm-link"
                onClick={onMarkAllRead}
              >
                Mark all read
              </button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="notif-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              <p>You&apos;re all caught up</p>
              <span>No new notifications</span>
            </div>
          ) : (
            <div className="notif-list">
              {notifications.slice(0, 50).map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "notif",
                    n.unread && "unread",
                    expandedNotifs.has(n.id) && "expanded",
                  )}
                  role="button"
                  tabIndex={0}
                  aria-expanded={expandedNotifs.has(n.id)}
                  onClick={() => toggleNotifExpanded(n.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      toggleNotifExpanded(n.id)
                    }
                  }}
                >
                  <span className={cn("notif-ic", n.category === "transaction" && "in")}>
                    <NotifIcon category={n.category} />
                  </span>
                  <div>
                    <div className="notif-t">{n.title}</div>
                    <div className="notif-s">{n.body}</div>
                  </div>
                  <span className="notif-time">{relTime(n.ts)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="tb-menu-foot">
            <button
              type="button"
              onClick={onClearAll}
              disabled={notifications.length === 0}
              style={{
                background: "transparent",
                border: 0,
                font: "inherit",
                color: "var(--gold-deep)",
                fontWeight: 600,
                cursor: notifications.length === 0 ? "default" : "pointer",
                opacity: notifications.length === 0 ? 0.45 : 1,
              }}
            >
              Clear all
            </button>
          </div>
        </div>
      </div>

      <div className="tb-pop" ref={userRef}>
        <div
          className={cn("tb-user", userOpen && "open")}
          onClick={() => setUserOpen((v) => !v)}
          role="button"
          tabIndex={0}
          aria-label="Account menu"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setUserOpen((v) => !v)
            }
          }}
        >
          <div className="tb-avatar">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" />
            ) : (
              initials
            )}
          </div>
          <div className="tb-user-info">
            <div className="un">{displayName}</div>
            <div className="ur">{sessionUser?.role ?? "Personal Banking"}</div>
          </div>
          <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
        <div className={cn("tb-menu user-menu", userOpen && "open")}>
          <div className="um-head">
            <div className="tb-avatar" style={{ width: 46, height: 46 }}>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" />
              ) : (
                initials
              )}
            </div>
            <div>
              <div className="um-name">{displayName}</div>
              {emailMasked && <div className="um-email">{emailMasked}</div>}
              <span className="um-badge">{sessionUser?.role ?? "Customer"}</span>
            </div>
          </div>
          <div className="um-currency">
            <span className="um-cur-label">Display currency</span>
            <div className="um-cur-opts" role="group" aria-label="Display currency">
              {CURRENCY_OPTIONS.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  title={c.label}
                  aria-pressed={displayCurrency === c.code}
                  className={cn("um-cur-btn", displayCurrency === c.code && "active")}
                  onClick={() => setDisplayCurrency(c.code)}
                >
                  {c.code}
                </button>
              ))}
            </div>
          </div>
          <Link className="um-item" href="/profile/personal-info" onClick={() => setUserOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
            My profile
          </Link>
          <Link className="um-item" href="/profile/security" onClick={() => setUserOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            Security &amp; login
          </Link>
          <Link className="um-item" href="/home/spending/card" onClick={() => setUserOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
            Card controls
          </Link>
          <Link className="um-item" href="/profile/help" onClick={() => setUserOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4" /><path d="M12 17h.01" /></svg>
            Help &amp; support
          </Link>
          <button type="button" className="um-item danger" onClick={onSignOut}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></svg>
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}

function NotifIcon({
  category,
}: {
  category: "transaction" | "offer" | "security" | "account"
}): ReactNode {
  switch (category) {
    case "transaction":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      )
    case "security":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-4Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      )
    case "offer":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="8" width="18" height="13" rx="2" />
          <path d="M12 8v13M19 12H5M9 4a3 3 0 0 1 3 3 3 3 0 0 1 3-3" />
        </svg>
      )
    case "account":
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
        </svg>
      )
  }
}
