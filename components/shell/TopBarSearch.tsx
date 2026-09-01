"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"

/**
 * Desktop topbar search — a small command palette over the user's own data.
 * Queries three sources and shows grouped results in a dropdown:
 *   • Transactions   (description / merchant / counterparty / category)
 *   • Beneficiaries  (linked external accounts + cards)
 *   • Settings       (a static map of the account/settings pages)
 * Select with a click or the keyboard (↑/↓ + Enter, Esc to close) to route
 * to the relevant page. Hidden on mobile (matches the old static input).
 */

type SearchResult = {
  key: string
  group: "Transactions" | "Beneficiaries" | "Settings"
  title: string
  subtitle?: string
  trailing?: string
  href: string
  icon: ReactNode
}

const PER_GROUP = 5
const MAX_TOTAL = 14

/** Settings / account destinations, with extra keywords for fuzzy matching. */
const SETTINGS: Array<{ title: string; href: string; keywords: string }> = [
  { title: "Personal info", href: "/profile/personal-info", keywords: "personal info name address phone email profile" },
  { title: "Security & login", href: "/profile/security", keywords: "security login password pin biometric face touch id 2fa two factor authentication sessions device" },
  { title: "Notifications", href: "/profile/notifications", keywords: "notifications alerts push email preferences" },
  { title: "Appearance", href: "/profile/appearance", keywords: "appearance theme dark mode light display" },
  { title: "Privacy", href: "/profile/privacy", keywords: "privacy data sharing consent" },
  { title: "Statements", href: "/profile/documents", keywords: "statements documents pdf tax records" },
  { title: "Account details", href: "/profile/account-details", keywords: "account details number iban routing sort code" },
  { title: "Card controls", href: "/home/spending/card", keywords: "card controls freeze limits pin replace" },
  { title: "Help & support", href: "/profile/help", keywords: "help support faq contact chat" },
  { title: "Settings", href: "/profile", keywords: "settings account preferences" },
]

const ICON = {
  txn: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3v14M17 17l-4-4M17 17l4-4M7 21V7M7 7l4 4M7 7l-4 4" />
    </svg>
  ),
  bene: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </svg>
  ),
  set: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8 2 2 0 1 1-2.8 2.8 1.6 1.6 0 0 0-2.7 1.1 2 2 0 0 1-4 0 1.6 1.6 0 0 0-2.7-1.1 2 2 0 1 1-2.8-2.8A1.6 1.6 0 0 0 3 13.4a2 2 0 0 1 0-4 1.6 1.6 0 0 0 1.7-2.4 2 2 0 1 1 2.8-2.8A1.6 1.6 0 0 0 10 4.6a2 2 0 0 1 4 0 1.6 1.6 0 0 0 2.7 1.1 2 2 0 1 1 2.8 2.8 1.6 1.6 0 0 0-.1 2.5Z" />
    </svg>
  ),
} as const

function fmtAmount(amount: number): string {
  const sign = amount < 0 ? "−" : "+"
  return `${sign} $${Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function TopBarSearch() {
  const router = useRouter()
  const transactions = useStore((s) => s.transactions)
  const linkedAccounts = useStore((s) => s.linkedAccounts)

  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const txns: SearchResult[] = transactions
      .filter((t) =>
        [t.description, t.merchant, t.counterpartyName, t.category]
          .filter(Boolean)
          .some((f) => f!.toLowerCase().includes(q)),
      )
      .slice(0, PER_GROUP)
      .map((t) => ({
        key: `txn-${t.id}`,
        group: "Transactions",
        title: t.counterpartyName || t.merchant || t.description,
        subtitle: `${new Date(t.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} · ${t.status === "pending" ? "Pending" : "Posted"}`,
        trailing: fmtAmount(t.amount),
        href: "/home/spending",
        icon: ICON.txn,
      }))

    const benes: SearchResult[] = linkedAccounts
      .filter((l) => l.bank.toLowerCase().includes(q))
      .slice(0, PER_GROUP)
      .map((l) => ({
        key: `bene-${l.id}`,
        group: "Beneficiaries",
        title: l.bank,
        subtitle: `•••• ${l.mask}`,
        href: "/move/linked",
        icon: ICON.bene,
      }))

    const settings: SearchResult[] = SETTINGS.filter(
      (s) => s.title.toLowerCase().includes(q) || s.keywords.includes(q),
    )
      .slice(0, PER_GROUP)
      .map((s) => ({
        key: `set-${s.href}`,
        group: "Settings",
        title: s.title,
        href: s.href,
        icon: ICON.set,
      }))

    return [...txns, ...benes, ...settings].slice(0, MAX_TOTAL)
  }, [query, transactions, linkedAccounts])

  // Keep the highlighted row in range whenever results change.
  useEffect(() => {
    setActive(0)
  }, [query])

  // Outside-click closes the dropdown.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (open && !wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  function go(r: SearchResult) {
    setOpen(false)
    setQuery("")
    router.push(r.href)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false)
      e.currentTarget.blur()
      return
    }
    if (!results.length) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((i) => (i + 1) % results.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      const r = results[active] ?? results[0]
      if (r) go(r)
    }
  }

  const showPop = open && query.trim().length > 0

  // Group the flat list while keeping a running index for ↑/↓ highlighting.
  let runningIndex = -1

  return (
    <div className="tb-search-wrap" ref={wrapRef}>
      <div className="tb-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          placeholder="Search transactions, payees, settings…"
          aria-label="Search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {showPop && (
        <div className="tb-search-pop" role="listbox">
          {results.length === 0 ? (
            <div className="tsr-empty">No matches for “{query.trim()}”.</div>
          ) : (
            (["Transactions", "Beneficiaries", "Settings"] as const).map((group) => {
              const items = results.filter((r) => r.group === group)
              if (items.length === 0) return null
              return (
                <div key={group}>
                  <div className="tsr-group-label">{group}</div>
                  {items.map((r) => {
                    runningIndex += 1
                    const idx = runningIndex
                    return (
                      <button
                        key={r.key}
                        type="button"
                        role="option"
                        aria-selected={idx === active}
                        className={`tsr-item${idx === active ? " active" : ""}`}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => go(r)}
                      >
                        <span className="tsr-ic">{r.icon}</span>
                        <span className="tsr-main">
                          <span className="tsr-t">{r.title}</span>
                          {r.subtitle && <span className="tsr-s">{r.subtitle}</span>}
                        </span>
                        {r.trailing && <span className="tsr-amt">{r.trailing}</span>}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
