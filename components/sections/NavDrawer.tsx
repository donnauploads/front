"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { Logo } from "@/components/ui/Logo"

const PRIMARY = [
  { label: "Fee-free Banking", href: "/#fee-free" },
  { label: "Cash Back", href: "/#cashback" },
  { label: "Grow Credit", href: "/#credit" },
  { label: "Easy Savings", href: "/#savings" },
  { label: "Early Payday", href: "/#payday" },
  { label: "Membership Tiers", href: "/#tiers" },
  { label: "Member Perks", href: "/#perks" },
  { label: "Anytime Security & Support", href: "/#support" },
]

const SECONDARY = [
  { label: "About", href: "/#about" },
  { label: "Employers", href: "/#employers" },
  { label: "Login", href: "/login" },
]

export function NavDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  // Track when we're mounted client-side so the portal target exists.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Escape closes; body scroll lock applies immediately so rapid
  // open→close toggles can't race a deferred lock and leave the page
  // with `overflow: hidden` after the drawer is already gone.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  if (!mounted) return null

  const drawer = (
    <AnimatePresence>
      {open && (
        // Root is a `motion.div` with a stable `key` so AnimatePresence
        // can track presence cleanly across rapid toggles. Without
        // either, the immediate child unmounts before the inner motion
        // exit animations run, and the drawer can end up half-open if
        // the user re-clicks the hamburger mid-animation.
        <motion.div
          key="nav-drawer-root"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          className="fixed inset-0 z-[60]"
        >
          {/* Scrim — fades independently of the drawer translate so
              AnimatePresence can't strand the panel half-translated. */}
          <motion.button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 h-full w-full bg-black/30 backdrop-blur-[2px]"
          />

          {/* Drawer — single transform on its own keyed motion node. */}
          <motion.aside
            key="nav-drawer-panel"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-y-0 left-0 flex h-full w-full max-w-md flex-col overflow-y-auto bg-white text-kale shadow-[20px_0_60px_-20px_rgba(0,0,0,0.35)] will-change-transform [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-4">
              <Link href="/" onClick={onClose} aria-label="State Bank home">
                <Logo theme="light" className="text-xl sm:text-2xl" />
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-kale transition hover:bg-kale/5 active:scale-95 sm:h-10 sm:w-10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Primary list */}
            <nav className="px-5 pb-1 sm:px-6 sm:pb-2">
              <ul>
                {PRIMARY.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="block py-1.5 font-display text-lg font-bold tracking-tight text-kale transition active:scale-[0.99] hover:text-fern sm:py-2 sm:text-2xl"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Divider */}
            <div className="mx-5 my-3 border-t border-kale/10 sm:mx-6 sm:my-4" />

            {/* Secondary list */}
            <ul className="px-5 pb-4 sm:px-6 sm:pb-6">
              {SECONDARY.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className="block py-1 text-sm font-medium text-kale/85 transition hover:text-kale sm:py-1.5 sm:text-base"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Blog teaser */}
            <div className="mt-auto border-t border-kale/10 px-5 py-4 sm:px-6 sm:py-5">
              <div className="text-xs font-semibold text-kale sm:text-sm">
                In The Green Blog
              </div>
              <Link
                href="/#blog"
                onClick={onClose}
                className="mt-2 flex items-center gap-3 rounded-2xl bg-mint/40 p-2.5 ring-1 ring-kale/10 transition hover:bg-mint/60 sm:mt-3 sm:p-3"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fern to-brand-deep text-xl text-white sm:h-16 sm:w-16 sm:text-2xl">
                  ✦
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-kale/70 sm:text-[11px]">
                    State Bank Guides
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-xs font-semibold text-kale sm:text-sm">
                    What is State Bank? A bank built around how you actually live.
                  </div>
                </div>
              </Link>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Portal to <body> so the drawer escapes the `<header>` containing
  // block. When it was nested inside the fixed header, header repaints
  // (theme-on-scroll, body-overflow toggles) could clip the drawer to
  // a tiny rect at the top of the screen — that's the "stuck" state.
  return createPortal(drawer, document.body)
}
