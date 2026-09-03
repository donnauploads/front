"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { Eye, EyeOff, Fingerprint } from "lucide-react"
import { cn } from "@/lib/utils"
import { BRAND_NAME } from "@/lib/brand"
import { fetchMe, login, signInWithBiometric } from "@/lib/auth/api/auth.real"
import {
  getCanvasHash,
  getTimezone,
} from "@/lib/auth/device-fingerprint"
import { ApiError, NetworkError } from "@/lib/api/errors"
import { useStore } from "@/lib/store"
import { MAuthBar } from "@/components/get-started/MAuthBar"
import { SuToast, useSuToast } from "@/components/ui/SuToast"

import { useMocks as USE_MOCKS } from "@/lib/dev/use-mocks-flag"
import "./login-sb.css"

export default function LoginPage() {
  const router = useRouter()
  const { message: errorMsg, show: showErrorToast } = useSuToast()
  const setSessionUser = useStore((s) => s.setSessionUser)
  const setSessionStatus = useStore((s) => s.setSessionStatus)
  const setSessionId = useStore((s) => s.setSessionId)
  const setCustomerUser = useStore((s) => s.setUser)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bioSubmitting, setBioSubmitting] = useState(false)

  const canSubmit =
    /^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= 1

  async function hydrateAfterLogin(sessionId: string) {
    setSessionId(sessionId)
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
  }

  async function onBiometric() {
    if (bioSubmitting || submitting) return
    setBioSubmitting(true)
    try {
      // Pass the typed email so the backend can scope allowCredentials.
      // Single match → platform skips the picker and fires biometric
      // straight away. Empty/unknown email → backend falls back to the
      // generic discoverable-credential flow (the picker reappears).
      const res = await signInWithBiometric(
        getTimezone(),
        email.trim() || undefined,
      )
      await hydrateAfterLogin(res.sessionId)
    } catch (err) {
      const name = (err as Error & { name?: string })?.name ?? ""
      // Silently swallow user cancel — they backed out of the OS prompt.
      if (name === "NotAllowedError" || name === "AbortError") {
        setBioSubmitting(false)
        return
      }
      if (err instanceof NetworkError) {
        showErrorToast("Network error, can't reach the bank right now.")
      } else if (err instanceof ApiError && err.status === 401) {
        showErrorToast(
          "No matching biometric credential. Try email + password.",
        )
      } else if (err instanceof Error) {
        showErrorToast(err.message)
      } else {
        showErrorToast("Biometric sign-in failed.")
      }
      setBioSubmitting(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)

    if (USE_MOCKS) {
      // Preserve the demo path so designers running offline still land on /home.
      setTimeout(() => router.push("/home"), 700)
      return
    }

    try {
      const canvasHash = await getCanvasHash()
      const res = await login({
        email: email.trim(),
        password,
        timezone: getTimezone(),
        canvasHash,
      })

      if (res.stage === "mfa") {
        const qs = new URLSearchParams({
          token: res.mfaToken,
          hint: (res.emailHint ?? res.phoneHint) ?? "",
          channel: res.channel,
        })
        router.push(`/login/mfa?${qs.toString()}`)
        return
      }

      await hydrateAfterLogin(res.sessionId)
    } catch (err) {
      if (err instanceof NetworkError) {
        showErrorToast("Network error, can't reach the bank right now.")
      } else if (err instanceof ApiError && err.status === 401) {
        showErrorToast("Wrong email or password.")
      } else if (err instanceof ApiError && err.status === 403) {
        showErrorToast("This account isn't active.")
      } else {
        showErrorToast("Something went wrong. Try again.")
      }
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      {/* Slide-down error banner (design's .su-toast pattern). Replaces
          the prior pill-style global toast for error states. */}
      <SuToast message={errorMsg} />

      {/* Mobile-only auth bar (≤720px). Desktop hides this and shows the
          two-panel brand split below. */}
      <MAuthBar />

      {/* Brand panel — hidden ≤720px (CSS). */}
      <aside className="login-brand">
        <div className="lb-sky" aria-hidden />
        <div className="lb-cols" aria-hidden />

        <Link href="/" className="lb-top" aria-label={`${BRAND_NAME} home`}>
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
            Your money, <span className="it">in your hands</span>.
          </h1>
          <p className="lb-lede">
            Check balances, move money, manage your cards and track your
            spending, securely, any time, from anywhere.
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

      {/* Form panel. */}
      <main className="login-form-wrap">
        <div className="login-card">
          <span className="lc-eyebrow">Secure sign in</span>
          <h2>Sign in to your account</h2>
          <p className="lc-sub">
            Your connection is encrypted and protected.
          </p>

          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <div className="control">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="pass">Password</label>
              <div className="control">
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
                <input
                  id="pass"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="has-trailing"
                />
                <button
                  type="button"
                  className="eye-btn"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? (
                    <EyeOff aria-hidden />
                  ) : (
                    <Eye aria-hidden />
                  )}
                </button>
              </div>
            </div>

            <div className="login-row" style={{ justifyContent: "flex-end" }}>
              <Link href="/forgot-password">Forgot password?</Link>
            </div>

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className={cn("btn btn-navy btn-login")}
            >
              {submitting ? (
                <span className="login-spinner" aria-label="Signing in" />
              ) : (
                <>
                  Sign in securely
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

            <div className="login-or">
              <span>OR</span>
            </div>

            <button
              type="button"
              onClick={onBiometric}
              disabled={bioSubmitting || submitting}
              className={cn("btn-biometric", bioSubmitting && "scanning")}
            >
              {bioSubmitting ? (
                <>
                  <span
                    className="login-spinner"
                    aria-label="Scanning biometrics"
                  />
                  Scanning…
                </>
              ) : (
                <>
                  <Fingerprint aria-hidden />
                  Sign in with biometrics
                </>
              )}
            </button>

          </form>

          {/* "Not registered? Enrol in Online Banking" line commented out
              (not deleted).
          <div className="login-back">
            <Link href="/get-started">
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
              Not registered? <strong>Enrol in Online Banking</strong>
            </Link>
          </div>
          */}

        </div>
      </main>
    </div>
  )
}
