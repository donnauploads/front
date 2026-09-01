"use client"

/**
 * Marketing-nav drawer that matches the State Bank homepage
 * burger menu. Used inside the get-started + signup flows so the header
 * dropdown reads identically to the public site (Personal / Business /
 * Cards & Payments / Wealth / Help / About + Log in CTA), rather than
 * falling back to the old `NavDrawer`.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronDown, LogIn, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Section = {
  label: string
  items: { label: string; href: string }[]
}

const SECTIONS: Section[] = [
  {
    label: "Personal",
    items: [
      { label: "Current Accounts", href: "/#products" },
      { label: "Savings & Deposits", href: "/#products" },
      { label: "Credit & Debit Cards", href: "/#products" },
      { label: "Personal Loans", href: "/#products" },
      { label: "Home Loans", href: "/#products" },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Business Accounts", href: "/#products" },
      { label: "Merchant Services", href: "/#products" },
      { label: "Trade Finance", href: "/#products" },
      { label: "Business Loans", href: "/#products" },
      { label: "Corporate Banking", href: "/#products" },
    ],
  },
  {
    label: "Cards & Payments",
    items: [
      { label: "Debit & Credit Cards", href: "/#products" },
      { label: "Send Money Abroad", href: "/#market" },
      { label: "Foreign Exchange", href: "/#market" },
      { label: "Travel & Multi-Currency", href: "/#products" },
      { label: "Apple Pay & Google Pay", href: "/#products" },
    ],
  },
  {
    label: "Wealth",
    items: [
      { label: "Savings & Fixed Deposits", href: "/#products" },
      { label: "Investments", href: "/#products" },
      { label: "Premier Banking", href: "/#products" },
      { label: "Insurance", href: "/#products" },
    ],
  },
]

const FLAT: { label: string; href: string }[] = [
  { label: "Help", href: "/#consultations" },
  { label: "About Us", href: "/#news" },
]

export function SbDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  // Lock body scroll while the drawer is open and reset accordion state
  // each time it's reopened — feels less stale than carrying it across.
  useEffect(() => {
    if (!open) {
      setExpanded(null)
      return
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      <div
        className={cn("sb-drawer-backdrop", open && "open")}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={cn("sb-drawer", open && "open")}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="sb-drawer-head">
          <span className="sb-drawer-title">Menu</span>
          <button
            type="button"
            className="sb-drawer-close"
            aria-label="Close menu"
            onClick={onClose}
          >
            <X aria-hidden />
          </button>
        </div>

        <nav className="sb-drawer-nav" aria-label="Primary">
          {SECTIONS.map((s) => {
            const isOpen = expanded === s.label
            return (
              <div
                key={s.label}
                className={cn("sb-drawer-section", isOpen && "open")}
              >
                <button
                  type="button"
                  className="sb-drawer-row"
                  onClick={() =>
                    setExpanded((prev) => (prev === s.label ? null : s.label))
                  }
                  aria-expanded={isOpen}
                >
                  <span>{s.label}</span>
                  <ChevronDown className="sb-drawer-chev" aria-hidden />
                </button>
                {isOpen && (
                  <div className="sb-drawer-sub">
                    {s.items.map((it) => (
                      <Link
                        key={it.label}
                        href={it.href}
                        className="sb-drawer-sub-link"
                        onClick={onClose}
                      >
                        {it.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {FLAT.map((it) => (
            <Link
              key={it.label}
              href={it.href}
              className="sb-drawer-row solo"
              onClick={onClose}
            >
              {it.label}
            </Link>
          ))}
        </nav>

        <div className="sb-drawer-foot">
          <Link href="/login" className="sb-drawer-cta" onClick={onClose}>
            <LogIn className="h-4 w-4" aria-hidden />
            Log in
          </Link>
        </div>
      </aside>
    </>
  )
}
