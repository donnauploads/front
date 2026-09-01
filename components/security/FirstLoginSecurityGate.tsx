"use client"

import { useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react"
import { useStore } from "@/lib/store"
import { logout } from "@/lib/auth/api/auth.real"
import { setFirstLoginPassword } from "@/lib/profile/api/security.real"
import { setTransactionPin } from "@/lib/security/api/transaction-pin"
import { ApiError } from "@/lib/api/errors"
import { useToast } from "@/components/providers/ToastProvider"

/**
 * Blocking gate for admin-created accounts. While `session.user`
 * carries `securitySetupRequired: true`, the customer app is covered by
 * this modal until the user (1) replaces their temporary password and
 * (2) sets a transaction PIN. There is no dismiss — only "Sign out".
 *
 * Mounted in app/(app)/layout.tsx; renders null when not required, so it
 * is inert for normal sessions and in mocks mode (no session user).
 */
export function FirstLoginSecurityGate() {
  const user = useStore((s) => s.session.user)
  const setSessionUser = useStore((s) => s.setSessionUser)
  const { toast } = useToast()

  const [step, setStep] = useState<"password" | "pin">("password")

  // Step 1 — password (no current/temp password needed: the session proves
  // identity and the account is flagged for first-login setup).
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")

  // Step 2 — PIN
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!user?.securitySetupRequired) return null

  const pwValid = newPw.length >= 10 && newPw === confirmPw
  const pinValid = pin.length === 6 && pin === confirmPin

  async function submitPassword() {
    if (!pwValid || busy) return
    setBusy(true)
    setErr(null)
    try {
      await setFirstLoginPassword(newPw)
      setStep("pin")
    } catch (e) {
      setErr(
        e instanceof ApiError
          ? e.message
          : "Couldn't update your password. Try again.",
      )
    } finally {
      setBusy(false)
    }
  }

  async function submitPin() {
    if (!pinValid || busy || !user) return
    setBusy(true)
    setErr(null)
    try {
      // The password we just set elevates the first-time PIN creation.
      await setTransactionPin({ newPin: pin, currentPassword: newPw })
      // Clear the gate locally; the backend also clears the flag, but this
      // dismisses immediately without waiting on a /me round-trip.
      setSessionUser({ ...user, securitySetupRequired: false })
      toast("You're all set, your account is secured.", {
        variant: "success",
      })
    } catch (e) {
      setErr(
        e instanceof ApiError
          ? e.message
          : "Couldn't save your PIN. Try again.",
      )
    } finally {
      setBusy(false)
    }
  }

  async function onSignOut() {
    try {
      await logout()
    } finally {
      setSessionUser(null)
      window.location.href = "/login"
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Secure your account"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="modal-scrim"
        style={{ zIndex: 1200 }}
      >
        <motion.div
          initial={{ y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="modal-card"
          onKeyDown={(e) => {
            // Enter advances the current step (like clicking the button).
            // Skip when a button is focused so Enter acts on it instead.
            if (e.key !== "Enter") return
            if ((e.target as HTMLElement).tagName === "BUTTON") return
            if (busy) return
            if (step === "password" && pwValid) {
              e.preventDefault()
              void submitPassword()
            } else if (step === "pin" && pinValid) {
              e.preventDefault()
              void submitPin()
            }
          }}
        >
          <div className="modal-grip" />
          <div className="modal-head">
            <div className="mh-l">
              <span className="modal-ic" aria-hidden>
                <ShieldCheck />
              </span>
              <div>
                <div className="modal-title">Secure your account</div>
                <div className="modal-sub">
                  Your account was set up by an administrator. Before you
                  continue, choose a personal password and a transaction PIN.
                </div>
              </div>
            </div>
          </div>

          {/* Step indicator */}
          <div
            style={{
              display: "flex",
              gap: 8,
              margin: "16px 0 4px",
            }}
            aria-hidden
          >
            <StepDot active={step === "password"} done={step === "pin"} />
            <StepDot active={step === "pin"} done={false} />
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
            }}
          >
            Step {step === "password" ? "1" : "2"} of 2 ·{" "}
            {step === "password" ? "New password" : "Transaction PIN"}
          </div>

          {step === "password" ? (
            <>
              <PwField
                label="New password"
                value={newPw}
                onChange={setNewPw}
                help="At least 10 characters. Make it personal and unique."
                autoFocus
              />
              <PwField
                label="Confirm new password"
                value={confirmPw}
                onChange={setConfirmPw}
              />
              {err && (
                <p className="modal-err" role="alert">
                  {err}
                </p>
              )}
              <button
                type="button"
                disabled={!pwValid || busy}
                onClick={submitPassword}
                className="lk-cta-btn primary"
                style={{ marginTop: 20 }}
              >
                {busy && (
                  <Loader2
                    className="animate-spin"
                    width={18}
                    height={18}
                    aria-hidden
                  />
                )}
                Continue
              </button>
            </>
          ) : (
            <>
              <div className="modal-field">
                <label className="modal-label">Create a 6-digit PIN</label>
                <SegmentedPin
                  value={pin}
                  onChange={setPin}
                  autoFocus
                  ariaLabel="New PIN"
                />
              </div>
              <div className="modal-field">
                <label className="modal-label">Confirm PIN</label>
                <SegmentedPin
                  value={confirmPin}
                  onChange={setConfirmPin}
                  ariaLabel="Confirm PIN"
                />
              </div>
              {err && (
                <p className="modal-err" role="alert">
                  {err}
                </p>
              )}
              <button
                type="button"
                disabled={!pinValid || busy}
                onClick={submitPin}
                className="lk-cta-btn primary"
                style={{ marginTop: 20 }}
              >
                {busy && (
                  <Loader2
                    className="animate-spin"
                    width={18}
                    height={18}
                    aria-hidden
                  />
                )}
                Finish & enter app
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onSignOut}
            style={{
              display: "block",
              margin: "14px auto 0",
              background: "transparent",
              border: 0,
              color: "var(--ink-mute)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign out instead
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/** Six independent digit boxes with auto-advance, backspace, arrow-nav and
 *  paste. `value` is the left-packed string of entered digits. */
function SegmentedPin({
  value,
  onChange,
  length = 6,
  autoFocus,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  length?: number
  autoFocus?: boolean
  ariaLabel: string
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])

  function focusAt(i: number) {
    const el = refs.current[Math.max(0, Math.min(length - 1, i))]
    el?.focus()
    el?.select()
  }
  function setChar(i: number, ch: string) {
    const arr = Array.from({ length }, (_, k) => value[k] ?? "")
    arr[i] = ch
    onChange(arr.join("").slice(0, length))
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${length}, 1fr)`,
        gap: 8,
      }}
    >
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          value={value[i] ?? ""}
          aria-label={`${ariaLabel} digit ${i + 1}`}
          className="pin-cell"
          style={{ height: 52 }}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "")
            if (!d) return
            setChar(i, d[d.length - 1]!)
            if (i < length - 1) focusAt(i + 1)
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault()
              if (value[i]) setChar(i, "")
              else if (i > 0) {
                setChar(i - 1, "")
                focusAt(i - 1)
              }
            } else if (e.key === "ArrowLeft") {
              e.preventDefault()
              focusAt(i - 1)
            } else if (e.key === "ArrowRight") {
              e.preventDefault()
              focusAt(i + 1)
            }
          }}
          onFocus={(e) => e.currentTarget.select()}
          onPaste={(e) => {
            e.preventDefault()
            const digits = e.clipboardData
              .getData("text")
              .replace(/\D/g, "")
              .slice(0, length)
            if (digits) {
              onChange(digits)
              focusAt(Math.min(digits.length, length - 1))
            }
          }}
        />
      ))}
    </div>
  )
}

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <span
      style={{
        flex: 1,
        height: 4,
        borderRadius: 4,
        background:
          done || active ? "var(--gold)" : "var(--line)",
        opacity: done ? 0.6 : 1,
        transition: "background .2s, opacity .2s",
      }}
    />
  )
}

function PwField({
  label,
  value,
  onChange,
  help,
  autoFocus,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  help?: string
  autoFocus?: boolean
}) {
  const [show, setShow] = useState(false)
  const Icon = show ? EyeOff : Eye
  return (
    <div className="modal-field">
      <label className="modal-label">{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="docs-input"
          style={{ cursor: "text", paddingRight: 44 }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="pw-eye"
        >
          <Icon width={17} height={17} aria-hidden />
        </button>
      </div>
      {help && (
        <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-mute)" }}>
          {help}
        </div>
      )}
    </div>
  )
}
