"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Globe,
  Landmark,
  Loader2,
  Printer,
  XCircle,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import {
  getTransfer,
  type TransferDetail,
} from "@/lib/transfers/api/transfers.real"
import { peekSocket, getSocket } from "@/lib/realtime/socket"
import { fmtMinor, type CurrencyCode } from "@/lib/money/currencies"

type StashedFx = {
  sendCurrency: string
  sendAmountMinor: string
  settleCurrency: string
  settleCents: string
  rate: number
  asOf: string
  source: "live" | "peg"
}

type Stashed = {
  mode: "domestic" | "international"
  beneficiaryName: string
  bankName: string
  accountNumber: string
  routingOrSwift: string
  iban: string
  country: string
  beneficiaryAddress: string
  note: string | null
  /** USD settlement amount (what debited the account). */
  amountCents: string
  feeCents: string
  /** Send currency + amount, when the wire was cross-currency. */
  sendCurrency?: string
  sendAmountMinor?: string
  fx?: StashedFx | null
  initiatedAt: string
}

/**
 * International / domestic wire receipt. Renders a Swift-style record
 * with every detail the customer needs for their records and live
 * status tracking. The status pill refreshes via two channels:
 *
 *   1. `transaction.updated` over the realtime gateway — fires when the
 *      admin reverses or admin/worker settles the wire.
 *   2. Polling once every 12 seconds as a backstop in case the WS misses
 *      an event (reconnect window, tab woken from sleep, etc.).
 *
 * Two ways to take the receipt with you:
 *   - "Save as PDF" → opens the browser print dialog scoped to the
 *     receipt card via `window.print()` plus a print-only stylesheet.
 *   - "Download .html" → snapshot the card as a self-contained HTML
 *     file that opens cleanly anywhere (and can be saved as PDF from
 *     any browser on second open).
 */
export default function WireReceiptPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const transferId = params?.id ?? ""

  const accounts = useStore((s) => s.accounts)
  const user = useStore((s) => s.session.user)

  const [transfer, setTransfer] = useState<TransferDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stashed, setStashed] = useState<Stashed | null>(null)

  // Pull the cached beneficiary details from the wire form's hand-off.
  useEffect(() => {
    if (!transferId) return
    try {
      const raw = sessionStorage.getItem(`wire:receipt:${transferId}`)
      if (raw) setStashed(JSON.parse(raw))
    } catch {
      // ignore — page still renders backend fields
    }
  }, [transferId])

  const refresh = useCallback(() => {
    if (!transferId) return
    getTransfer(transferId)
      .then(setTransfer)
      .catch(() => setError("Couldn't load the transfer details."))
  }, [transferId])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 12_000)
    return () => clearInterval(id)
  }, [refresh])

  // Listen for live status flips (admin approve / reverse, worker settle).
  useEffect(() => {
    if (!transferId) return
    let sock = peekSocket()
    if (!sock) sock = getSocket()
    function onUpdate() {
      refresh()
    }
    sock.on("transaction.updated", onUpdate)
    sock.on("transaction.settled", onUpdate)
    sock.on("account.balanceChanged", onUpdate)
    return () => {
      sock?.off("transaction.updated", onUpdate)
      sock?.off("transaction.settled", onUpdate)
      sock?.off("account.balanceChanged", onUpdate)
    }
  }, [transferId, refresh])

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === transfer?.fromAccountId),
    [accounts, transfer?.fromAccountId],
  )

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.email ||
    "customer"

  // The ledger (and the Transfer row) is USD: amount/fee/total are the USD
  // settlement figures that actually debited the account.
  const amountCents = transfer?.amountCents ?? stashed?.amountCents ?? "0"
  const feeCents = transfer?.feeCents ?? stashed?.feeCents ?? "0"
  const totalCents = (BigInt(amountCents) + BigInt(feeCents)).toString()
  // The "wire amount" the beneficiary receives, in its own currency (from
  // the FX snapshot stashed at submit). Falls back to the USD settlement.
  const sendCurrency = (stashed?.sendCurrency ?? "USD") as CurrencyCode
  const sendAmountMinor = stashed?.sendAmountMinor ?? amountCents
  const fx = stashed?.fx ?? null
  const initiatedAt = transfer?.initiatedAt ?? stashed?.initiatedAt ?? null

  if (error) {
    return (
      <div style={{ maxWidth: 440, margin: "0 auto", paddingTop: 40, textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "#B23A3A" }}>{error}</p>
        <button
          type="button"
          onClick={() => router.push("/home")}
          className="lk-cta-btn primary"
          style={{ marginTop: 16 }}
        >
          Back to home
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* Print-only stylesheet — hide app chrome, expand the receipt. */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0.5in;
          }
          body * {
            visibility: hidden !important;
          }
          .nova-receipt-print,
          .nova-receipt-print * {
            visibility: visible !important;
          }
          .nova-receipt-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: #1c1a17 !important;
          }
          .nova-receipt-print .nova-action-row {
            display: none !important;
          }
        }
      `}</style>

      <button
        type="button"
        onClick={() => router.back()}
        className="view-back print:hidden"
        aria-label="Back"
      >
        <ArrowLeft aria-hidden /> Back
      </button>

      <article
        className="nova-receipt-print"
        style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}
      >
        {/* Header */}
        <header className="rcpt-head" style={{ padding: "18px 22px" }}>
          <div className="rcpt-brand">
            {/* Plain img (sized by `.rcpt-brand img` in CSS). next/image was
                pre-shrinking the wide lockup, so it rendered blurry once
                scaled up — this matches the sidebar/homepage approach. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lapi.png" alt="State Bank" />
          </div>
          <div className="rcpt-meta">
            <span className="rcpt-pill">Wire receipt</span>
          </div>
        </header>

        {/* Hero — amount + status */}
        <section className="rcpt-hero" style={{ padding: "22px 22px 4px" }}>
          <StatusPill status={transfer?.status} />
          <div className="rcpt-amt" style={{ fontSize: 40 }}>
            {fmtMinor(sendAmountMinor, sendCurrency)}
          </div>
          <div className="rcpt-dir">
            {stashed?.mode === "international" ? (
              <>
                <Globe aria-hidden />
                International wire · SWIFT/IBAN
              </>
            ) : (
              <>
                <Landmark aria-hidden />
                Domestic wire · IBAN
              </>
            )}
          </div>
        </section>

        {/* Parties */}
        <section className="rcpt-grid" style={{ padding: "16px 22px 0" }}>
          <Card title="From">
            <Row k="Account holder" v={displayName} />
            <Row k="Account" v={fromAccount?.label ?? "Checking"} />
          </Card>
          <Card title="To">
            <Row k="Beneficiary" v={stashed?.beneficiaryName ?? ""} />
            <Row k="Bank" v={stashed?.bankName ?? ""} />
            {stashed?.mode === "domestic" ? (
              <Row k="IBAN" v={stashed.iban || ""} mono />
            ) : (
              <>
                <Row k="SWIFT/BIC" v={stashed?.routingOrSwift || ""} mono />
                <Row k="IBAN" v={stashed?.iban || ""} mono />
                {stashed?.country && (
                  <Row k="Country" v={stashed.country} />
                )}
                {stashed?.beneficiaryAddress && (
                  <Row k="Address" v={stashed.beneficiaryAddress} />
                )}
              </>
            )}
          </Card>
        </section>

        {/* Money breakdown */}
        <section style={{ padding: "10px 22px 0" }}>
          <Card title="Amounts">
            <Row
              k="Wire amount"
              v={fmtMinor(sendAmountMinor, sendCurrency)}
              mono
            />
            {fx && (
              <>
                <Row
                  k="Exchange rate"
                  v={`1 ${fx.sendCurrency} = ${fx.rate.toFixed(4)} USD`}
                />
                <Row
                  k="Converted (USD)"
                  v={fmtMinor(amountCents, "USD")}
                  mono
                />
              </>
            )}
            <Row k="Wire fee (USD)" v={fmtMinor(feeCents, "USD")} mono />
            <div style={{ marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
              <Row
                k="Total debited (USD)"
                v={fmtMinor(totalCents, "USD")}
                mono
                emphasize
              />
            </div>
          </Card>
        </section>

        {/* Timestamps + memo */}
        <section style={{ padding: "10px 22px 0" }}>
          <Card title="Timeline">
            <Row
              k="Submitted"
              v={initiatedAt ? format(new Date(initiatedAt), "PPpp") : ""}
            />
            <Row
              k="Settled"
              v={
                transfer?.settledAt
                  ? format(new Date(transfer.settledAt), "PPpp")
                  : "Pending"
              }
            />
            {transfer?.failureReason && (
              <Row k="Reason" v={transfer.failureReason} />
            )}
            {stashed?.note && <Row k="Memo / reference" v={stashed.note} />}
          </Card>
        </section>

        {/* Actions */}
        <div className="nova-action-row rcpt-actions print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="lk-cta-btn primary"
          >
            <Printer width={18} height={18} aria-hidden />
            Save as PDF
          </button>
        </div>
      </article>
    </div>
  )
}

function StatusPill({ status }: { status?: TransferDetail["status"] }) {
  if (!status) {
    return (
      <span className="rcpt-status" style={{ background: "var(--surface-2)", color: "var(--ink-mute)" }}>
        <Loader2 className="animate-spin" aria-hidden />
        Loading…
      </span>
    )
  }
  const map: Record<
    TransferDetail["status"],
    { label: string; bg: string; fg: string; Icon: typeof Clock3 }
  > = {
    pending: { label: "Awaiting settlement", bg: "rgba(154,107,23,.14)", fg: "#9A6B17", Icon: Clock3 },
    posted: { label: "Settled", bg: "rgba(47,138,90,.14)", fg: "#2F8A5B", Icon: CheckCircle2 },
    declined: { label: "Declined", bg: "rgba(178,58,58,.12)", fg: "#B23A3A", Icon: XCircle },
    reversed: { label: "Reversed", bg: "var(--surface-2)", fg: "var(--ink-mute)", Icon: XCircle },
  }
  const m = map[status]
  return (
    <span className="rcpt-status" style={{ background: m.bg, color: m.fg }}>
      <m.Icon aria-hidden />
      {m.label}
    </span>
  )
}

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rcpt-card">
      <div className="rc-title">{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {children}
      </div>
    </div>
  )
}

function Row({
  k,
  v,
  mono,
  emphasize,
}: {
  k: string
  v: string
  mono?: boolean
  emphasize?: boolean
}) {
  return (
    <div className="rcpt-row">
      <span className="rk">{k}</span>
      <span className={cn("rv", mono && "mono", emphasize && "em")}>{v}</span>
    </div>
  )
}

