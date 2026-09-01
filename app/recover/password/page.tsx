"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState, type FormEvent } from "react"
import { Logo } from "@/components/ui/Logo"
import { cn } from "@/lib/utils"
import {
  PasswordStrength,
  isPasswordValid,
} from "@/components/auth/PasswordStrength"
import {
  validateToken,
  resetPassword,
  type ValidateTokenResult,
} from "@/lib/auth/api/password-reset"

type Stage =
  | { kind: "validating" }
  | { kind: "invalid"; reason: "missing" | "expired" | "invalid" }
  | { kind: "form" }
  | { kind: "submitting" }
  | { kind: "used" }
  | { kind: "success" }

export default function ResetPasswordPage() {
  // useSearchParams must be inside Suspense for Next.js prerender.
  return (
    <Suspense fallback={<PageChrome>{null}</PageChrome>}>
      <ResetPasswordInner />
    </Suspense>
  )
}

function ResetPasswordInner() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params?.get("token") ?? null

  const [stage, setStage] = useState<Stage>({ kind: "validating" })
  const [pw, setPw] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)

  // Token validation on mount.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result: ValidateTokenResult = await validateToken(token)
      if (cancelled) return
      setStage(
        result.valid ? { kind: "form" } : { kind: "invalid", reason: result.reason },
      )
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  // Auto-redirect 5s after success.
  useEffect(() => {
    if (stage.kind !== "success") return
    const t = setTimeout(() => router.push("/login"), 5000)
    return () => clearTimeout(t)
  }, [stage.kind, router])

  const passwordsMatch = pw.length > 0 && pw === confirm
  const canSubmit = isPasswordValid(pw) && passwordsMatch
  const submitting = stage.kind === "submitting"

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || submitting || !token) return
    setStage({ kind: "submitting" })
    const result = await resetPassword({ token, newPassword: pw })
    if (result.ok) {
      setStage({ kind: "success" })
    } else if (result.code === "TOKEN_USED") {
      setStage({ kind: "used" })
    } else {
      setStage({
        kind: "invalid",
        reason: result.code === "TOKEN_EXPIRED" ? "expired" : "invalid",
      })
    }
  }

  return (
    <PageChrome>
        {stage.kind === "validating" && <ValidatingState />}

        {stage.kind === "invalid" && <InvalidState reason={stage.reason} />}

        {stage.kind === "used" && <UsedState />}

        {(stage.kind === "form" || stage.kind === "submitting") && (
          <form onSubmit={onSubmit} className="space-y-4">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink-dark sm:text-3xl">
              Set a new password
            </h1>
            <p className="text-sm leading-relaxed text-ink-dark/70">
              Pick something strong. You'll use it the next time you sign in.
            </p>

            <PasswordField
              id="new-password"
              label="New password"
              value={pw}
              onChange={setPw}
              show={showPw}
              onToggleShow={() => setShowPw((v) => !v)}
              autoFocus
            />

            <PasswordField
              id="confirm-password"
              label="Confirm new password"
              value={confirm}
              onChange={setConfirm}
              show={showPw}
              onToggleShow={() => setShowPw((v) => !v)}
            />

            {confirm.length > 0 && !passwordsMatch && (
              <p className="text-xs text-rose-500" role="alert">
                Passwords don't match.
              </p>
            )}

            <PasswordStrength password={pw} />

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className={cn(
                "mt-2 flex h-14 w-full items-center justify-center rounded-2xl text-base font-semibold transition",
                canSubmit
                  ? "bg-fern text-white hover:bg-fern/90"
                  : "bg-ink-dark/[0.06] text-ink-dark/40",
              )}
            >
              {submitting ? (
                <span
                  aria-label="Updating password"
                  className="block h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white"
                />
              ) : (
                "Update password"
              )}
            </button>
          </form>
        )}

        {stage.kind === "success" && <SuccessState />}
    </PageChrome>
  )
}

function PageChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-white text-ink-dark">
      <header className="px-6 py-4 md:px-12 md:py-8">
        <Link href="/" aria-label="Back to home">
          <Logo theme="light" className="text-3xl" />
        </Link>
      </header>
      <main className="mx-auto max-w-md px-6 pb-10 md:px-0 md:pb-16">
        {children}
      </main>
    </div>
  )
}

/* ---------- Sub-views ---------- */

function ValidatingState() {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <span
        aria-label="Loading"
        className="block h-8 w-8 animate-spin rounded-full border-2 border-ink-dark/15 border-t-fern"
      />
      <p className="mt-4 text-sm text-ink-dark/70">Checking your link…</p>
    </div>
  )
}

function InvalidState({
  reason,
}: {
  reason: "missing" | "expired" | "invalid"
}) {
  const headline =
    reason === "expired"
      ? "This reset link has expired"
      : reason === "missing"
        ? "This reset link is incomplete"
        : "This reset link isn't valid"
  const body =
    reason === "expired"
      ? "For security, links only work for a limited time. Request a new one and we'll send it right away."
      : "It looks like the link was opened incorrectly or has already been used. Request a new one to continue."

  return (
    <div className="space-y-5">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-500">
        <WarnIcon />
      </div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink-dark sm:text-3xl">
        {headline}
      </h1>
      <p className="text-sm leading-relaxed text-ink-dark/70">{body}</p>
      <Link
        href="/forgot-password"
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-fern text-base font-semibold text-white transition hover:bg-fern/90"
      >
        Request a new link
      </Link>
      <Link
        href="/login"
        className="block text-center text-sm font-semibold text-ink-dark hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  )
}

function UsedState() {
  return (
    <div className="space-y-5">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <WarnIcon />
      </div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink-dark sm:text-3xl">
        This link has already been used
      </h1>
      <p className="text-sm leading-relaxed text-ink-dark/70">
        For your account's safety each reset link can only be used once.
        Request a fresh one to set a new password.
      </p>
      <Link
        href="/forgot-password"
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-fern text-base font-semibold text-white transition hover:bg-fern/90"
      >
        Request a new link
      </Link>
      <Link
        href="/login"
        className="block text-center text-sm font-semibold text-ink-dark hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  )
}

function SuccessState() {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-fern text-white">
        <CheckIcon />
      </div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink-dark sm:text-3xl">
        Your password is updated
      </h1>
      <p className="text-sm leading-relaxed text-ink-dark/70">
        Sign in with your new password to keep going. We'll take you there in
        a moment.
      </p>
      <Link
        href="/login"
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-fern text-base font-semibold text-white transition hover:bg-fern/90"
      >
        Continue to sign in
      </Link>
    </div>
  )
}

/* ---------- Input + icons ---------- */

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoFocus,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggleShow: () => void
  autoFocus?: boolean
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
        autoFocus={autoFocus}
        placeholder=" "
        className={cn(
          "peer h-16 w-full rounded-2xl border-2 bg-white px-5 pr-12 pt-7 pb-2 text-[17px] text-ink-dark transition placeholder-transparent",
          "border-ink-dark/15 hover:border-ink-dark/40 focus:border-ink-dark focus:outline-none",
        )}
      />
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[17px] text-ink-dark/55 transition-all",
          "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-ink-dark/60",
          "peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-ink-dark/60",
          "peer-[:-webkit-autofill]:top-2 peer-[:-webkit-autofill]:translate-y-0 peer-[:-webkit-autofill]:text-xs peer-[:-webkit-autofill]:text-ink-dark/60",
        )}
      >
        {label}
      </label>
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        onClick={onToggleShow}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-dark/65 hover:text-ink-dark"
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-6.5 0-10-7-10-7a18.36 18.36 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 9.88A3 3 0 0 0 9.88 14.12" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="32"
      height="32"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="4 12 10 18 20 6" />
    </svg>
  )
}
function WarnIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}
