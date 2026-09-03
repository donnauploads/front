"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { cn } from "@/lib/utils"
import { BRAND_NAME } from "@/lib/brand"
import {
  fetchMe,
  resendMfa,
  verifyMfa,
} from "@/lib/auth/api/auth.real"
import { ApiError, NetworkError } from "@/lib/api/errors"
import { useStore } from "@/lib/store"
import { useToast } from "@/components/providers/ToastProvider"
import { MAuthBar } from "@/components/get-started/MAuthBar"
import { SuToast, useSuToast } from "@/components/ui/SuToast"

import "../login-sb.css"

export default function MfaPage() {
  return (
    <Suspense fallback={null}>
      <MfaInner />
    </Suspense>
  )
}

function MfaInner() {
  const router = useRouter()
  const search = useSearchParams()
  const { toast } = useToast()
  const { message: bannerMsg, show: showBanner } = useSuToast()
  const setSessionUser = useStore((s) => s.setSessionUser)
  const setSessionStatus = useStore((s) => s.setSessionStatus)
  const setSessionId = useStore((s) => s.setSessionId)
  const setCustomerUser = useStore((s) => s.setUser)

  // Seeded from the login redirect's ?token=… but kept in state because each
  // successful resend rotates the capability token (the backend re-issues it
  // with a fresh expiry). Verify/resend must use the latest one.
  const [mfaToken, setMfaToken] = useState(() => search?.get("token") ?? "")
  const hint = search?.get("hint") ?? ""
  // Login MFA is email-only on the backend (auth.service uses
  // createEmailChallenge unconditionally). Keep the fallback honest so
  // users aren't told the code went to their phone when it really hit
  // their inbox.
  const fallbackHint = "your email"

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""])
  const [submitting, setSubmitting] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(30)
  // Shake animation + error message state. Bumping `shakeKey` re-mounts
  // the OTP grid so the keyframe re-fires on every consecutive failure.
  const [shakeKey, setShakeKey] = useState(0)
  const [errorMsg, setErrorMsg] = useState("")
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!mfaToken) router.replace("/login")
  }, [mfaToken, router])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const code = digits.join("")
  const canSubmit = code.length === 6 && /^\d{6}$/.test(code)

  function clearError() {
    if (errorMsg) setErrorMsg("")
  }

  function setDigit(i: number, v: string) {
    clearError()
    const cleaned = v.replace(/\D/g, "").slice(0, 1)
    setDigits((prev) => {
      const next = [...prev]
      next[i] = cleaned
      return next
    })
    if (cleaned && i < 5) inputs.current[i + 1]?.focus()
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!txt) return
    e.preventDefault()
    clearError()
    const next = ["", "", "", "", "", ""]
    for (let i = 0; i < txt.length; i++) next[i] = txt[i]!
    setDigits(next)
    inputs.current[Math.min(txt.length, 5)]?.focus()
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (!canSubmit) {
      setErrorMsg("Please enter all 6 digits.")
      setShakeKey((k) => k + 1)
      return
    }
    setSubmitting(true)
    try {
      const res = await verifyMfa({ mfaToken, code })
      setSessionId(res.sessionId)
      const me = await fetchMe()
      setSessionUser({
        id: me.id,
        email: me.email,
        firstName: me.firstName,
        lastName: me.lastName,
        role: me.role,
        novaTag: me.novaTag,
        phoneE164: me.phoneE164,
        avatarUrl: me.avatarUrl,
        status: me.status,
        securitySetupRequired: me.securitySetupRequired,
      })
      setCustomerUser({
        name: `${me.firstName} ${me.lastName}`.trim(),
        novaTag: me.novaTag ?? "",
        memberSince: new Date().getFullYear().toString(),
        initials:
          (me.firstName?.[0] ?? "") + (me.lastName?.[0] ?? "") || "??",
        avatarUrl: me.avatarUrl,
      })
      setSessionStatus("authenticated")
      router.push(
        me.role === "admin" || me.role === "superadmin" ? "/admin" : "/home",
      )
    } catch (err) {
      if (err instanceof NetworkError) {
        showBanner("Network error, try again.")
      } else if (err instanceof ApiError && err.status === 401) {
        setErrorMsg("That code didn't match.")
        setShakeKey((k) => k + 1)
        setDigits(["", "", "", "", "", ""])
        inputs.current[0]?.focus()
      } else {
        showBanner("Couldn't verify the code. Try again.")
      }
      setSubmitting(false)
    }
  }

  async function onResend() {
    if (resendCooldown > 0) return
    try {
      const { mfaToken: nextToken } = await resendMfa(mfaToken)
      setMfaToken(nextToken)
      toast("Sent a new code.", { variant: "success" })
      setDigits(["", "", "", "", "", ""])
      inputs.current[0]?.focus()
      setResendCooldown(30)
    } catch {
      showBanner("Couldn't resend. Try again in a moment.")
    }
  }

  const timerText = `0:${resendCooldown < 10 ? "0" : ""}${resendCooldown}`

  return (
    <div className="login-page">
      {/* Slide-down error banner (design's .su-toast). Surfaces network /
          unexpected-failure / resend errors above the page. */}
      <SuToast message={bannerMsg} />

      {/* Mobile-only auth bar (≤720px). Brand panel below is hidden via CSS. */}
      <MAuthBar />

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
            One more step to <span className="it">keep you safe</span>.
          </h1>
          <p className="lb-lede">
            Two-step verification protects your account even if someone learns
            your password. The code expires in 5 minutes.
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
              <path d="M12 2 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-4Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            Protected by two-step verification
          </span>
        </div>
      </aside>

      <main className="login-form-wrap">
        <div className="login-card">
          <span className="lc-eyebrow">Verification</span>
          <h2>Enter your code</h2>
          <p className="lc-sub">
            We&apos;ve sent a 6-digit verification code to{" "}
            <strong style={{ color: "var(--navy)" }}>
              {hint || fallbackHint}
            </strong>
            . Enter it below to continue.
          </p>

          <form onSubmit={onSubmit} noValidate>
            <div
              key={shakeKey}
              className={cn("otp-grid", shakeKey > 0 && "shake")}
            >
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el
                  }}
                  className={cn(
                    "otp-input",
                    d && "filled",
                    !!errorMsg && !d && "error",
                  )}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  aria-label={`Digit ${i + 1}`}
                  value={d}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onPaste={onPaste}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !d && i > 0) {
                      inputs.current[i - 1]?.focus()
                    } else if (e.key === "ArrowLeft" && i > 0) {
                      inputs.current[i - 1]?.focus()
                    } else if (e.key === "ArrowRight" && i < 5) {
                      inputs.current[i + 1]?.focus()
                    }
                  }}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <div className={cn("otp-err", errorMsg && "show")} role="alert">
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
              <span>{errorMsg || " "}</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={cn("btn btn-navy btn-login")}
            >
              {submitting ? (
                <span className="login-spinner" aria-label="Verifying" />
              ) : (
                <>
                  Verify and continue
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
                disabled={resendCooldown > 0}
              >
                {resendCooldown > 0
                  ? `Resend in ${timerText}`
                  : "Resend code"}
              </button>
            </div>
          </form>

          <div className="login-back">
            <Link href="/login">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M19 12H5M11 18l-6-6 6-6" />
              </svg>{" "}
              Back to sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
