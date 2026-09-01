"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, Check, Info } from "lucide-react"
import {
  TOAST_BADGE,
  TOAST_BADGE_VARIANT,
  TOAST_CARD,
  TOAST_MSG,
} from "@/components/ui/toast-styles"

type Variant = "success" | "info" | "error" | "warning"
type ToastItem = {
  id: number
  message: string
  variant: Variant
}

type Ctx = {
  toast: (msg: string, opts?: { variant?: Variant; duration?: number }) => void
}

const ToastContext = createContext<Ctx | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Outside provider — fallback to a no-op in case toast() is called too early
    return { toast: () => {} } as Ctx
  }
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const toast = useCallback<Ctx["toast"]>((message, opts) => {
    const id = ++idRef.current
    const variant = opts?.variant ?? "success"
    setItems((arr) => [...arr, { id, message, variant }])
    const duration = opts?.duration ?? 3500
    window.setTimeout(() => {
      setItems((arr) => arr.filter((t) => t.id !== id))
    }, duration)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Stack items={items} />
    </ToastContext.Provider>
  )
}

function Stack({ items }: { items: ToastItem[] }) {
  // Portal into <body> so the fixed-positioned stack escapes every
  // ancestor's transform / filter / contain / will-change. Several
  // wrappers in the (app) shell use those properties (the sidebar
  // animation, the GPU-corruption fixes on cards), and any one of them
  // creates a containing block that traps `position: fixed` — so the
  // toast was anchoring to that ancestor's top edge instead of the
  // viewport top, ending up behind the topbar. With a portal the stack
  // is a direct child of <body>, so `top` is always viewport-relative.
  const [container, setContainer] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (typeof document === "undefined") return
    const el = document.createElement("div")
    el.setAttribute("data-portal", "toast-stack")
    document.body.appendChild(el)
    setContainer(el)
    return () => {
      if (el.parentNode) el.parentNode.removeChild(el)
    }
  }, [])

  if (!container) return null
  return createPortal(
    <div aria-live="polite" style={STACK_STYLE}>
      <AnimatePresence initial={false}>
        {items.map((t) => {
          const variantStyle = TOAST_BADGE_VARIANT[t.variant]
          const Icon = ICON_BY_VARIANT[t.variant]
          return (
            <motion.div
              key={t.id}
              initial={{ y: -14, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -10, opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={TOAST_CARD}
            >
              <span
                style={{ ...TOAST_BADGE, ...variantStyle }}
                aria-hidden
              >
                <Icon width={14} height={14} strokeWidth={3} />
              </span>
              <span style={TOAST_MSG}>{t.message}</span>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>,
    container,
  )
}

const ICON_BY_VARIANT = {
  success: Check,
  info: Info,
  warning: AlertCircle,
  error: AlertCircle,
} as const

/** Stack container — anchored to the TOP of the visible viewport just
 *  below the app's 72px sticky topbar. Bottom placement was hiding
 *  toasts behind Safari iOS's bottom URL bar (which isn't covered by
 *  env(safe-area-inset-bottom)).
 *
 *  The Stack is portaled into <body> in the component below, so any
 *  ancestor with transform / contain / will-change can't trap this
 *  fixed positioning to its own bounds.
 *
 *  z-index 1200 puts it above the modal scrim (1000) so toasts fired
 *  from inside a modal still appear over the dim. */
const STACK_STYLE: React.CSSProperties = {
  position: "fixed",
  // 72px topbar + 12px gap. We deliberately do NOT add
  // env(safe-area-inset-top) — the topbar already sits at viewport top
  // and accounts for the iOS notch via its own sticky positioning.
  top: 84,
  left: 12,
  right: 12,
  zIndex: 1200,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  pointerEvents: "none",
}

// Re-export a stable hook hint for files that prefer one-line imports
export type ToastFn = Ctx["toast"]

// Auto-hook for hydration safety (no-op if used in SSR shell)
export function useReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  return ready
}
