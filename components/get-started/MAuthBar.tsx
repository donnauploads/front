"use client"

/**
 * Mobile auth header for the sign-in + sign-up routes. Mirrors the
 * marketing-bundle spec (crest + wordmark + Arabic + hamburger →
 * gold-topped dropdown). Desktop layout is unchanged; this bar only
 * renders ≤720px via the matching CSS in `signup-sb.css`.
 */

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { GuestChatModal } from "@/components/support/GuestChatModal"

export function MAuthBar() {
  const [open, setOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const rootRef = useRef<HTMLElement>(null)

  // Close on outside click — matches the assets/authbar.js behaviour
  // from the spec.
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      const root = rootRef.current
      if (!root) return
      if (!root.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("click", onDocClick)
    return () => document.removeEventListener("click", onDocClick)
  }, [open])

  return (
    <>
    <header className="m-authbar" ref={rootRef}>
      <Link
        href="/"
        className="mab-brand"
        aria-label="State Bank home"
      >
        {/* Mobile header logo — swapped to /lapi.png per the latest
            brand asset drop.
            The inline `maxHeight` is a first-paint clamp: the CSS that
            caps the logo lives inside `@media (max-width: 880px)` in
            signup-sb.css / login-sb.css, so without this safety net
            the img briefly renders at its intrinsic size before the
            media query is evaluated — that's what causes the "huge
            logo on refresh" flicker. The `≤400px` CSS rule still
            applies on top (60px < 72px), so the responsive shrink is
            preserved. */}
        <img
          className="mab-logo"
          src="/lapi.png"
          alt="State Bank"
          style={{ maxHeight: 72, width: "auto" }}
        />
      </Link>

      {/* Hamburger + dropdown menu commented out (not deleted) — replaced
          by a back-to-home button on the mobile sign-in/up header.
      <button
        type="button"
        className={cn("mab-burger", open && "active")}
        aria-label="Menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <span />
        <span />
        <span />
      </button>

      <nav className={cn("mab-menu", open && "open")}>
        <Link href="/" onClick={() => setOpen(false)}>
          Home
        </Link>
        <Link href="/login" onClick={() => setOpen(false)}>
          Sign in
        </Link>
        <Link href="/get-started" onClick={() => setOpen(false)}>
          Open an account
        </Link>
        <Link href="/#market" onClick={() => setOpen(false)}>
          Rates &amp; markets
        </Link>
        <Link href="/#news" onClick={() => setOpen(false)}>
          Newsroom
        </Link>
      </nav>
      */}

    </header>

    {/* Support launcher — a floating circular button shown at all sizes
        (mobile + desktop) for a consistent chat entry point. */}
    <button
      type="button"
      className="mab-chat-fab"
      aria-label="Chat with support"
      onClick={() => setChatOpen(true)}
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 1500,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 56,
        height: 56,
        borderRadius: "50%",
        color: "#fff",
        background: "var(--navy)",
        border: 0,
        cursor: "pointer",
        boxShadow: "0 10px 28px -8px rgba(20,33,61,.55)",
      }}
    >
      <MessageCircle width={24} height={24} aria-hidden />
    </button>

    <GuestChatModal open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  )
}
