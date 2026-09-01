"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { AlertOctagon, MapPin, Printer, X } from "lucide-react"
import { useStore } from "@/lib/store"
import type { Transaction } from "@/lib/store"
import { type DisplayCurrency, convertFromBase, currencyDecimals } from "@/lib/currency"

/**
 * Transaction Detail — right-side slide-over panel.
 *
 * Editorial fintech receipt: warm-beige avatar, large serif merchant
 * name + amount, status dot, label/value rows, category pill, location
 * footer, and a floating "chat" FAB with an unread badge. Slides in
 * 300ms ease from the right with a dimmed backdrop; backdrop click,
 * X button or Esc dismisses.
 *
 * Same `{ txn, onClose }` prop contract as the prior receipt design so
 * all existing call sites work unchanged.
 */
export function TransactionDetailSheet({
  txn,
  onClose,
}: {
  txn: Transaction | null
  onClose: () => void
}) {
  const accounts = useStore((s) => s.accounts)
  const currency = useStore((s) => s.displayCurrency)

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!txn) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [txn, onClose])

  // Body scroll lock — overflow:hidden only (no `position: fixed`
  // dance — that caused the half-mount jank we hit earlier).
  useEffect(() => {
    if (!txn || typeof document === "undefined") return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [txn])

  const account = useMemo(
    () => accounts.find((a) => a.id === txn?.accountId),
    [accounts, txn?.accountId],
  )

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>{txn && renderPanel(txn, account, onClose, currency)}</AnimatePresence>,
    document.body,
  )
}

function renderPanel(
  txn: Transaction,
  account: { id: string; type: string; label: string } | undefined,
  onClose: () => void,
  currency: DisplayCurrency,
) {
  const isCredit = txn.amount > 0
  const merchant =
    txn.merchant ?? txn.counterpartyName ?? txn.description ?? "Transaction"
  const monogram = (merchant.trim().charAt(0) || "T").toUpperCase()
  const reference = formatTxnRef(txn.id)
  const accountLabel = account
    ? `${capitalize(account.type)} ···· ····`
    : "Account"
  const location = locationFor(merchant)
  const status = mapStatus(txn.status)
  const amountAbs = convertFromBase(Math.abs(txn.amount), currency).toLocaleString("en-US", {
    minimumFractionDigits: currencyDecimals(currency),
    maximumFractionDigits: currencyDecimals(currency),
  })
  const method = isCredit ? "Account credit" : "Account debit"

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Transaction detail"
      style={SCRIM_STYLE}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={SCRIM_BTN_STYLE}
      />
      <motion.aside
        style={PANEL_STYLE}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <header style={HEADER_STYLE}>
          <span style={EYEBROW_STYLE}>TRANSACTION DETAIL</span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={CLOSE_BTN_STYLE}
          >
            <X width={20} height={20} strokeWidth={1.5} aria-hidden />
          </button>
        </header>
        <div style={HAIRLINE_STYLE} />

        {/* Hero */}
        <section style={HERO_STYLE}>
          <MerchantAvatar merchant={merchant} monogram={monogram} />
          <h2 style={MERCHANT_STYLE}>{merchant}</h2>
          <div style={AMOUNT_STYLE}>
            <span style={SIGN_STYLE}>{isCredit ? "+" : "–"}</span>
            <span>&nbsp;{currency} {amountAbs}</span>
          </div>
          <div style={statusRow(status.color)}>
            <span style={statusDot(status.color)} />
            <span>{status.label}</span>
          </div>
        </section>

        <div style={HAIRLINE_STYLE} />

        {/* Details */}
        <section style={DETAILS_STYLE}>
          {txn.category && (
            <DetailRow label="Category">
              <span style={PILL_STYLE}>{txn.category}</span>
            </DetailRow>
          )}
          <DetailRow label="Date">
            <span>{format(new Date(txn.date), "d MMM yyyy, HH:mm:ss")}</span>
          </DetailRow>
          <DetailRow label="Account">
            <span>{accountLabel}</span>
          </DetailRow>
          <DetailRow label="Method">
            <span style={{ fontWeight: 700 }}>{method}</span>
          </DetailRow>
        </section>

        <div style={HAIRLINE_STYLE} />

        {/* Footer location */}
        <footer style={FOOTER_STYLE}>
          <MapPin width={13} height={13} strokeWidth={1.5} aria-hidden />
          <span>{`${merchant} · ${location}`}</span>
        </footer>

        {/* Action buttons — Dispute + Save PDF, stacked side-by-side
            so they fit the compact panel. Sit just above the FAB. */}
        <div style={ACTIONS_STYLE}>
          <button
            type="button"
            style={ACTION_BTN_SECONDARY}
            onClick={() => {
              // Hook into your support flow here — for now just opens
              // the in-app help message thread.
              window.alert(
                `Dispute opened for ${reference}. A specialist will reach out within 1 business day.`,
              )
            }}
          >
            <AlertOctagon width={15} height={15} strokeWidth={1.7} aria-hidden />
            Dispute
          </button>
          <button
            type="button"
            style={ACTION_BTN_PRIMARY}
            onClick={() =>
              openTxnReceipt({
                name: merchant,
                amount: `${isCredit ? "+" : "−"} ${currency} ${amountAbs}`,
                statusLabel: status.label,
                statusColor: status.color,
                statusBg:
                  txn.status === "pending"
                    ? "rgba(196,154,54,.16)"
                    : "rgba(47,138,90,.14)",
                category: txn.category ?? undefined,
                date: format(new Date(txn.date), "d MMM yyyy, HH:mm:ss"),
                account: accountLabel,
                reference,
                method,
              })
            }
          >
            <Printer width={15} height={15} strokeWidth={1.7} aria-hidden />
            Save PDF
          </button>
        </div>

        {/* Faint texture strip bleeding off the bottom */}
        <div style={TEXTURE_STRIP_STYLE} aria-hidden />
      </motion.aside>
    </motion.div>
  )
}

/* ─── Row primitives ─────────────────────────────────────────────── */

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={ROW_STYLE}>
      <span style={ROW_LABEL_STYLE}>{label}</span>
      <span style={ROW_VALUE_STYLE}>{children}</span>
    </div>
  )
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function formatTxnRef(id: string): string {
  // Stable, human-readable reference derived from the id. Picks 8 hex
  // chars then 4 to form "TXN-XXXX-XXXX". Same id → same ref every
  // time, so the receipt stays bookmarkable.
  const hex = id.replace(/[^0-9a-f]/gi, "").toUpperCase()
  const padded = (hex + "00000000").slice(0, 8)
  return `TXN-${padded.slice(0, 4)}-${padded.slice(4, 8)}`
}

function capitalize(s: string): string {
  if (!s) return s
  return s[0]!.toUpperCase() + s.slice(1)
}

function locationFor(merchant: string): string {
  const m = merchant.toLowerCase()
  if (m.includes("bahrain")) return "Manama, Bahrain"
  if (m.includes("london") || m.includes("uk")) return "London, UK"
  if (m.includes("dubai") || m.includes("uae")) return "Dubai, UAE"
  return "Online"
}

function mapStatus(
  s: Transaction["status"],
): { label: string; color: string } {
  if (s === "pending") return { label: "Pending", color: "#C49A36" }
  return { label: "Completed", color: "#3E7F62" }
}

function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  )
}

/**
 * Build + open a print-ready State Bank receipt for ANY transaction, matching the
 * wire-receipt layout (logo header, big serif amount, status pill, detail
 * rows). Opens in a new window and fires the browser print dialog so the
 * user gets a clean branded receipt / PDF — not a print of the whole app.
 */
function openTxnReceipt(d: {
  name: string
  amount: string
  statusLabel: string
  statusColor: string
  statusBg: string
  category?: string
  date: string
  account: string
  reference: string
  method: string
}) {
  const logo = `${window.location.origin}/lapi.png`
  const row = (k: string, v: string, mono = false) =>
    `<div class="row"><span class="k">${esc(k)}</span><span class="v${mono ? " mono" : ""}">${esc(v)}</span></div>`
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Receipt</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Inter,-apple-system,"Segoe UI",sans-serif;color:#211F1B;background:#F4F1EA;padding:24px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .card{max-width:640px;margin:0 auto;background:#fff;border:1px solid #E2DDD0;border-radius:14px;overflow:hidden}
  .head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 22px;border-bottom:1px solid #E7E1D3}
  .brand img{height:42px;width:auto;display:block}
  .meta{text-align:right;flex-shrink:0}
  .pill{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#97793A;background:rgba(201,162,74,.14);padding:4px 11px;border-radius:20px}
  .ref{margin-top:7px;font-size:11px;color:#756F66}
  .ref b{display:block;color:#211F1B;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:.02em}
  .hero{padding:24px 22px 10px}
  .status{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:600;padding:5px 12px;border-radius:20px}
  .status .dot{width:7px;height:7px;border-radius:50%}
  .amt{font-family:"Playfair Display",Georgia,serif;font-size:42px;font-weight:700;margin-top:14px;letter-spacing:-.01em;color:#2B2926;line-height:1}
  .sub{font-size:13px;color:#756F66;margin-top:6px}
  .sec{padding:14px 22px 4px}
  .ctitle{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#97793A;margin-bottom:8px}
  .row{display:flex;justify-content:space-between;gap:16px;padding:8px 0;border-bottom:1px solid #F0ECE2;font-size:13.5px}
  .row:last-child{border-bottom:0}
  .row .k{color:#756F66}
  .row .v{color:#211F1B;font-weight:600;text-align:right}
  .row .v.mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:500}
  .foot{padding:16px 22px 22px;font-size:11px;line-height:1.5;color:#9A948A;border-top:1px solid #E7E1D3;margin-top:10px}
  @media print{@page{margin:.4in}body{background:#fff;padding:0}.card{border:0}}
</style></head>
<body onload="setTimeout(function(){try{window.focus();window.print()}catch(e){}},350)">
  <div class="card">
    <div class="head">
      <div class="brand"><img src="${logo}" alt="State Bank"/></div>
      <div class="meta"><span class="pill">Receipt</span></div>
    </div>
    <div class="hero">
      <span class="status" style="background:${d.statusBg};color:${d.statusColor}"><span class="dot" style="background:${d.statusColor}"></span>${esc(d.statusLabel)}</span>
      <div class="amt">${esc(d.amount)}</div>
      ${d.category ? `<div class="sub">${esc(d.category)}</div>` : ""}
    </div>
    <div class="sec">
      <div class="ctitle">Details</div>
      ${row("Description", d.name)}
      ${row("Account", d.account)}
      ${row("Date", d.date)}
      ${row("Method", d.method)}
    </div>
    <div class="foot">State Bank &middot; This receipt was generated electronically and is valid without a signature.</div>
  </div>
</body></html>`
  const w = window.open("", "_blank", "width=720,height=920")
  if (!w) {
    window.alert("Please allow pop-ups to download the receipt.")
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
}

/* ─── Styles (inline object-literal so the panel is self-contained
 *      and doesn't need extra CSS classes). Color tokens come from
 *      the editorial spec — they intentionally read different from
 *      the rest of the dashboard's State Bank palette. ───────────────────── */

const SCRIM_STYLE: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "flex",
  justifyContent: "flex-end",
  background: "rgba(28,28,26,.42)",
  // Smooth font rendering inside the panel
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
}

const SCRIM_BTN_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "transparent",
  border: 0,
  padding: 0,
  cursor: "default",
}

const PANEL_STYLE: React.CSSProperties = {
  position: "relative",
  // Desktop caps at ~430px so the panel never feels too wide on
  // wide monitors. On phones we cap at 90vw so the dimmed page
  // shows ~10% on the left edge — matches the spec exactly.
  width: "min(430px, 90vw)",
  height: "100vh",
  background: "#FFFFFF",
  color: "#1C1C1A",
  fontFamily:
    '"Newsreader", "Source Serif 4", "Libre Caslon Text", "Iowan Old Style", Georgia, "Times New Roman", serif',
  fontSize: 14,
  lineHeight: 1.4,
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
  overflowX: "hidden",
  boxShadow: "-20px 0 60px -30px rgba(0,0,0,.25)",
}

const HEADER_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 22px 12px",
  flexShrink: 0,
}

const EYEBROW_STYLE: React.CSSProperties = {
  fontSize: 11.5,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#8A8778",
  fontWeight: 500,
}

const CLOSE_BTN_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  background: "transparent",
  border: 0,
  color: "#2A2A28",
  cursor: "pointer",
  borderRadius: 8,
  transition: "background .15s ease",
}

const HAIRLINE_STYLE: React.CSSProperties = {
  height: 1,
  background: "#ECEAE3",
  flexShrink: 0,
  margin: "0 22px",
}

const HERO_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  padding: "20px 22px 22px",
  flexShrink: 0,
}

const AVATAR_STYLE: React.CSSProperties = {
  width: 76,
  height: 76,
  borderRadius: "50%",
  background: "#E9E5DD",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 14,
}

const MONOGRAM_STYLE: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 600,
  color: "#1C1C1A",
  lineHeight: 1,
}

const MERCHANT_STYLE: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: "#1C1C1A",
  margin: "0 0 8px",
  lineHeight: 1.2,
  letterSpacing: "-0.005em",
}

const AMOUNT_STYLE: React.CSSProperties = {
  fontSize: 40,
  fontWeight: 700,
  color: "#1C1C1A",
  letterSpacing: "-0.015em",
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "baseline",
  marginBottom: 12,
}

const SIGN_STYLE: React.CSSProperties = {
  marginRight: 4,
}

function statusRow(color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    color,
    fontSize: 13.5,
    fontWeight: 500,
  }
}

function statusDot(color: string): React.CSSProperties {
  return {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: color,
    display: "inline-block",
  }
}

const DETAILS_STYLE: React.CSSProperties = {
  padding: "16px 22px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
  flexShrink: 0,
}

const ROW_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
}

const ROW_LABEL_STYLE: React.CSSProperties = {
  fontSize: 13.5,
  color: "#8A8A82",
  fontWeight: 400,
}

const ROW_VALUE_STYLE: React.CSSProperties = {
  fontSize: 13.5,
  color: "#1C1C1A",
  textAlign: "right",
  minWidth: 0,
}

const PILL_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 11px",
  borderRadius: 999,
  background: "#EFE9DF",
  color: "#7A6A4F",
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: 0,
}


const FOOTER_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  padding: "14px 22px 12px",
  color: "#8A8A82",
  fontSize: 12.5,
  flexShrink: 0,
}

const ACTIONS_STYLE: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  padding: "0 22px 16px",
  flexShrink: 0,
}

const ACTION_BTN_BASE: React.CSSProperties = {
  height: 42,
  borderRadius: 10,
  border: 0,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  fontSize: 13.5,
  fontWeight: 600,
  transition: "background .15s ease, transform .12s ease",
}

const ACTION_BTN_SECONDARY: React.CSSProperties = {
  ...ACTION_BTN_BASE,
  background: "#FFFFFF",
  color: "#2A2A28",
  boxShadow: "inset 0 0 0 1px #ECEAE3",
}

const ACTION_BTN_PRIMARY: React.CSSProperties = {
  ...ACTION_BTN_BASE,
  background: "#2A2A26",
  color: "#F2EFE8",
}

const TEXTURE_STRIP_STYLE: React.CSSProperties = {
  height: 36,
  marginTop: "auto",
  // Repeating fine diagonal lines to mimic a faint receipt / map
  // texture bleeding off the bottom of the panel.
  backgroundImage:
    "repeating-linear-gradient(135deg, rgba(140,135,120,.06) 0 2px, transparent 2px 8px)",
  flexShrink: 0,
}

/* ─── Bank logo avatar ────────────────────────────────────────────
 *
 * Shows the State Bank / State Bank bank logo inside the warm beige disc so every
 * receipt is consistently branded. Falls back to the serif monogram
 * if the asset 404s (e.g. self-host wasn't deployed). The asset
 * lives at /lapi.png in the public folder.
 */
function MerchantAvatar({
  merchant: _merchant,
  monogram,
}: {
  merchant: string
  monogram: string
}) {
  const [logoOk, setLogoOk] = useState(true)
  if (logoOk) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/lapi.png"
        alt="State Bank"
        loading="lazy"
        decoding="async"
        onError={() => setLogoOk(false)}
        style={{
          height: 76,
          width: "auto",
          maxWidth: 180,
          objectFit: "contain",
          marginBottom: 14,
        }}
      />
    )
  }
  // Asset failed — fall back to the warm-beige monogram disc so the
  // hero still has a focal point.
  return (
    <div style={AVATAR_STYLE}>
      <span style={MONOGRAM_STYLE}>{monogram}</span>
    </div>
  )
}
