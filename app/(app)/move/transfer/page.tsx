"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  CreditCard,
  Landmark,
  PiggyBank,
  Wallet,
} from "lucide-react"
import { useStore } from "@/lib/store"
import type { Account } from "@/lib/store"
import { convertToBase, formatMoney } from "@/lib/currency"
import { cn, formatNumericInput, unformatNumericInput } from "@/lib/utils"
import { Toast } from "@/components/ui/Toast"
import { ApiError } from "@/lib/api/errors"
import { AuthorizeTransfer } from "@/components/security/AuthorizeTransfer"
import {
  TransfersBlockedModal,
  isTransfersBlockedError,
} from "@/components/security/TransfersBlockedModal"
import {
  initiateTransfer,
  type TransferKind,
} from "@/lib/transfers/api/transfers.real"
import {
  listMyLinkedAccounts,
  type RealLinkedAccountDto,
} from "@/lib/move/api/link-auth.real"
import { INSTITUTIONS, logoUrl } from "@/lib/move/api/institutions"

/**
 * Universal transfer page — ported to the design's `view-transfer`
 * markup. Same state machine, validation, API surface, and overlays as
 * before; only the render tree changed. Frequency selector is rendered
 * per the design but Weekly/Monthly route the user to /move/recurring
 * (the existing recurring CRUD page) since this endpoint only does
 * one-shot transfers.
 *
 * Backend routing — no schema changes; reuses existing kinds:
 *   - Bank → Bank    → kind="internal", toAccountId
 *   - Bank → Linked  → kind="ach_out",  externalRef
 *   - Linked → Bank  → kind="ach_in",   externalRef
 *   - Linked → Linked → blocked at validation (no Bank side to anchor)
 */

type SbOpt = {
  kind: "nova"
  id: string
  label: string
  sub: string
  account: Account
}
type LinkedOpt = {
  kind: "linked"
  id: string
  label: string
  sub: string
  linked: RealLinkedAccountDto
  domain: string | null
  isCard: boolean
}
type Option = SbOpt | LinkedOpt

type Frequency = "once" | "weekly" | "monthly"

export default function TransferPage() {
  const router = useRouter()
  const accounts = useStore((s) => s.accounts)
  const transfersLocked = useStore((s) => s.transfersLocked)
  const currency = useStore((s) => s.displayCurrency)

  const [linked, setLinked] = useState<RealLinkedAccountDto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [fromId, setFromId] = useState<string>("")
  const [toId, setToId] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [frequency, setFrequency] = useState<Frequency>("once")
  const [pickerSide, setPickerSide] = useState<"from" | "to" | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [blockedOpen, setBlockedOpen] = useState(false)
  const [toast, setToast] = useState({ open: false, msg: "" })
  // Set once a transfer completes — swaps the form for the success screen.
  // Captured at success time so it's stable even if form state changes.
  const [result, setResult] = useState<{
    amountStr: string
    fromLabel: string
    toLabel: string
    /** Transfers to a linked account are held for admin approval. */
    pendingReview: boolean
  } | null>(null)
  // Buffer the summary until the PIN modal finishes its spinner → checkmark
  // and dismisses. The transfer promise resolves DURING the spinner, so if we
  // set `result` there the success screen would flash behind the still-
  // spinning modal. We stash it here and reveal it from the modal's onCancel
  // (which fires only after the success animation).
  const pendingResultRef = useRef<{
    amountStr: string
    fromLabel: string
    toLabel: string
    pendingReview: boolean
  } | null>(null)

  // Approved linked accounts only — pending / rejected can't move
  // money. Retry once on first failure so React StrictMode's double-
  // invoked effects don't surface a benign 401-race as an error banner.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadErr(null)
    async function load(attempt = 0): Promise<void> {
      try {
        const rows = await listMyLinkedAccounts()
        if (cancelled) return
        setLinked(rows.filter((r) => r.status === "connected"))
        setLoadErr(null)
      } catch (e) {
        if (cancelled) return
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 200))
          if (cancelled) return
          return load(1)
        }
        setLoadErr(
          e instanceof ApiError ? e.message : "Couldn't load linked accounts.",
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const sbOpts: SbOpt[] = useMemo(
    () =>
      accounts.map((a) => ({
        kind: "nova" as const,
        id: a.id,
        label: a.label,
        sub: `${capitalize(a.type)} · ${formatMoney(a.balance, currency)}`,
        account: a,
      })),
    [accounts, currency],
  )

  const linkedOpts: LinkedOpt[] = useMemo(
    () =>
      linked.map((l) => {
        const inst = INSTITUTIONS.find((i) => i.id === l.institutionId)
        return {
          kind: "linked" as const,
          id: l.id,
          label: l.institutionName,
          sub: `${capitalize(l.accountType)} •••• ${l.mask}`,
          linked: l,
          domain: inst?.domain ?? null,
          isCard: l.institutionId.startsWith("card:"),
        }
      }),
    [linked],
  )

  const allOpts: Option[] = useMemo(
    () => [...sbOpts, ...linkedOpts],
    [sbOpts, linkedOpts],
  )

  const fromOpt = allOpts.find((o) => o.id === fromId) ?? null
  const toOpt = allOpts.find((o) => o.id === toId) ?? null

  // Sensible defaults once data lands: From = Checking, To = Savings.
  useEffect(() => {
    if (!fromId) {
      const checking = accounts.find((a) => a.type === "checking")
      if (checking) setFromId(checking.id)
    }
    if (!toId) {
      const savings = accounts.find((a) => a.type === "savings")
      if (savings) setToId(savings.id)
    }
  }, [accounts, fromId, toId])

  // The user types in their DISPLAY currency; `amountNum` is therefore in
  // display units. `amountBase` is the USD-ledger value used for balance
  // checks and the actual transfer.
  const amountNum = parseFloat(unformatNumericInput(amount))
  const amountValid = Number.isFinite(amountNum) && amountNum > 0
  const amountBase = amountValid ? convertToBase(amountNum, currency) : 0
  const amountStr = amountValid
    ? amountNum.toLocaleString("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
      })
    : "$0.00"

  const sameAccount = fromId && toId && fromId === toId
  const bothLinked =
    fromOpt?.kind === "linked" && toOpt?.kind === "linked"
  // Overdraft only checkable when source is a Bank account (we don't
  // know linked-account balances client-side).
  const overdraft =
    fromOpt?.kind === "nova" &&
    amountValid &&
    fromOpt.account.balance < amountBase

  const reasons: string[] = []
  if (!fromId || !toId) reasons.push("Pick both accounts.")
  if (sameAccount) reasons.push("Source and destination must differ.")
  if (bothLinked) reasons.push("At least one side must be a Bank account.")
  if (!amountValid) reasons.push("Enter an amount.")
  if (overdraft) reasons.push("Insufficient balance.")
  const canSubmit = reasons.length === 0

  // Pick the most actionable warning to show in the gold callout.
  const warnMsg: string | null =
    bothLinked
      ? "At least one side must be a Bank account."
      : overdraft && fromOpt?.kind === "nova"
        ? `Insufficient balance, ${fromOpt.label} has ${formatMoney(fromOpt.account.balance, currency)}.`
        : null

  const flash = useCallback((msg: string) => {
    setToast({ open: true, msg })
    setTimeout(() => setToast({ open: false, msg: "" }), 3500)
  }, [])

  async function runTransfer(elevationToken: string) {
    if (!fromOpt || !toOpt) return
    const amountCents = String(Math.round(amountBase * 100))
    const route = routeTransfer({ from: fromOpt, to: toOpt })
    try {
      await initiateTransfer({
        fromAccountId: route.fromAccountId,
        ...(route.toAccountId ? { toAccountId: route.toAccountId } : {}),
        kind: route.kind,
        amountCents,
        ...(route.externalRef ? { externalRef: route.externalRef } : {}),
        elevationToken,
      })
    } catch (err) {
      if (isTransfersBlockedError(err)) {
        setBlockedOpen(true)
        throw new Error("")
      }
      throw err
    }
    // Success. Stash a summary; the AuthorizeTransfer overlay finishes its
    // spinner → checkmark and then calls onCancel, which reveals the success
    // screen (we no longer bounce to /move here). Transfers to a linked
    // account (ach_out) are held for admin approval; internal moves settle now.
    pendingResultRef.current = {
      amountStr,
      fromLabel: fromOpt.label,
      toLabel: toOpt.label,
      pendingReview: route.kind === "ach_out",
    }
  }

  function swap() {
    const f = fromId
    setFromId(toId)
    setToId(f)
  }

  // Compute submit label per design ("Enter an amount" / "Pick accounts"
  // / "Transfer $X.XX").
  const submitLabel = !amountValid
    ? "Enter an amount"
    : !fromId || !toId
      ? "Pick both accounts"
      : sameAccount
        ? "Source = destination"
        : bothLinked
          ? "Pick a Bank account"
          : overdraft
            ? "Insufficient balance"
            : `Transfer ${amountStr}`

  function onPickFrequency(next: Frequency) {
    if (next === "once") {
      setFrequency(next)
      return
    }
    // Recurring isn't part of this page's API — bounce to the dedicated
    // recurring CRUD route. No state change here.
    flash("Recurring transfers are set up here →")
    setTimeout(() => router.push("/move/recurring"), 400)
  }

  return (
    <>
      {!result && (
      <div className="xfer">
        <button
          type="button"
          onClick={() => router.back()}
          className="view-back"
          aria-label="Back"
        >
          <ArrowLeft aria-hidden /> Back
        </button>

        <div className="page-head xfer-page-head">
          <h2>Transfer</h2>
          <p className="ph-sub">
            Move money between your bank accounts and approved linked
            accounts or cards.
          </p>
        </div>

        {/* Amount entry — gold-cursored number input */}
        <div className="xfer-amount">
          <div className="xa-label">Sending</div>
          <div className="xa-entry">
            <span className="xa-cur">{currency}</span>
            <input
              type="text"
              inputMode="decimal"
              aria-label="Amount to send"
              className={cn("xa-input", !amountValid && "zero")}
              value={amount ? formatNumericInput(amount) : ""}
              placeholder="0.00"
              onChange={(e) =>
                setAmount(
                  formatNumericInput(e.target.value.replace(/^\$/, "")),
                )
              }
            />
          </div>
        </div>

        {/* From */}
        <AccountPickerBlock
          side="from"
          option={fromOpt}
          loading={loading}
          open={pickerSide === "from"}
          onToggle={() => setPickerSide(pickerSide === "from" ? null : "from")}
          onClose={() => setPickerSide(null)}
          sbOpts={sbOpts}
          linkedOpts={linkedOpts}
          selectedId={fromId}
          disabledId={toId}
          onPick={(opt) => {
            setFromId(opt.id)
            setPickerSide(null)
          }}
        />

        <button
          type="button"
          className="xfer-swap"
          aria-label="Swap from and to"
          onClick={swap}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
          </svg>
        </button>

        {/* To */}
        <AccountPickerBlock
          side="to"
          option={toOpt}
          loading={loading}
          open={pickerSide === "to"}
          onToggle={() => setPickerSide(pickerSide === "to" ? null : "to")}
          onClose={() => setPickerSide(null)}
          sbOpts={sbOpts}
          linkedOpts={linkedOpts}
          selectedId={toId}
          disabledId={fromId}
          onPick={(opt) => {
            setToId(opt.id)
            setPickerSide(null)
          }}
        />

        {/* Frequency */}
        <div className="xfer-freq" role="radiogroup" aria-label="Transfer frequency">
          {(["once", "weekly", "monthly"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={frequency === f}
              className={cn("xf-opt", frequency === f && "selected")}
              onClick={() => onPickFrequency(f)}
            >
              {f === "once" ? "One-time" : capitalize(f)}
            </button>
          ))}
        </div>
        <div className="xfer-freq-note">
          {frequency === "once" ? (
            <>For repeating transfers, use <Link href="/move/recurring" style={{ color: "var(--gold-deep)", fontWeight: 600 }}>Recurring transfers</Link>.</>
          ) : null}
        </div>

        {loadErr && (
          <div className="xfer-warn show" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>{loadErr}</span>
          </div>
        )}
        {warnMsg && (
          <div className="xfer-warn show" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>{warnMsg}</span>
          </div>
        )}

        <button
          type="button"
          className={cn("xfer-submit", canSubmit && "ready")}
          disabled={!canSubmit}
          onClick={() => {
            if (transfersLocked) {
              setBlockedOpen(true)
              return
            }
            setAuthOpen(true)
          }}
        >
          {submitLabel}
        </button>
      </div>
      )}

      {result && (
        <div className="xfer">
          <button
            type="button"
            onClick={() => router.push("/move")}
            className="view-back"
            aria-label="Back to Move money"
          >
            <ArrowLeft aria-hidden /> Move money
          </button>
          <div
            style={{
              marginTop: 40,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--gold-deep)",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check width={32} height={32} strokeWidth={3} aria-hidden />
            </div>
            <div
              style={{
                marginTop: 16,
                fontSize: 24,
                fontWeight: 700,
                color: "var(--text-strong)",
              }}
            >
              {result.amountStr} {result.pendingReview ? "submitted" : "sent"}
            </div>
            <div
              style={{
                marginTop: 8,
                maxWidth: 380,
                fontSize: 14,
                color: "var(--ink-mute)",
                lineHeight: 1.5,
              }}
            >
              {result.pendingReview
                ? `Your transfer to ${result.toLabel} is pending approval — we'll send it once a reviewer approves.`
                : `Your transfer from ${result.fromLabel} to ${result.toLabel} is on the way.`}
            </div>
            <button
              type="button"
              onClick={() => router.push("/move")}
              className="lk-cta-btn primary"
              style={{ marginTop: 24, maxWidth: 380 }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      <AuthorizeTransfer
        open={authOpen}
        amountLabel={
          amountValid
            ? `${amountStr}${toOpt ? ` to ${toOpt.label}` : ""}`
            : undefined
        }
        processingLabel="Transferring…"
        processingSubLabel={
          fromOpt && toOpt
            ? `${fromOpt.label} → ${toOpt.label}`
            : "Moving your money"
        }
        successLabel="Transfer sent"
        successSubLabel="The funds are on the way"
        processingMinMs={3000}
        onCancel={() => {
          setAuthOpen(false)
          // Fired after the success animation (promise mode) OR on a real
          // cancel. Only the former leaves a buffered result behind.
          if (pendingResultRef.current) {
            setResult(pendingResultRef.current)
            pendingResultRef.current = null
          }
        }}
        onAuthorized={runTransfer}
      />

      <TransfersBlockedModal
        open={blockedOpen}
        onClose={() => setBlockedOpen(false)}
      />

      <Toast open={toast.open} message={toast.msg} />
    </>
  )
}

/* ─── Account picker (xa-summary trigger + xa-picker dropdown) ─── */

function AccountPickerBlock({
  side,
  option,
  loading,
  open,
  onToggle,
  onClose,
  sbOpts,
  linkedOpts,
  selectedId,
  disabledId,
  onPick,
}: {
  side: "from" | "to"
  option: Option | null
  loading: boolean
  open: boolean
  onToggle: () => void
  onClose: () => void
  sbOpts: SbOpt[]
  linkedOpts: LinkedOpt[]
  selectedId: string
  disabledId: string
  onPick: (o: Option) => void
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  const badge = !option ? null : option.kind === "nova" ? "Bank" : "Linked"
  const sideLabel = side === "from" ? "From" : "To"

  return (
    <div
      ref={wrapperRef}
      className={cn("xfer-acct", open && "open")}
      data-side={side}
    >
      <button
        type="button"
        className="xa-summary"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={onToggle}
      >
        <OptionAvatar option={option} />
        <span className="xa-info">
          <span className="xa-top">
            {sideLabel}
            {badge && (
              <span
                className={cn("xa-badge", option?.kind === "linked" && "linked")}
              >
                {badge}
              </span>
            )}
          </span>
          {option ? (
            <>
              <span className="xa-name">{option.label}</span>
              <span className="xa-sub">{option.sub}</span>
            </>
          ) : (
            <span className="xa-name">
              {loading ? "Loading…" : "Choose account"}
            </span>
          )}
        </span>
        <svg
          className="xa-chev"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div
        className="xa-picker"
        role="listbox"
        aria-label={`Transfer ${sideLabel.toLowerCase()}`}
      >
        {sbOpts.length > 0 && (
          <>
            <div className="xa-group">Bank accounts</div>
            {sbOpts.map((o) => (
              <PickerRow
                key={o.id}
                option={o}
                selected={o.id === selectedId}
                disabled={o.id === disabledId}
                onPick={onPick}
              />
            ))}
          </>
        )}
        {linkedOpts.length > 0 && (
          <>
            <div className="xa-group">Linked accounts &amp; cards</div>
            {linkedOpts.map((o) => (
              <PickerRow
                key={o.id}
                option={o}
                selected={o.id === selectedId}
                disabled={o.id === disabledId}
                onPick={onPick}
              />
            ))}
          </>
        )}
        {!loading && sbOpts.length === 0 && linkedOpts.length === 0 && (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "var(--ink-mute)",
              fontSize: 14,
            }}
          >
            No accounts available.
          </div>
        )}
      </div>
    </div>
  )
}

function PickerRow({
  option,
  selected,
  disabled,
  onPick,
}: {
  option: Option
  selected: boolean
  disabled: boolean
  onPick: (o: Option) => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={disabled}
      onClick={() => onPick(option)}
      className={cn("xa-opt", selected && "selected", disabled && "inuse")}
    >
      <OptionAvatar option={option} />
      <span className="xa-info">
        <span className="xo-name">
          {option.label}
          {disabled && <span className="xo-tag">In use</span>}
        </span>
        <span className="xo-sub">{option.sub}</span>
      </span>
      <span className="xa-check" aria-hidden>
        <Check strokeWidth={3} />
      </span>
    </button>
  )
}

/* ─── Avatars ────────────────────────────────────────────────────── */

function OptionAvatar({ option }: { option: Option | null }) {
  if (!option) {
    return (
      <span className="xa-ic" aria-hidden>
        <Wallet />
      </span>
    )
  }
  if (option.kind === "nova") {
    const Icon =
      option.account.type === "savings"
        ? PiggyBank
        : option.account.type === "credit_builder"
          ? CreditCard
          : Wallet
    return (
      <span className="xa-ic gold" aria-hidden>
        <Icon />
      </span>
    )
  }
  return <LinkedAvatar opt={option} />
}

function LinkedAvatar({ opt }: { opt: LinkedOpt }) {
  const [logoOk, setLogoOk] = useState(!!opt.domain)
  if (logoOk && opt.domain) {
    return (
      <span className="xa-ic" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl(opt.domain)}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setLogoOk(false)}
        />
      </span>
    )
  }
  return (
    <span className="xa-ic" aria-hidden>
      {opt.isCard ? <CreditCard /> : <Landmark />}
    </span>
  )
}

/* ─── Routing logic ──────────────────────────────────────────────── */

function routeTransfer({
  from,
  to,
}: {
  from: Option
  to: Option
}): {
  kind: TransferKind
  fromAccountId: string
  toAccountId?: string
  externalRef?: string
} {
  if (from.kind === "nova" && to.kind === "nova") {
    return { kind: "internal", fromAccountId: from.id, toAccountId: to.id }
  }
  if (from.kind === "nova" && to.kind === "linked") {
    return {
      kind: "ach_out",
      fromAccountId: from.id,
      externalRef: `linked:${to.linked.id}:${to.linked.institutionName}`,
    }
  }
  if (from.kind === "linked" && to.kind === "nova") {
    return {
      kind: "ach_in",
      fromAccountId: to.id,
      externalRef: `linked:${from.linked.id}:${from.linked.institutionName}`,
    }
  }
  throw new Error("Linked-to-linked transfers are not supported.")
}

/* ─── Small helpers ──────────────────────────────────────────────── */

function capitalize(s: string): string {
  if (!s) return s
  return s[0]!.toUpperCase() + s.slice(1)
}

