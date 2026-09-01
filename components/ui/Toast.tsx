"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, Check } from "lucide-react"
import {
  TOAST_BADGE,
  TOAST_BADGE_VARIANT,
  TOAST_CARD,
  TOAST_MSG,
  TOAST_POSITION,
} from "./toast-styles"

/**
 * Single-message Toast (legacy API). Renders a State Bank-style toast — white
 * card, hairline border, soft shadow, with a green check badge for
 * success or a red alert badge for errors. Caller controls `open` +
 * `message` (+ optional `variant`); auto-dismiss is the caller's job.
 * For multi-toast queues, use `ToastProvider`'s `useToast()` instead.
 */
export function Toast({
  open,
  message,
  variant = "success",
}: {
  open: boolean
  message: string
  variant?: "success" | "error"
}) {
  // Portal into <body> so the fixed-positioned toast escapes every
  // ancestor's transform / filter / contain / will-change. The (app) shell
  // uses those (sidebar animation, the GPU-corruption card fixes), and any
  // one of them creates a containing block that traps `position: fixed` —
  // so the toast anchored to that ancestor's top and scrolled with the
  // page, ending up behind the sticky topbar (most visible on short screens
  // like the iPhone 7, which scroll more). With a portal the toast is a
  // direct child of <body>, so `top` is always viewport-relative and it
  // sits above the navbar (z-index 1100). Mirrors ToastProvider's Stack.
  const [container, setContainer] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (typeof document === "undefined") return
    const el = document.createElement("div")
    el.setAttribute("data-portal", "toast")
    document.body.appendChild(el)
    setContainer(el)
    return () => {
      if (el.parentNode) el.parentNode.removeChild(el)
    }
  }, [])

  const isError = variant === "error"
  const Icon = isError ? AlertCircle : Check

  const node = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: -16, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -10, opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          style={TOAST_POSITION}
          role={isError ? "alert" : "status"}
          aria-live={isError ? "assertive" : "polite"}
        >
          <div style={TOAST_CARD}>
            <span
              style={{
                ...TOAST_BADGE,
                ...(isError
                  ? TOAST_BADGE_VARIANT.error
                  : TOAST_BADGE_VARIANT.success),
              }}
              aria-hidden
            >
              <Icon width={14} height={14} strokeWidth={3} />
            </span>
            <span style={TOAST_MSG}>{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Until the portal container is created (first client render), render
  // nothing — `open` is virtually always false at that point anyway.
  if (!container) return null
  return createPortal(node, container)
}
