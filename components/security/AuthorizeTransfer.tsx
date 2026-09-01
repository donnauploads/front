"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Fingerprint, ShieldCheck, X } from "lucide-react"
import {
  getTransactionPinStatus,
  setTransactionPin,
  verifyTransactionPin,
} from "@/lib/security/api/transaction-pin"
import {
  biometricSupported,
  elevateWithBiometric,
} from "@/lib/security/api/biometric-elevation"
import { enrollBiometricInline } from "@/lib/security/api/biometric-enrollment"
import { listBiometric } from "@/lib/profile/api/security.real"
import { ApiError } from "@/lib/api/errors"

const PIN_LEN = 6

/**
 * Pre-transfer gate. Wraps the PIN verify flow + a (placeholder) biometric
 * option. Caller opens it with `open=true`, provides `onAuthorized` which
 * receives the short-lived `elevationToken` to attach to the next pay /
 * transfer call.
 *
 * **Promise mode (recommended):** if `onAuthorized` returns a Promise,
 * the sheet stays open during the parent's API call and renders a
 * "Processing…" spinner (held for ≥4s so it reads as deliberate) →
 * "Success" checkmark (~1.4s) → dismisses itself via `onCancel`. The
 * parent does NOT need to flip `open=false` in its handler. On promise
 * rejection the sheet returns to the PIN entry state with an inline
 * error so the user can retry without re-typing their PIN.
 *
 * **Sync mode (legacy):** if `onAuthorized` returns void/undefined,
 * behavior is unchanged — parent owns dismissal.
 *
 * On first use we auto-route the user through a 2-step setup (enter +
 * confirm) before issuing the first elevation token — that way they can't
 * ever try to pay without a PIN set.
 */
export function AuthorizeTransfer({
  open,
  amountLabel,
  processingLabel = "Processing…",
  processingSubLabel = "Authorizing your request",
  successLabel = "Success",
  successSubLabel = "Authorization confirmed",
  processingMinMs = 4000,
  onCancel,
  onAuthorized,
}: {
  open: boolean
  amountLabel?: string
  /** Headline shown during the post-PIN spinner state (Promise mode). */
  processingLabel?: string
  processingSubLabel?: string
  /** Headline shown during the brief success checkmark state. */
  successLabel?: string
  successSubLabel?: string
  /** Minimum time (ms) the "Processing…" spinner is held so it reads as
   *  deliberate even when the API replies instantly. Default 4000. */
  processingMinMs?: number
  onCancel: () => void
  onAuthorized: (elevationToken: string) => void | Promise<unknown>
}) {
  type Mode =
    | { kind: "loading" }
    | { kind: "verify" }
    | { kind: "setup-new" }
    | { kind: "setup-confirm"; firstPin: string }

  const [mode, setMode] = useState<Mode>({ kind: "loading" })
  const [digits, setDigits] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [bioEnrolled, setBioEnrolled] = useState(false)
  const [bioSubmitting, setBioSubmitting] = useState(false)
  // Inline biometric-setup state. When the user taps "Use biometric" but
  // no credential is enrolled (or the existing one is mismatched), we
  // surface a small CTA inside the same sheet:
  //   "needs-setup"  → "Biometrics not set, tap to set up now" (idle)
  //   "setting-up"   → mid-WebAuthn registration / OS prompt
  //   "verifying"    → enrolled OK, auto-running elevation
  //   "mismatch"     → wrong biometric — inline "do not match" notice
  const [bioState, setBioState] = useState<
    "idle" | "needs-setup" | "setting-up" | "verifying" | "mismatch"
  >("idle")

  // `deliverToken` runs across ≥4s of awaits while the parent's promise
  // resolves. During that time the parent re-renders (e.g. to stash a
  // confirmation id) and passes a new onCancel that reads fresh state.
  // Capturing the prop directly would call the STALE closure from when
  // PIN was entered — so route onCancel through a ref that always
  // points at the latest version.
  const onCancelRef = useRef(onCancel)
  useEffect(() => {
    onCancelRef.current = onCancel
  })
  // Post-PIN phase. Driven only when `onAuthorized` returns a Promise.
  //   pin       → normal PIN/biometric entry (existing behaviour)
  //   processing → spinner held for ≥4s while parent's promise runs
  //   success   → checkmark held ~1.4s before auto-dismiss
  const [phase, setPhase] = useState<"pin" | "processing" | "success">("pin")
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  function focusAt(i: number) {
    const target = inputs.current[Math.max(0, Math.min(PIN_LEN - 1, i))]
    target?.focus()
    target?.select()
  }

  // On open: check whether the user has a PIN configured AND whether
  // they have at least one biometric credential enrolled. Both shape the
  // modal's affordances. Run them in parallel — neither blocks the
  // other.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setMode({ kind: "loading" })
    setDigits([])
    setError(null)
    setBioEnrolled(false)
    setBioState("idle")
    setPhase("pin")
    void Promise.allSettled([
      (async () => {
        try {
          const { enabled } = await getTransactionPinStatus()
          if (cancelled) return
          setMode(enabled ? { kind: "verify" } : { kind: "setup-new" })
        } catch {
          if (cancelled) return
          setMode({ kind: "verify" }) // fail open; verify will surface real errors
        }
      })(),
      (async () => {
        // Only call the list endpoint if WebAuthn is available — saves
        // a round-trip on browsers that couldn't use it anyway.
        if (!biometricSupported()) return
        try {
          const rows = await listBiometric()
          if (cancelled) return
          setBioEnrolled(rows.length > 0)
        } catch {
          /* non-fatal — biometric button stays hidden */
        }
      })(),
    ])
    return () => {
      cancelled = true
    }
  }, [open])

  const pin = digits.join("")
  const ready = pin.length === PIN_LEN

  function setDigit(i: number, v: string) {
    // Clear any stale error message as soon as the user starts a new
    // attempt — keeps red copy from lingering while they retype.
    if (error) setError(null)
    // Accept the typed value possibly being multiple chars (e.g. paste,
    // or autofill flooding the first slot). Take just the digits, place
    // them sequentially starting at the current index, advance focus to
    // the last filled cell + 1.
    const cleaned = v.replace(/\D/g, "")
    if (cleaned.length === 0) {
      setDigits((prev) => {
        const next = [...prev]
        while (next.length < PIN_LEN) next.push("")
        next[i] = ""
        return next.slice(0, PIN_LEN)
      })
      return
    }
    setDigits((prev) => {
      const next = [...prev]
      while (next.length < PIN_LEN) next.push("")
      const room = PIN_LEN - i
      for (let k = 0; k < Math.min(cleaned.length, room); k++) {
        next[i + k] = cleaned[k]!
      }
      return next.slice(0, PIN_LEN)
    })
    const landed = Math.min(PIN_LEN - 1, i + cleaned.length - 1)
    // Move to the slot AFTER the last char we just placed (unless we're
    // already at the end — then keep focus put so the auto-submit fires).
    const nextFocus = Math.min(PIN_LEN - 1, landed + 1)
    requestAnimationFrame(() => focusAt(nextFocus))
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[i]) {
        // Clear current cell, focus stays.
        setDigit(i, "")
        e.preventDefault()
      } else if (i > 0) {
        // Empty cell + backspace → step back and clear the previous one.
        e.preventDefault()
        setDigits((prev) => {
          const next = [...prev]
          while (next.length < PIN_LEN) next.push("")
          next[i - 1] = ""
          return next.slice(0, PIN_LEN)
        })
        focusAt(i - 1)
      }
      return
    }
    if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault()
      focusAt(i - 1)
      return
    }
    if (e.key === "ArrowRight" && i < PIN_LEN - 1) {
      e.preventDefault()
      focusAt(i + 1)
      return
    }
  }

  // Auto-submit when the PIN field is complete.
  useEffect(() => {
    if (!ready || submitting) return
    void submit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Land focus on slot 0 every time the mode changes (initial open,
  // setup-new → setup-confirm, or after a confirm mismatch resets state).
  // `autoFocus` on the JSX only fires on the input's first mount, which
  // isn't enough across these mode transitions.
  useEffect(() => {
    // Only land focus while we're actually on the PIN step. Refocusing
    // during processing / success would re-summon the mobile soft keyboard.
    if (mode.kind === "loading" || phase !== "pin") return
    const t = requestAnimationFrame(() => focusAt(0))
    return () => cancelAnimationFrame(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode.kind, phase])

  // Once we leave PIN entry (processing → success → auto-dismiss), blur the
  // active PIN input so mobile browsers dismiss the soft keyboard. Without
  // this the keypad stays up through the success animation and pushes the
  // sheet around, which reads as janky.
  useEffect(() => {
    if (phase === "pin") return
    if (typeof document === "undefined") return
    ;(document.activeElement as HTMLElement | null)?.blur?.()
  }, [phase])

  // Backend says the user already has a PIN when we attempt set-without-
  // current. Recognised by status + a stable substring so a copy edit on
  // the server message can't break the UX.
  function isAlreadyHasPin(err: ApiError): boolean {
    if (err.status !== 400) return false
    const msg = (err.message || "").toLowerCase()
    return msg.includes("current pin") || msg.includes("current password")
  }

  /**
   * Hand the elevation token to the parent. If parent returns a Promise,
   * keep the sheet open and animate through processing → success → close.
   * If it returns void, fall back to legacy behaviour (parent owns
   * dismissal).
   *
   * Returns the parent's promise (or `null`) so callers — submit() and
   * runBiometric() — know whether to leave their `submitting` flag set
   * (promise mode owns the disabled state via `phase`).
   */
  async function deliverToken(token: string): Promise<void> {
    const ret = onAuthorized(token)
    if (!ret || typeof (ret as Promise<unknown>).then !== "function") {
      // Sync caller — parent is responsible for closing the sheet.
      return
    }
    setPhase("processing")
    try {
      // Hold the spinner for ≥processingMinMs so the "Processing…" state
      // reads as deliberate even when the API replies instantly. If the API
      // is slower, it dominates and success fires the moment it resolves.
      await Promise.all([
        ret as Promise<unknown>,
        new Promise((r) => setTimeout(r, processingMinMs)),
      ])
      setPhase("success")
      await new Promise((r) => setTimeout(r, 1400))
      // Call the latest onCancel (via ref) so parent state set during
      // the await above — e.g. setConfirmation / setSubmittedTransferId
      // — is visible to the cleanup logic.
      onCancelRef.current()
    } catch (err) {
      // Surface the parent's error inline + return to PIN entry so the
      // user can retry without re-typing or being thrown back to the
      // host page.
      setPhase("pin")
      const msg =
        err instanceof ApiError
          ? err.message || "Authorization failed. Try again."
          : err instanceof Error
            ? err.message
            : "Something went wrong. Try again."
      setError(msg)
      setDigits([])
    }
  }

  /**
   * Classify a biometric-elevation error so the modal can render the
   * right inline copy without a separate sheet:
   *   "not-enrolled" → user has no credential bound to their account →
   *                    show "Biometrics not set, tap to set up now"
   *   "mismatch"     → credential present but verification failed → show
   *                    "Biometric doesn't match"
   *   "cancelled"    → user dismissed the OS prompt → silent
   *   "other"        → surface message verbatim
   */
  function classifyBioError(
    err: unknown,
  ): "not-enrolled" | "mismatch" | "cancelled" | "other" {
    const name = (err as Error & { name?: string })?.name ?? ""
    if (name === "NotAllowedError" || name === "AbortError") return "cancelled"
    if (err instanceof ApiError) {
      const msg = (err.message || "").toLowerCase()
      if (
        err.status === 401 &&
        (msg.includes("unknown biometric") || msg.includes("disabled"))
      ) {
        return "not-enrolled"
      }
      if (
        err.status === 401 &&
        (msg.includes("verification failed") || msg.includes("does not match"))
      ) {
        return "mismatch"
      }
      if (err.status === 403 && msg.includes("different account")) {
        return "mismatch"
      }
    }
    return "other"
  }

  /** WebAuthn assertion path. Skips PIN entry entirely; on success
   *  feeds the elevation token straight to onAuthorized. */
  async function runBiometric() {
    if (bioSubmitting || submitting) return
    setBioSubmitting(true)
    setError(null)
    setBioState("idle")

    // Short-circuit when we already know there's no enrollment — go
    // straight to the inline setup CTA instead of round-tripping through
    // a failed elevation.
    if (!bioEnrolled) {
      setBioSubmitting(false)
      setBioState("needs-setup")
      return
    }

    try {
      const { elevationToken } = await elevateWithBiometric()
      await deliverToken(elevationToken)
      // deliverToken swallows the parent's rejection (e.g. transfers blocked)
      // and returns us to PIN entry without throwing — so clear the spinner
      // here, otherwise the fingerprint button spins forever.
      setBioSubmitting(false)
    } catch (err) {
      const kind = classifyBioError(err)
      if (kind === "cancelled") {
        setBioSubmitting(false)
        return
      }
      if (kind === "not-enrolled") {
        setBioSubmitting(false)
        setBioState("needs-setup")
        return
      }
      if (kind === "mismatch") {
        setBioSubmitting(false)
        setBioState("mismatch")
        return
      }
      if (err instanceof ApiError) {
        setError(err.message || "Biometric authorization failed.")
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Biometric authorization failed.")
      }
      setBioSubmitting(false)
    }
  }

  /**
   * Tap-to-setup handler. Runs the WebAuthn registration ceremony inline
   * (silent reactivate first, then a fresh credential dance if needed),
   * then immediately re-runs elevation and authorizes the transfer — all
   * inside this same sheet, no extra modal.
   */
  async function setupAndElevate() {
    if (bioSubmitting || submitting) return
    setBioSubmitting(true)
    setError(null)
    setBioState("setting-up")
    try {
      await enrollBiometricInline()
      setBioEnrolled(true)
      setBioState("verifying")
      const { elevationToken } = await elevateWithBiometric()
      await deliverToken(elevationToken)
      setBioSubmitting(false)
      setBioState("idle")
    } catch (err) {
      const name = (err as Error & { name?: string })?.name ?? ""
      if (name === "NotAllowedError" || name === "AbortError") {
        // User cancelled the OS prompt — stay on the setup CTA so they
        // can tap again.
        setBioSubmitting(false)
        setBioState("needs-setup")
        return
      }
      const kind = classifyBioError(err)
      if (kind === "mismatch") {
        setBioSubmitting(false)
        setBioState("mismatch")
        return
      }
      const msg =
        err instanceof ApiError
          ? err.message || "Couldn't set up biometrics. Use your PIN instead."
          : err instanceof Error
            ? err.message
            : "Couldn't set up biometrics. Use your PIN instead."
      setError(msg)
      setBioState("needs-setup")
      setBioSubmitting(false)
    }
  }

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      if (mode.kind === "verify") {
        const { elevationToken } = await verifyTransactionPin(pin)
        setDigits([])
        await deliverToken(elevationToken)
      } else if (mode.kind === "setup-new") {
        // Don't hit the server yet — just stage the confirmation.
        setMode({ kind: "setup-confirm", firstPin: pin })
        setDigits([])
      } else if (mode.kind === "setup-confirm") {
        if (pin !== mode.firstPin) {
          setError("PINs don't match, try again.")
          setDigits([])
          setMode({ kind: "setup-new" })
          return
        }
        try {
          await setTransactionPin({ newPin: pin })
        } catch (err) {
          if (err instanceof ApiError && isAlreadyHasPin(err)) {
            // Status check thought we needed setup, but the backend
            // tells us a PIN already exists. Pivot the UI cleanly to
            // verify mode so the user can authorize with the PIN they
            // actually have.
            setMode({ kind: "verify" })
            setDigits([])
            setError(
              "You already have a PIN set. Enter it to authorize this transfer.",
            )
            return
          }
          throw err
        }
        const { elevationToken } = await verifyTransactionPin(pin)
        setDigits([])
        await deliverToken(elevationToken)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Couldn't verify. Try again.")
      } else {
        setError("Network error. Try again.")
      }
      setDigits([])
    } finally {
      setSubmitting(false)
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, PIN_LEN)
    if (!txt) return
    e.preventDefault()
    const next = ["", "", "", "", "", ""]
    for (let i = 0; i < txt.length; i++) next[i] = txt[i]!
    setDigits(next)
  }

  const title =
    mode.kind === "setup-new"
      ? "Create a 6-digit PIN"
      : mode.kind === "setup-confirm"
        ? "Re-enter to confirm"
        : "Enter your PIN"
  const subtitle =
    mode.kind === "setup-new"
      ? "We'll ask for this every time you move money. Avoid 123456 or repeated digits."
      : mode.kind === "setup-confirm"
        ? "One more time, so we know you've got it."
        : amountLabel
          ? `Authorize this transfer of ${amountLabel}.`
          : "Authorize this transfer."

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Authorize transfer"
          className="modal-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            aria-label="Close"
            onClick={onCancel}
            disabled={phase !== "pin"}
            className="modal-scrim-btn"
          />
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="modal-card sm"
          >
            <div className="modal-grip" />

            {phase === "pin" && (
              <div className="modal-head">
                <div className="mh-l">
                  <span className="modal-ic">
                    <ShieldCheck aria-hidden />
                  </span>
                  <div>
                    <div className="modal-title">{title}</div>
                    <p className="modal-sub">{subtitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onCancel}
                  aria-label="Close"
                  className="modal-x"
                >
                  <X aria-hidden />
                </button>
              </div>
            )}

            {phase === "processing" && (
              <div className="modal-status">
                <span className="modal-spinner" aria-label={processingLabel} />
                <div className="ms-title">{processingLabel}</div>
                <p className="ms-sub">{processingSubLabel}</p>
              </div>
            )}

            {phase === "success" && (
              <div className="modal-status">
                <div className="modal-disc success">
                  <CheckCircle2 strokeWidth={2.5} aria-hidden />
                </div>
                <div className="ms-title">{successLabel}</div>
                <p className="ms-sub">{successSubLabel}</p>
              </div>
            )}

            {phase === "pin" && (mode.kind === "loading" ? (
              <div className="modal-status">
                <span className="modal-spinner" aria-label="Loading" />
                <p className="ms-sub">Loading…</p>
              </div>
            ) : (
              <>
                <div className="pin-grid">
                  {Array.from({ length: PIN_LEN }).map((_, i) => (
                    <Fragment key={i}>
                      {i === 3 && (
                        <span aria-hidden className="pin-sep">
                          –
                        </span>
                      )}
                      <input
                        ref={(el) => {
                          inputs.current[i] = el
                        }}
                        // Deliberately NOT `type="password"` — Chrome's
                        // password manager fires the "Update password?"
                        // prompt every time a password-typed input is
                        // submitted, which is wrong for a 6-digit PIN.
                        // We mask visually via CSS (`-webkit-text-
                        // security: disc` on `.pin-cell`).
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        // Belt-and-suspenders: every major password
                        // manager respects at least one of these
                        // attributes to suppress save prompts.
                        data-lpignore="true"
                        data-form-type="other"
                        data-1p-ignore="true"
                        spellCheck={false}
                        size={1}
                        maxLength={1}
                        value={digits[i] ?? ""}
                        autoFocus={i === 0}
                        disabled={submitting}
                        onChange={(e) => setDigit(i, e.target.value)}
                        onPaste={onPaste}
                        onKeyDown={(e) => onKeyDown(i, e)}
                        onFocus={(e) => e.currentTarget.select()}
                        className="pin-cell"
                      />
                    </Fragment>
                  ))}
                </div>

                {error && (
                  <p className="modal-err" role="alert">
                    {error}
                  </p>
                )}

                {/* Biometric is offered alongside the PIN whenever the
                    device supports WebAuthn — no gate on whether a
                    credential is already enrolled. If the user has none,
                    `elevateWithBiometric()` rejects with a typed error and
                    the existing inline error path surfaces a clean message
                    so they can fall back to the PIN. */}
                {mode.kind === "verify" && biometricSupported() && (
                  <>
                    <div className="modal-or">or</div>

                    {bioState === "needs-setup" || bioState === "setting-up" ? (
                      <button
                        type="button"
                        onClick={() => void setupAndElevate()}
                        disabled={bioSubmitting || submitting}
                        className="modal-alt-btn gold"
                      >
                        {bioState === "setting-up" ? (
                          <>
                            <span className="modal-alt-spin" aria-label="Setting up" />
                            Setting up biometrics…
                          </>
                        ) : (
                          <>
                            <Fingerprint aria-hidden />
                            Biometrics not set, tap to set up now
                          </>
                        )}
                      </button>
                    ) : bioState === "verifying" ? (
                      <div className="modal-alt-btn" aria-disabled>
                        <span className="modal-alt-spin" aria-label="Verifying" />
                        Verifying transaction…
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => void runBiometric()}
                          disabled={bioSubmitting || submitting}
                          className="modal-alt-btn"
                        >
                          {bioSubmitting ? (
                            <span className="modal-alt-spin" aria-label="Authorizing" />
                          ) : (
                            <>
                              <Fingerprint aria-hidden />
                              Use biometric
                            </>
                          )}
                        </button>
                        {bioState === "mismatch" && (
                          <p className="modal-err" role="alert">
                            Biometric doesn&apos;t match.
                          </p>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
