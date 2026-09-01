"use client"

import Link from "next/link"
import { useState, type FormEvent } from "react"
import { Logo } from "@/components/ui/Logo"
import { cn } from "@/lib/utils"

export default function ForgotEmailPage() {
  const [phone, setPhone] = useState("")

  function format(raw: string) {
    const d = raw.replace(/\D/g, "").slice(0, 10)
    const a = d.slice(0, 3)
    const b = d.slice(3, 6)
    const c = d.slice(6, 10)
    if (d.length === 0) return ""
    if (d.length < 4) return `(${a}`
    if (d.length < 7) return `(${a}) ${b}`
    return `(${a}) ${b}-${c}`
  }
  const digits = phone.replace(/\D/g, "")
  const canSubmit = digits.length === 10

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    window.location.href = "/login"
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-white text-ink-dark">
      <header className="px-6 py-6 md:px-12 md:py-8">
        <Link href="/" aria-label="Back to home">
          <Logo theme="light" className="text-3xl" />
        </Link>
      </header>

      <main className="mx-auto max-w-md px-6 pb-16 md:px-0">
        {/* Envelope illustration */}
        <div className="flex justify-center pt-4 pb-8">
          <EnvelopeIllustration />
        </div>

        <h1 className="font-display text-3xl font-bold tracking-tight text-ink-dark sm:text-4xl">
          Forgot email address
        </h1>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-dark/85">
          Tell us the phone number you used to sign up for your State Bank account.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <FloatingInput
            id="phone"
            label="Phone number"
            value={phone}
            onChange={(v) => setPhone(format(v))}
            inputMode="tel"
            autoComplete="tel"
            autoFocus
          />

          <p className="text-[15px] text-ink-dark/85">
            Need help? Call us at{" "}
            <a
              href="tel:18442446363"
              className="font-semibold underline underline-offset-4"
            >
              1 (844) 244-6363
            </a>
          </p>

          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "h-14 w-full rounded-2xl text-base font-semibold transition",
              canSubmit
                ? "bg-fern text-white hover:bg-fern/90"
                : "bg-ink-dark/[0.06] text-ink-dark/40",
            )}
          >
            Next
          </button>
        </form>

        <div className="mt-16 space-y-4 text-sm leading-relaxed text-ink-dark/70">
          <p>© 2026 State Bank. All Rights Reserved.</p>
          <p>
            Banking Services provided by State Bank Partner Bank, N.A., or Stride
            Bank, N.A., Members FDIC. The State Bank Visa® Debit Card is issued by
            State Bank Partner Bank, N.A., or Stride Bank pursuant to a license from
            Visa U.S.A. Inc. and may be used everywhere Visa debit cards are
            accepted. Please see back of your Card for its issuing bank.
          </p>
        </div>
      </main>
    </div>
  )
}

function EnvelopeIllustration() {
  return (
    <svg
      width="120"
      height="100"
      viewBox="0 0 120 100"
      fill="none"
      aria-hidden="true"
    >
      {/* sparkles top-right of envelope */}
      <path
        d="M88 8 L92 18 M94 6 L98 16 M100 10 L104 20"
        stroke="#2BB673"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* envelope body */}
      <rect
        x="14"
        y="28"
        width="84"
        height="60"
        rx="3"
        fill="#EEF8F1"
        stroke="#1A4D3E"
        strokeWidth="2"
      />
      {/* envelope flap */}
      <path
        d="M14 32 L56 62 L98 32"
        stroke="#1A4D3E"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

function FloatingInput({
  id,
  label,
  value,
  onChange,
  inputMode,
  autoComplete,
  autoFocus,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  inputMode?: "text" | "tel" | "numeric" | "email"
  autoComplete?: string
  autoFocus?: boolean
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        placeholder=" "
        className={cn(
          "peer h-16 w-full rounded-2xl border-2 bg-white px-5 pt-7 pb-2 text-[17px] text-ink-dark transition placeholder-transparent",
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
    </div>
  )
}
