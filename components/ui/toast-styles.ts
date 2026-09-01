/**
 * Shared inline styles for Toast + ToastProvider. Inline (not CSS
 * classes) so toasts render correctly on every route — including
 * /login, /get-started, and /(admin) — without depending on the
 * dashboard's stylesheet being loaded.
 *
 * Visual: white card, hairline border, soft drop shadow, slightly
 * rounded — matches the rest of the State Bank design (unlink modal,
 * scheduling success sheet, transaction-detail panel).
 */
import type { CSSProperties } from "react"

/** Fixed wrapper: top-right on desktop, top-center on phones. */
export const TOAST_POSITION: CSSProperties = {
  position: "fixed",
  top: 16,
  // `right: 0` + `left: 0` + flex justifies the card so it stays
  // centered on phones; on desktop a max-width keeps it tucked
  // toward the right via margin-right.
  left: 0,
  right: 0,
  // Above the modal scrim (z-index: 1000) so success/error toasts are
  // visible even while a modal is open (e.g. a failed password change).
  zIndex: 1100,
  display: "flex",
  justifyContent: "center",
  pointerEvents: "none",
  padding: "0 12px",
}

/** White card chrome. */
export const TOAST_CARD: CSSProperties = {
  pointerEvents: "auto",
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  background: "#FFFFFF",
  color: "#1C1C1A",
  border: "1px solid #ECEAE3",
  borderRadius: 12,
  padding: "10px 14px 10px 10px",
  boxShadow:
    "0 8px 24px -10px rgba(28,26,23,.22), 0 2px 6px -2px rgba(28,26,23,.08)",
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1.35,
  maxWidth: 380,
  minWidth: 0,
}

/** Circular badge holding the variant icon. */
export const TOAST_BADGE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: 999,
  flexShrink: 0,
  boxShadow: "inset 0 0 0 1px currentColor",
}

/** Variant-specific badge bg/text. The 1px inner ring uses
 *  `currentColor` so it matches the icon. */
export const TOAST_BADGE_VARIANT: Record<
  "success" | "info" | "error" | "warning",
  CSSProperties
> = {
  success: { background: "rgba(47,138,90,.14)", color: "#2F8A5B" },
  info: { background: "rgba(201,162,74,.16)", color: "#9C7B2E" },
  warning: { background: "rgba(196,154,54,.16)", color: "#9C7B2E" },
  error: { background: "rgba(178,58,58,.14)", color: "#B23A3A" },
}

export const TOAST_MSG: CSSProperties = {
  minWidth: 0,
  flex: 1,
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  wordBreak: "break-word",
}
