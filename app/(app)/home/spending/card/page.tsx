"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Snowflake,
  RefreshCw,
  RotateCw,
  CheckCircle2,
  ShieldCheck,
  X,
  Loader2,
  History,
  Copy,
  Check,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import {
  activateCard,
  freezeCard,
  listCards,
  replaceVirtualCard,
  revealCard,
  unfreezeCard,
  type CardDto,
  type RevealDto,
} from "@/lib/cards/api/cards.real"
import {
  getTransactionPinStatus,
  verifyTransactionPin,
} from "@/lib/security/api/transaction-pin"
import { ApiError } from "@/lib/api/errors"
import { useToast } from "@/components/providers/ToastProvider"

const PIN_LEN = 6

export default function CardManagementPage() {
  const router = useRouter()
  const user = useStore((s) => s.user)
  const txns = useStore((s) => s.transactions)
  const { toast } = useToast()
  const [orderingPhysical, setOrderingPhysical] = useState(false)

  async function onOrderPhysical() {
    if (orderingPhysical) return
    setOrderingPhysical(true)
    await new Promise((r) => setTimeout(r, 900))
    setOrderingPhysical(false)
    toast("Currently unavailable. Please try again later.", { variant: "error" })
  }

  const [cards, setCards] = useState<CardDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<
    "freeze" | "unfreeze" | "replace" | "activate" | null
  >(null)
  const [reveal, setReveal] = useState<RevealDto | null>(null)
  const [revealCountdown, setRevealCountdown] = useState<number>(0)
  const [pinOpen, setPinOpen] = useState(false)
  // Card awaiting a replace confirmation (drives the in-app confirm modal
  // that replaced the browser-native confirm()).
  const [replaceTarget, setReplaceTarget] = useState<CardDto | null>(null)

  // ── Initial load ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    listCards()
      .then((rows) => {
        if (cancelled) return
        setCards(rows)
        const primaryVirtual =
          rows.find((c) => c.type === "virtual" && c.status === "active") ??
          rows.find((c) => c.type === "virtual" && c.status !== "replaced") ??
          rows.find((c) => c.type === "virtual") ??
          rows[0]
        if (primaryVirtual) setActiveCardId(primaryVirtual.id)
      })
      .catch((e) =>
        !cancelled && setError((e as Error).message || "Couldn't load cards."),
      )
    return () => {
      cancelled = true
    }
  }, [])

  const activeCard = useMemo(
    () => cards?.find((c) => c.id === activeCardId) ?? null,
    [cards, activeCardId],
  )
  const virtualCards = useMemo(
    () =>
      (cards ?? []).filter(
        (c) => c.type === "virtual" && c.status !== "replaced",
      ),
    [cards],
  )
  const replacedCards = useMemo(
    () => (cards ?? []).filter((c) => c.status === "replaced"),
    [cards],
  )
  const physicalCard = useMemo(
    () =>
      (cards ?? []).find(
        (c) => c.type === "physical" && c.status !== "replaced",
      ),
    [cards],
  )

  // Hide reveal & clear PAN from memory after TTL.
  useEffect(() => {
    if (!reveal) return
    setRevealCountdown(reveal.ttlSeconds)
    const tick = setInterval(() => {
      setRevealCountdown((s) => {
        if (s <= 1) {
          clearInterval(tick)
          setReveal(null)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [reveal])

  // Also clear reveal when card is frozen or active card changes.
  useEffect(() => {
    if (!activeCard || activeCard.status !== "active") setReveal(null)
  }, [activeCard])

  // ── Actions ──────────────────────────────────────────────────────────

  function patchCard(updated: CardDto) {
    setCards((prev) => (prev ? prev.map((c) => (c.id === updated.id ? updated : c)) : prev))
  }
  function insertCard(c: CardDto) {
    setCards((prev) => (prev ? [c, ...prev] : [c]))
  }

  async function toggleFreeze(card: CardDto, target: boolean) {
    setPendingAction(target ? "freeze" : "unfreeze")
    setError(null)
    try {
      const updated = target ? await freezeCard(card.id) : await unfreezeCard(card.id)
      patchCard(updated)
      if (target) setReveal(null)
    } catch (e) {
      setError(actionMessage(e, "Couldn't update card."))
    } finally {
      setPendingAction(null)
    }
  }

  async function confirmReplace() {
    const card = replaceTarget
    if (!card) return
    setPendingAction("replace")
    setError(null)
    try {
      const fresh = await replaceVirtualCard(card.id)
      insertCard(fresh)
      // Refresh source list (the old card's status flipped to `replaced`
      // server-side, but we only got the new one back).
      try {
        const all = await listCards()
        setCards(all)
      } catch {
        /* keep optimistic state */
      }
      setActiveCardId(fresh.id)
      setReveal(null)
      setReplaceTarget(null)
    } catch (e) {
      setError(actionMessage(e, "Couldn't replace card."))
    } finally {
      setPendingAction(null)
    }
  }

  async function onActivatePhysical(card: CardDto) {
    setPendingAction("activate")
    setError(null)
    try {
      const updated = await activateCard(card.id)
      patchCard(updated)
    } catch (e) {
      setError(actionMessage(e, "Couldn't activate card."))
    } finally {
      setPendingAction(null)
    }
  }

  async function onRevealClick() {
    if (!activeCard) return
    if (activeCard.status !== "active") {
      setError("Unfreeze the card to reveal numbers.")
      return
    }
    if (reveal) {
      setReveal(null)
      return
    }
    setPinOpen(true)
  }

  async function onPinAuthorized(elevationToken: string) {
    setPinOpen(false)
    if (!activeCard) return
    try {
      const data = await revealCard(activeCard.id, elevationToken)
      setReveal(data)
    } catch (e) {
      setError(actionMessage(e, "Couldn't reveal card numbers."))
    }
  }

  // ── Render ──────────────────────────────────────────────────────────

  const fullName = user?.name?.trim() || "Cardholder"

  // Card-only transactions for the right-rail activity panel. Filter by
  // any active card's last4 appearing in the description, OR drop to
  // showing the most recent outflows if no match (keeps the panel useful
  // even before real card-linked txns settle through the WS feed).
  const cardActivity = useMemo(() => {
    const last4s = new Set<string>()
    for (const c of cards ?? []) last4s.add(c.last4)
    const byCard = txns.filter(
      (t) =>
        t.amount < 0 &&
        [...last4s].some((l4) => (t.description ?? "").includes(l4)),
    )
    const fallback = txns.filter((t) => t.amount < 0)
    return (byCard.length > 0 ? byCard : fallback).slice(0, 6)
  }, [cards, txns])

  return (
    <>
      <button
        type="button"
        onClick={() => router.back()}
        className="view-back"
        aria-label="Back"
      >
        <ArrowLeft aria-hidden /> Back
      </button>

      <div className="page-head">
        <h2>Cards</h2>
        <p className="ph-sub">
          Manage your card art, controls, and recent activity. Show numbers,
          freeze, or replace at any time.
        </p>
      </div>

      {error && (
        <div className="card-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      <div className="transfer-grid">
        <div>
          {/* Card art */}
          {cards === null ? (
            <div
              className="cardviz"
              style={{
                background: "var(--paper)",
                color: "var(--ink-mute)",
                animation: "xferStepIn .8s var(--ease) infinite alternate",
              }}
              aria-busy
            >
              <div className="cv-top">
                <span className="cv-brand">Loading…</span>
              </div>
            </div>
          ) : activeCard ? (
            <CardArt
              card={activeCard}
              reveal={reveal}
              cardholderName={fullName}
            />
          ) : (
            <div
              className="cardviz"
              style={{
                background: "var(--paper)",
                color: "var(--ink-mute)",
                padding: 28,
                textAlign: "center",
                fontSize: 14,
              }}
            >
              You don&apos;t have a card yet.
            </div>
          )}

          {/* Card switcher (virtual cards only) */}
          {virtualCards.length > 1 && (
            <div className="card-switcher">
              {virtualCards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={cn("cs-pill", c.id === activeCardId && "active")}
                  onClick={() => {
                    setActiveCardId(c.id)
                    setReveal(null)
                  }}
                >
                  •••• {c.last4}
                  {c.id !== activeCardId ? ` · ${c.status}` : ""}
                </button>
              ))}
            </div>
          )}

          {/* Reveal countdown */}
          {reveal && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 14,
              }}
            >
              <span className="reveal-countdown">
                Numbers hidden in {revealCountdown}s
              </span>
            </div>
          )}

          {/* Virtual controls — rendered in the grid's left column */}
          {activeCard && activeCard.type === "virtual" && (
            <div className="cc-section-title" style={{ marginTop: 22 }}>
              Card controls
            </div>
          )}

          {/* Virtual controls — Freeze / Show numbers / Replace */}
          {activeCard && activeCard.type === "virtual" && (
            <div className="card-controls" style={{ marginTop: 4 }}>
              <Toggle
                icon={<Snowflake aria-hidden />}
                title={activeCard.status === "frozen" ? "Card frozen" : "Freeze card"}
                body={
                  activeCard.status === "frozen"
                    ? "Tap to unfreeze when you're ready to spend again."
                    : "Temporarily block all charges if you misplace your card."
                }
                on={activeCard.status === "frozen"}
                disabled={
                  pendingAction === "freeze" ||
                  pendingAction === "unfreeze" ||
                  !["active", "frozen"].includes(activeCard.status)
                }
                busy={pendingAction === "freeze" || pendingAction === "unfreeze"}
                onChange={(v) => toggleFreeze(activeCard, v)}
              />

              <Toggle
                icon={reveal ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                title={reveal ? "Hide numbers" : "Show numbers"}
                body={
                  reveal
                    ? `Hides in ${revealCountdown}s. Tap to hide now.`
                    : "Reveal full card number, expiry, and CVV."
                }
                on={!!reveal}
                disabled={activeCard.status !== "active"}
                onChange={onRevealClick}
              />

              <ActionRow
                icon={<RotateCw aria-hidden />}
                title="Replace virtual card"
                body="Issue new numbers immediately. Old card stops working."
                cta="Replace"
                busy={pendingAction === "replace"}
                onClick={() => setReplaceTarget(activeCard)}
              />

              <ActionRow
                icon={<RefreshCw aria-hidden />}
                title="Order physical card"
                body="Ships in 7–10 business days, no fee."
                cta="Order"
                busy={orderingPhysical}
                onClick={onOrderPhysical}
              />
            </div>
          )}

          {/* Replaced cards (history) */}
          {replacedCards.length > 0 && (
            <>
              <div className="cc-section-title">Replaced cards</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {replacedCards.map((c) => (
                  <div className="card-info-row" key={c.id}>
                    <span className="ci-ic" aria-hidden>
                      <History />
                    </span>
                    <div className="ci-body">
                      <div className="ci-title">•••• {c.last4}</div>
                      <div className="ci-sub">
                        Replaced · issued {fmtIssued(c.issuedAt)}
                      </div>
                    </div>
                    <span className="ci-pill">Inactive</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Physical card status panel */}
          <div className="cc-section-title">Physical card</div>
          {!physicalCard ||
          physicalCard.status === "shipped" ||
          physicalCard.status === "delivered" ? (
            <div className="card-info-row warn">
              <span className="ci-ic" aria-hidden>
                <CheckCircle2 />
              </span>
              <div className="ci-body">
                <div className="ci-title">
                  {physicalCard ? "Activate your card" : "No physical card yet"}
                </div>
                <div className="ci-sub">
                  {physicalCard
                    ? "Your card has shipped. Activate it once it arrives."
                    : "Order one to start tapping in stores and pulling cash at ATMs."}
                </div>
                {physicalCard && (
                  <button
                    type="button"
                    onClick={() => onActivatePhysical(physicalCard)}
                    disabled={pendingAction === "activate"}
                    className="cc-btn"
                    style={{
                      marginTop: 12,
                      background: "var(--gold)",
                      color: "var(--navy-deep)",
                      borderColor: "var(--gold)",
                      fontWeight: 700,
                      justifyContent: "center",
                    }}
                  >
                    {pendingAction === "activate" && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    )}
                    Activate card
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card-info-row ok">
              <span className="ci-ic" aria-hidden>
                <CheckCircle2 />
              </span>
              <div className="ci-body">
                <div className="ci-title">
                  Physical card{" "}
                  {physicalCard.status === "frozen" ? "frozen" : "active"}
                </div>
                <div className="ci-sub">•••• {physicalCard.last4}</div>
              </div>
            </div>
          )}

          {physicalCard &&
            (physicalCard.status === "active" ||
              physicalCard.status === "frozen") && (
              <div className="card-controls" style={{ marginTop: 10 }}>
                <Toggle
                  icon={<Snowflake aria-hidden />}
                  title={
                    physicalCard.status === "frozen"
                      ? "Physical card frozen"
                      : "Freeze physical card"
                  }
                  body="Pauses purchases at terminals and ATMs."
                  on={physicalCard.status === "frozen"}
                  disabled={
                    pendingAction === "freeze" || pendingAction === "unfreeze"
                  }
                  busy={
                    pendingAction === "freeze" || pendingAction === "unfreeze"
                  }
                  onChange={(v) => toggleFreeze(physicalCard, v)}
                />
              </div>
            )}

        </div>

        {/* Right column — recent card activity */}
        <div className="panel">
          <div className="panel-head">
            <h3>Card activity</h3>
          </div>
          <div className="panel-body">
            {cardActivity.length === 0 ? (
              <div
                style={{
                  padding: "30px 0",
                  textAlign: "center",
                  color: "var(--ink-mute)",
                  fontSize: 13,
                }}
              >
                No card transactions yet.
              </div>
            ) : (
              cardActivity.map((t) => (
                <div className="txn" key={t.id}>
                  <span className="txn-ic">
                    {(t.merchant ?? t.description ?? "·")
                      .trim()
                      .charAt(0)
                      .toUpperCase() || "·"}
                  </span>
                  <div className="txn-main">
                    <div className="tn">
                      {t.description || t.merchant || "Transaction"}
                    </div>
                    <div className="tm">
                      {t.category && (
                        <span className="txn-cat">
                          {t.category.replace(/_/g, " ")}
                        </span>
                      )}
                      <span>{fmtTxnDate(t.date)}</span>
                    </div>
                  </div>
                  <div className="txn-amt">
                    <div className="ta">
                      − ${Math.abs(t.amount).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <PinRevealSheet
        open={pinOpen}
        onCancel={() => setPinOpen(false)}
        onAuthorized={onPinAuthorized}
      />

      <ConfirmReplaceModal
        open={!!replaceTarget}
        busy={pendingAction === "replace"}
        last4={replaceTarget?.last4 ?? ""}
        onCancel={() => {
          if (pendingAction === "replace") return
          setReplaceTarget(null)
        }}
        onConfirm={() => void confirmReplace()}
      />
    </>
  )
}

/**
 * In-app replacement for the browser-native confirm() on "Replace card".
 * Renders a centered modal with a warning, a Cancel, and a destructive
 * Accept button that flips to a spinner while the replace request runs.
 */
function ConfirmReplaceModal({
  open,
  busy,
  last4,
  onCancel,
  onConfirm,
}: {
  open: boolean
  busy: boolean
  last4: string
  onCancel: () => void
  onConfirm: () => void
}) {
  // Lock background scroll while the modal is open (the dashboard scrolls
  // on the window). Restored on close / unmount.
  useEffect(() => {
    if (!open) return
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = "hidden"
    return () => {
      html.style.overflow = prev
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm card replacement"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[70] grid place-items-center p-4"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onCancel}
            className="absolute inset-0 bg-black/60"
          />
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm rounded-2xl bg-[var(--surface)] p-5 ring-1 ring-[var(--line)] shadow-[var(--shadow-lg)] sm:p-6"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(181,18,27,0.12)] text-[var(--red)]">
              <RotateCw className="h-5 w-5" aria-hidden />
            </div>
            <h2 className="mt-3 font-display text-lg font-bold tracking-tight text-[var(--text-strong)]">
              Replace this card?
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-soft)]">
              We&apos;ll issue brand-new numbers for your virtual card
              {last4 ? (
                <>
                  {" "}
                  ending <span className="font-mono text-[var(--text-strong)]">•••• {last4}</span>
                </>
              ) : null}
              . Your current numbers stop working{" "}
              <span className="font-semibold text-[var(--text-strong)]">immediately</span>update
              anywhere you&apos;ve saved them. This can&apos;t be undone.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="h-11 flex-1 rounded-lg bg-[var(--paper)] text-sm font-semibold text-[var(--text-strong)] ring-1 ring-[var(--line)] transition hover:bg-[var(--paper-line)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--red)] text-sm font-semibold text-white transition hover:bg-[var(--red-deep)] disabled:opacity-70"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Replacing…
                  </>
                ) : (
                  "Replace card"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Card art ─────────────────────────────────────────────────────────────

function CardArt({
  card,
  reveal,
  cardholderName,
}: {
  card: CardDto
  reveal: RevealDto | null
  cardholderName: string
}) {
  const frozen = card.status === "frozen"
  const showNumbers = !!reveal && card.status === "active"
  const pan = reveal
    ? formatPan(reveal.pan)
    : `•••• •••• •••• ${card.last4}`
  const expiry = reveal
    ? `${String(reveal.expMonth).padStart(2, "0")} / ${String(reveal.expYear).slice(-2)}`
    : `${String(card.expMonth).padStart(2, "0")} / ${String(card.expYear).slice(-2)}`
  const cvv = reveal ? reveal.cvv : "•••"

  return (
    <motion.div
      key={card.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn("cardviz", frozen && "frozen")}
    >
      <div className="cv-top">
        <span className="cv-brand">State Bank</span>
        <span className="cv-net">{card.type === "virtual" ? "Virtual" : "Platinum"}</span>
      </div>
      <div className="cv-chip" aria-hidden />
      <div className="cv-num">
        {showNumbers ? pan : `•••• •••• •••• ${card.last4}`}
        {showNumbers && reveal && (
          <CopyButton value={reveal.pan} ariaLabel="Copy card number" />
        )}
      </div>
      <div className="cv-bottom">
        <span className="cv-name">{cardholderName || "Cardholder"}</span>
        <span className="cv-exp">
          Valid thru<b>{showNumbers ? expiry : "•• / ••"}</b>
        </span>
        <span className="cv-exp" aria-label="CVV">
          CVV
          <b style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {showNumbers ? cvv : "•••"}
            {showNumbers && reveal && (
              <CopyButton value={reveal.cvv} ariaLabel="Copy CVV" small />
            )}
          </b>
        </span>
      </div>
      {frozen && (
        <div className="cv-frozen-badge" aria-hidden>
          <span className="pill">
            <Snowflake />
            Card frozen
          </span>
        </div>
      )}
    </motion.div>
  )
}

function CopyButton({
  value,
  ariaLabel,
  small,
}: {
  value: string
  ariaLabel: string
  small?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const Icon = copied ? Check : Copy
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        } catch {
          /* swallow */
        }
      }}
      className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
    >
      <Icon className={small ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
    </button>
  )
}

// ─── Toggle + ActionRow ───────────────────────────────────────────────────

function Toggle({
  icon,
  title,
  body,
  on,
  onChange,
  disabled,
  busy,
}: {
  icon: React.ReactNode
  title: string
  body: string
  on: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  busy?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled || busy}
      onClick={() => onChange(!on)}
      className={cn("cc-btn", on && "active")}
      style={{
        flexDirection: "column", alignItems: "stretch", gap: 6,
        padding: 14,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 11, width: "100%" }}>
        {icon}
        <span style={{ flex: 1, textAlign: "left", fontSize: 14, fontWeight: 600, color: "var(--text-strong)" }}>
          {title}
        </span>
        <span className="cc-state">
          {busy ? "…" : on ? "On" : "Off"}
        </span>
      </span>
      <span
        style={{
          fontSize: 12.5, color: "var(--ink-mute)",
          lineHeight: 1.35, paddingLeft: 30,
          textAlign: "left", fontWeight: 500,
        }}
      >
        {body}
      </span>
    </button>
  )
}

function ActionRow({
  icon,
  title,
  body,
  cta,
  onClick,
  busy,
}: {
  icon: React.ReactNode
  title: string
  body: string
  cta: string
  onClick?: () => void
  busy?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="cc-btn"
      style={{ flexDirection: "column", alignItems: "stretch", gap: 6, padding: 14 }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 11, width: "100%" }}>
        {icon}
        <span style={{ flex: 1, textAlign: "left", fontSize: 14, fontWeight: 600, color: "var(--text-strong)" }}>
          {title}
        </span>
        <span
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 12, fontWeight: 700,
            color: "var(--gold-deep)",
            background: "rgba(201,162,74,.14)",
            padding: "5px 11px",
            borderRadius: 20,
          }}
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
          {cta}
        </span>
      </span>
      <span
        style={{
          fontSize: 12.5, color: "var(--ink-mute)",
          lineHeight: 1.35, paddingLeft: 30,
          textAlign: "left", fontWeight: 500,
        }}
      >
        {body}
      </span>
    </button>
  )
}

// ─── PIN reveal sheet ─────────────────────────────────────────────────────

function PinRevealSheet({
  open,
  onCancel,
  onAuthorized,
}: {
  open: boolean
  onCancel: () => void
  onAuthorized: (elevationToken: string) => void
}) {
  const [digits, setDigits] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [hasPin, setHasPin] = useState<boolean | null>(null)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!open) {
      setDigits([])
      setError(null)
      return
    }
    let cancelled = false
    setHasPin(null)
    getTransactionPinStatus()
      .then((s) => !cancelled && setHasPin(s.enabled))
      .catch(() => !cancelled && setHasPin(false))
    setTimeout(() => inputs.current[0]?.focus(), 100)
    return () => {
      cancelled = true
    }
  }, [open])

  const pin = digits.join("")

  useEffect(() => {
    if (pin.length === PIN_LEN && !submitting && hasPin) {
      void submit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, submitting, hasPin])

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const { elevationToken } = await verifyTransactionPin(pin, "card:reveal")
      onAuthorized(elevationToken)
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message || "Incorrect PIN.")
      } else {
        setError("Network error.")
      }
      setDigits([])
      setTimeout(() => inputs.current[0]?.focus(), 0)
    } finally {
      setSubmitting(false)
    }
  }

  function setAt(i: number, v: string) {
    const next = [...digits]
    next[i] = v.replace(/\D/g, "").slice(-1)
    setDigits(next.filter(Boolean).concat(Array(PIN_LEN).fill("")).slice(0, PIN_LEN))
    if (v && i < PIN_LEN - 1) inputs.current[i + 1]?.focus()
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>, i: number) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }
  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, PIN_LEN)
    if (!txt) return
    e.preventDefault()
    const next = txt.split("").concat(Array(PIN_LEN).fill("")).slice(0, PIN_LEN)
    setDigits(next)
    inputs.current[Math.min(txt.length, PIN_LEN - 1)]?.focus()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={onCancel}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl bg-[var(--surface)] p-6 ring-1 ring-[var(--line)] shadow-[var(--shadow-lg)] sm:rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(201,162,74,0.14)] text-[var(--gold-deep)]">
                  <ShieldCheck className="h-5 w-5" aria-hidden />
                </div>
                <div className="text-sm font-semibold text-[var(--text-strong)]">
                  Confirm with PIN
                </div>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full p-1 text-[var(--ink-mute)] transition hover:bg-[var(--paper)] hover:text-[var(--text-strong)]"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {hasPin === null ? (
              <div className="mt-6 flex items-center justify-center text-sm text-[var(--ink-mute)]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Checking…
              </div>
            ) : hasPin === false ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-[var(--ink-soft)]">
                  Set a transaction PIN first to reveal card numbers.
                </p>
                <a
                  href="/profile/security"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-brand py-3 text-sm font-semibold text-brand-ink transition hover:bg-brand-bright"
                >
                  Go to security settings
                </a>
              </div>
            ) : (
              <>
                <p className="mt-2 text-xs leading-relaxed text-[var(--ink-soft)]">
                  Enter your 6-digit PIN. We'll show your card number, expiry,
                  and CVV for 30 seconds.
                </p>
                <div className="mt-5 flex justify-between gap-2" onPaste={onPaste}>
                  {Array.from({ length: PIN_LEN }).map((_, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputs.current[i] = el
                      }}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={digits[i] ?? ""}
                      onChange={(e) => setAt(i, e.target.value)}
                      onKeyDown={(e) => onKeyDown(e, i)}
                      className="h-12 w-10 rounded-xl bg-[var(--paper)] text-center text-lg font-bold text-[var(--text-strong)] ring-1 ring-[var(--line)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                    />
                  ))}
                </div>

                {error && (
                  <div className="mt-3 text-center text-xs text-[var(--red)]">{error}</div>
                )}
                {submitting && (
                  <div className="mt-3 flex items-center justify-center text-xs text-[var(--ink-mute)]">
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden />
                    Verifying…
                  </div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function actionMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback
  if (err instanceof Error) return err.message || fallback
  return fallback
}

function formatPan(pan: string): string {
  return pan.replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ")
}

function fmtIssued(iso: string): string {
  const d = new Date(iso)
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function fmtTxnDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]
  return `${d.getDate()} ${months[d.getMonth()]}`
}
