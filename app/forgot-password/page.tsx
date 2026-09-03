"use client"

import Link from "next/link"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { ArrowLeft, Check, Eye, EyeOff, Lock, Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import { BRAND_NAME } from "@/lib/brand"
import { MAuthBar } from "@/components/get-started/MAuthBar"
import { SuToast, useSuToast } from "@/components/ui/SuToast"
import {
  recoverPasswordRequest,
  recoverPasswordReset,
  recoverPasswordVerify,
} from "@/lib/auth/api/auth.real"
import { ApiError, NetworkError } from "@/lib/api/errors"
import "../login/login-sb.css"

/**
 * Forgot-password 4-step flow — matches the design's forgot.html.
 *   0. Email entry
 *   1. 6-digit OTP code
 *   2. New password (with reveal-on-focus requirement list)
 *   3. Success
 *
 * Step 0 is wired to the existing backend recovery endpoint (sends a
 * reset email). Steps 1–3 are client-side optimistic UI — the backend
 * currently issues a magic link token, not an OTP, so wiring the
 * verify-code + set-new-password steps would require new endpoints.
 * Flag for follow-up backend work; the page itself ships the design
 * faithfully so flows can plug in once the API exists.
 */

const PWD_REQS = [
  {
    key: "len" as const,
    label: "8+ characters",
    test: (p: string) => p.length >= 8,
  },
  {
    key: "num" as const,
    label: "Contains a number",
    test: (p: string) => /\d/.test(p),
  },
  {
    key: "case" as const,
    label: "Lower and uppercase letters",
    test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p),
  },
  {
    key: "sp" as const,
    label: "Special character (!@#$ …)",
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
]

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i

function maskEmail(e: string): string {
  const [user, host] = e.split("@")
  if (!user || !host) return e
  const visible = user.slice(0, 2)
  const stars = "*".repeat(Math.max(0, user.length - 2))
  return `${visible}${stars}@${host}`
}

export default function ForgotPasswordPage() {
  const { message: errorMsg, show: showError } = useSuToast()

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)

  // ── Step 0: email ──────────────────────────────────────────────────
  const [email, setEmail] = useState("")
  const [emailErr, setEmailErr] = useState("")
  const [sending, setSending] = useState(false)

  // ── Step 1: OTP ─────────────────────────────────────────────────────
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""])
  const [otpErr, setOtpErr] = useState("")
  const [shakeKey, setShakeKey] = useState(0)
  const [resendIn, setResendIn] = useState(30)
  const otpInputs = useRef<(HTMLInputElement | null)[]>([])

  // ── Step 2: new password ───────────────────────────────────────────
  const [pwd, setPwd] = useState("")
  const [pwd2, setPwd2] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [showPwd2, setShowPwd2] = useState(false)
  const [pwdFocused, setPwdFocused] = useState(false)
  const [pwdErr, setPwdErr] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    if (step !== 1 || resendIn <= 0) return
    const t = setInterval(() => setResendIn((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [step, resendIn])

  // Focus the first OTP cell on entering Step 1.
  useEffect(() => {
    if (step === 1) {
      const t = window.setTimeout(() => otpInputs.current[0]?.focus(), 50)
      return () => window.clearTimeout(t)
    }
  }, [step])

  const reqResults = useMemo(
    () => PWD_REQS.map((r) => ({ ...r, ok: r.test(pwd) })),
    [pwd],
  )
  const allReqsOk = reqResults.every((r) => r.ok)

  // ── Step 0 submit ──────────────────────────────────────────────────
  async function onSubmitEmail(e: FormEvent) {
    e.preventDefault()
    if (sending) return
    if (!EMAIL_RE.test(email.trim())) {
      setEmailErr("Please enter a valid email address.")
      return
    }
    setEmailErr("")
    setSending(true)
    try {
      await recoverPasswordRequest({ email: email.trim() })
      // Backend always returns 200 here to avoid leaking whether the
      // address maps to an account, so unconditional advance is correct.
      setDigits(["", "", "", "", "", ""])
      setOtpErr("")
      setResetToken("")
      setResendIn(30)
      setStep(1)
    } catch (err) {
      if (err instanceof NetworkError) {
        showError("Network error, can't reach the bank right now.")
      } else {
        showError("Couldn't send the code. Try again in a moment.")
      }
    } finally {
      setSending(false)
    }
  }

  // ── Step 1 OTP handlers ────────────────────────────────────────────
  function setOtpAt(i: number, v: string) {
    if (otpErr) setOtpErr("")
    const ch = v.replace(/\D/g, "").slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[i] = ch
      return next
    })
    if (ch && i < 5) otpInputs.current[i + 1]?.focus()
    // Auto-verify once all 6 cells are filled (UX nicety so the user
    // doesn't have to also click Verify).
    if (i === 5 && ch) {
      const filled = [...digits.slice(0, 5), ch].join("")
      if (filled.length === 6) {
        window.setTimeout(() => verifyOtp(filled), 100)
      }
    }
  }

  function onOtpKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      otpInputs.current[i - 1]?.focus()
    } else if (e.key === "ArrowLeft" && i > 0) {
      otpInputs.current[i - 1]?.focus()
    } else if (e.key === "ArrowRight" && i < 5) {
      otpInputs.current[i + 1]?.focus()
    }
  }

  function onOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const txt = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6)
    if (!txt) return
    e.preventDefault()
    const next = ["", "", "", "", "", ""]
    for (let i = 0; i < txt.length; i++) next[i] = txt[i]!
    setDigits(next)
    otpInputs.current[Math.min(txt.length, 5)]?.focus()
    if (txt.length === 6) window.setTimeout(() => verifyOtp(txt), 100)
  }

  function onSubmitOtp(e: FormEvent) {
    e.preventDefault()
    const code = digits.join("")
    if (code.length < 6) {
      setOtpErr("Please enter all 6 digits.")
      setShakeKey((k) => k + 1)
      return
    }
    void verifyOtp(code)
  }

  async function verifyOtp(code: string) {
    if (verifying) return
    setVerifying(true)
    try {
      const { token } = await recoverPasswordVerify({
        email: email.trim(),
        code,
      })
      setResetToken(token)
      setOtpErr("")
      setStep(2)
    } catch (err) {
      if (err instanceof NetworkError) {
        showError("Network error, try again.")
      } else if (err instanceof ApiError && err.status === 401) {
        setOtpErr("That code didn't match.")
        setShakeKey((k) => k + 1)
        setDigits(["", "", "", "", "", ""])
        otpInputs.current[0]?.focus()
      } else {
        showError("Couldn't verify the code. Try again.")
      }
    } finally {
      setVerifying(false)
    }
  }

  async function onResend() {
    if (resendIn > 0) return
    try {
      await recoverPasswordRequest({ email: email.trim() })
      setDigits(["", "", "", "", "", ""])
      setOtpErr("")
      setResendIn(30)
      otpInputs.current[0]?.focus()
    } catch {
      showError("Couldn't resend right now. Try again in a moment.")
    }
  }

  // ── Step 2 submit ──────────────────────────────────────────────────
  async function onSubmitPassword(e: FormEvent) {
    e.preventDefault()
    if (resetting) return
    if (!allReqsOk) {
      setPwdErr("Your password doesn't meet all the requirements.")
      return
    }
    if (pwd !== pwd2) {
      setPwdErr("Passwords don't match.")
      return
    }
    if (!resetToken) {
      // Shouldn't happen — Step 2 is only reachable after verify mints
      // a token. Force the user back to retry if it does.
      showError("Session expired, please request a new code.")
      setStep(0)
      return
    }
    setPwdErr("")
    setResetting(true)
    try {
      await recoverPasswordReset({ token: resetToken, newPassword: pwd })
      setStep(3)
    } catch (err) {
      if (err instanceof NetworkError) {
        showError("Network error, try again.")
      } else if (err instanceof ApiError && err.status === 401) {
        showError("Reset link expired, please request a new code.")
        setResetToken("")
        setStep(0)
      } else if (err instanceof ApiError && err.status === 400) {
        setPwdErr(err.message || "Password didn't meet our requirements.")
      } else {
        showError("Couldn't reset your password. Try again.")
      }
    } finally {
      setResetting(false)
    }
  }

  const timerText = `0:${resendIn < 10 ? "0" : ""}${resendIn}`

  return (
    <div className="login-page">
      <SuToast message={errorMsg} />

      {/* Mobile-only auth header (≤880px). */}
      <MAuthBar />

      {/* Brand panel — visible at ≥880px. */}
      <aside className="login-brand">
        <div className="lb-sky" aria-hidden />
        <div className="lb-cols" aria-hidden />

        <Link
          href="/"
          className="lb-top"
          aria-label={`${BRAND_NAME} home`}
        >
          {/* White-on-transparent lockup (lp2) sits directly on the dark
              brand panel — no white card behind it. */}
          <img
            className="lb-logo"
            src="/lp2.png"
            alt={BRAND_NAME}
            style={{ background: "transparent", padding: 0, borderRadius: 0, height: 60 }}
          />
        </Link>

        <div>
          <h1>
            Let&apos;s get you <span className="it">back in</span>.
          </h1>
          <p className="lb-lede">
            Forgotten passwords happen. Verify your email, choose a new
            password, and you&apos;ll be signed in again in moments.
          </p>
        </div>

        <div className="lb-foot">
          <span className="lb-secure">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            256-bit encrypted · ISO 27001 certified
          </span>
        </div>
      </aside>

      <main className="login-form-wrap">
        <div className="login-card">
          {/* ── Step 0: email ───────────────────────────────────────── */}
          <section className={cn("fp-step", step === 0 && "active")}>
            <span className="lc-eyebrow">Password recovery</span>
            <h2>Forgot your password?</h2>
            <p className="lc-sub">
              Enter the email tied to your {BRAND_NAME} account and
              we&apos;ll send you a 6-digit code to reset it.
            </p>

            <form onSubmit={onSubmitEmail} noValidate>
              <div className="field">
                <label htmlFor="fpEmail">Email</label>
                <div className="control">
                  <Mail aria-hidden />
                  <input
                    id="fpEmail"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (emailErr) setEmailErr("")
                    }}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div
                className={cn("otp-err", emailErr && "show")}
                role="alert"
                style={{ marginBottom: 12 }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                <span>{emailErr || " "}</span>
              </div>

              <button
                type="submit"
                className="btn btn-navy btn-login"
                disabled={sending}
              >
                {sending ? (
                  <span className="login-spinner" aria-label="Sending" />
                ) : (
                  <>
                    Send reset code
                    <svg
                      className="arrow"
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="login-back">
              <Link href="/login">
                <ArrowLeft aria-hidden /> Back to sign in
              </Link>
            </div>
          </section>

          {/* ── Step 1: OTP ─────────────────────────────────────────── */}
          <section className={cn("fp-step", step === 1 && "active")}>
            <span className="lc-eyebrow">Verification</span>
            <h2>Enter your code</h2>
            <p className="lc-sub">
              We&apos;ve sent a 6-digit code to{" "}
              <strong style={{ color: "var(--navy)" }}>
                {email ? maskEmail(email) : "your email"}
              </strong>
              . Enter it below to continue.
            </p>

            <form onSubmit={onSubmitOtp} noValidate>
              <div
                key={shakeKey}
                className={cn("otp-grid", shakeKey > 0 && "shake")}
              >
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpInputs.current[i] = el
                    }}
                    className={cn(
                      "otp-input",
                      d && "filled",
                      !!otpErr && !d && "error",
                    )}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    aria-label={`Digit ${i + 1}`}
                    value={d}
                    onChange={(e) => setOtpAt(i, e.target.value)}
                    onPaste={onOtpPaste}
                    onKeyDown={(e) => onOtpKey(i, e)}
                  />
                ))}
              </div>

              <div className={cn("otp-err", otpErr && "show")} role="alert">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                <span>{otpErr || " "}</span>
              </div>

              <button
                type="submit"
                className="btn btn-navy btn-login"
                disabled={verifying}
              >
                {verifying ? (
                  <span className="login-spinner" aria-label="Verifying" />
                ) : (
                  <>
                    Verify code
                    <svg
                      className="arrow"
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </>
                )}
              </button>

              <div className="otp-resend">
                Didn&apos;t get the code?{" "}
                <button
                  type="button"
                  onClick={onResend}
                  disabled={resendIn > 0}
                >
                  {resendIn > 0 ? `Resend in ${timerText}` : "Resend code"}
                </button>
              </div>
            </form>

            <div className="login-back">
              <button
                type="button"
                onClick={() => setStep(0)}
                style={{
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  color: "inherit",
                  font: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <ArrowLeft aria-hidden /> Use a different email
              </button>
            </div>
          </section>

          {/* ── Step 2: new password ────────────────────────────────── */}
          <section className={cn("fp-step", step === 2 && "active")}>
            <span className="lc-eyebrow">New credentials</span>
            <h2>Create a new password</h2>
            <p className="lc-sub">
              Pick something only you would know. We&apos;ll sign you out of
              every other device when you change it.
            </p>

            <form onSubmit={onSubmitPassword} noValidate>
              <div className="field">
                <label htmlFor="fpPass">New password</label>
                <div className="control">
                  <Lock aria-hidden />
                  <input
                    id="fpPass"
                    type={showPwd ? "text" : "password"}
                    value={pwd}
                    onChange={(e) => {
                      setPwd(e.target.value)
                      if (pwdErr) setPwdErr("")
                    }}
                    onFocus={() => setPwdFocused(true)}
                    autoComplete="new-password"
                    className="has-trailing"
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    onClick={() => setShowPwd((v) => !v)}
                  >
                    {showPwd ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                  </button>
                </div>
              </div>

              <ul className={cn("fp-reqs", pwdFocused && "show")}>
                {reqResults.map((r) => (
                  <li key={r.key} className={cn(r.ok && "ok")}>
                    {r.ok ? (
                      <Check aria-hidden />
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    )}
                    {r.label}
                  </li>
                ))}
              </ul>

              <div className="field">
                <label htmlFor="fpPass2">Confirm new password</label>
                <div className="control">
                  <Lock aria-hidden />
                  <input
                    id="fpPass2"
                    type={showPwd2 ? "text" : "password"}
                    value={pwd2}
                    onChange={(e) => {
                      setPwd2(e.target.value)
                      if (pwdErr) setPwdErr("")
                    }}
                    autoComplete="new-password"
                    className="has-trailing"
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    aria-label={showPwd2 ? "Hide password" : "Show password"}
                    onClick={() => setShowPwd2((v) => !v)}
                  >
                    {showPwd2 ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                  </button>
                </div>
              </div>

              <div
                className={cn("otp-err", pwdErr && "show")}
                role="alert"
                style={{ marginBottom: 12 }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                <span>{pwdErr || " "}</span>
              </div>

              <button
                type="submit"
                className="btn btn-navy btn-login"
                disabled={resetting}
              >
                {resetting ? (
                  <span className="login-spinner" aria-label="Resetting" />
                ) : (
                  <>
                    Reset password
                    <svg
                      className="arrow"
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </section>

          {/* ── Step 3: success ─────────────────────────────────────── */}
          <section className={cn("fp-step", step === 3 && "active")}>
            <div className="fp-done">
              <div className="fp-check">
                <Check strokeWidth={2.5} aria-hidden />
              </div>
              <span className="lc-eyebrow">Done</span>
              <h2>Password reset</h2>
              <p className="lc-sub">
                Your password has been updated. You can now sign in with your
                new credentials.
              </p>
              <Link
                href="/login"
                className="btn btn-navy btn-login"
                style={{ marginTop: 18 }}
              >
                Back to sign in
                <svg
                  className="arrow"
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
