"use client"

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { BRAND_NAME } from "@/lib/brand"
import { MAuthBar } from "@/components/get-started/MAuthBar"
import { useToast } from "@/components/providers/ToastProvider"
import { SuToast, useSuToast } from "@/components/ui/SuToast"
import { useStore } from "@/lib/store"
import type { VerificationChannel } from "@/lib/store"
import { isPasswordValid } from "@/components/auth/PasswordStrength"
import {
  beginSignup,
  sendVerification,
  verifyCode,
  resendVerification,
  submitDob,
  submitAddress,
  submitPassword,
  submitDetails,
  submitSsn,
  uploadSignupDocument,
  markDocumentsDone,
  completeSignup,
  maskEmail,
  maskPhone,
  type DocumentSubtype,
} from "@/lib/get-started/api/verification"
import { ApiError } from "@/lib/api/errors"
import {
  PhoneInput,
  emptyPhone,
  type PhoneInputValue,
} from "@/components/get-started/PhoneInput"
import "./signup-sb.css"

/** State Bank heraldic crest — the full detailed version that
 *  matches the homepage nav (sun/compass motif + colonnade). */
function SuCrest({ className = "su-crest" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 112" fill="none" aria-hidden="true">
      <path
        d="M50 4 6 22v40c0 27 19 41 44 46 25-5 44-19 44-46V22L50 4Z"
        fill="#0B2545"
        stroke="#C9A961"
        strokeWidth="2.5"
      />
      <path
        d="M50 13 14 28v33c0 22 15 33 36 38 21-5 36-16 36-38V28L50 13Z"
        fill="none"
        stroke="#C9A961"
        strokeWidth="1"
        opacity=".5"
      />
      <circle cx="50" cy="33" r="6" fill="none" stroke="#C9A961" strokeWidth="2" />
      <path
        d="M50 24v-6M50 48v-6M59 33h6M35 33h6M56.5 26.5l4-4M39.5 39.5l-4 4M56.5 39.5l4 4M39.5 26.5l-4-4"
        stroke="#C9A961"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M37 54h26M40 54v30M48 54v30M56 54v30M60 54v30M44 54v30M52 54v30M35 86h30"
        stroke="#C9A961"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Back-arrow icon used by the `.su-back` step buttons. */
function BackArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  )
}

/** Native select styled to the design's `select.su-in` — shows the label as
 *  a muted placeholder when empty, custom chevron, navy/gold focus ring. */
/**
 * Styled dropdown replacing the native <select>. The open list is capped
 * to ~5 visible rows (the rest scroll vertically; no horizontal bar) and
 * flips upward when there isn't room below. Keeps the same value/onChange
 * contract so the rest of the form is unchanged. The first row is the
 * `label` placeholder.
 */
function SuSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly string[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [up, setUp] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  // Close on outside click / Escape while open.
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    // Flip upward when there isn't room below but there is above.
    const r = btnRef.current?.getBoundingClientRect()
    if (r) {
      const spaceBelow = window.innerHeight - r.bottom
      const spaceAbove = r.top
      const popH = Math.min(options.length * 48 + 12, 244) + 12
      setUp(spaceBelow < popH && spaceAbove > spaceBelow)
    }
    setOpen(true)
  }

  // Scroll the selected row into view when opening.
  useEffect(() => {
    if (!open || !popRef.current) return
    const sel = popRef.current.querySelector(".cs-opt.sel") as HTMLElement | null
    if (sel) popRef.current.scrollTop = Math.max(0, sel.offsetTop - 6)
  }, [open])

  return (
    <div className={cn("cs", open && "open", up && "up")} ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={cn("cs-btn", !value && "placeholder")}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        <span className="cs-val">{value || label}</span>
        <svg
          className="cs-chev"
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
      <div className="cs-pop" role="listbox" aria-label={label} ref={popRef}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="option"
            aria-selected={o === value}
            className={cn("cs-opt", o === value && "sel")}
            onClick={() => {
              onChange(o)
              setOpen(false)
            }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

type Step =
  | "name"
  | "choose-channel"
  | "verify"
  | "dob"
  | "address"
  | "password"
  | "details"
  | "ssn"
  | "documents"
  | "done"

// Step ordering for the progress bar (excludes "done", which is a
// completion screen rather than a progress segment).
export const SIGNUP_STEPS: readonly Step[] = [
  "name",
  "choose-channel",
  "verify",
  "dob",
  "address",
  "password",
  "details",
  "ssn",
  "documents",
]

// Any step past `name` requires email + phone collected on Name.
const REQUIRES_CONTACT_INFO: ReadonlySet<Step> = new Set<Step>([
  "choose-channel",
  "verify",
  "dob",
  "address",
  "password",
  "details",
  "ssn",
  "documents",
  "done",
])

// `verify` requires a channel + verificationId from the choose-channel step.
const REQUIRES_VERIFICATION_STARTED: ReadonlySet<Step> = new Set<Step>([
  "verify",
])

/** Map the UI's ID-type label to the backend's DocumentSubtype enum. */
function idTypeToSubtype(label: string): DocumentSubtype {
  const l = label.toLowerCase()
  if (l.includes("driver")) return "drivers_license"
  if (l.includes("passport")) return "passport"
  if (l.includes("state")) return "state_id"
  if (l.includes("ssn")) return "ssn_card"
  return "other"
}

// Any step past `verify` requires the verification to be complete.
const REQUIRES_VERIFIED: ReadonlySet<Step> = new Set<Step>([
  "dob",
  "address",
  "password",
  "details",
  "ssn",
  "documents",
  "done",
])

export default function GetStarted() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("name")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState<PhoneInputValue>(emptyPhone())
  const [dob, setDob] = useState("")

  const signup = useStore((s) => s.signup)
  const setSignupId = useStore((s) => s.setSignupId)
  const setSignupPhoneE164 = useStore((s) => s.setSignupPhoneE164)
  const setVerificationChannel = useStore((s) => s.setVerificationChannel)
  const setVerificationId = useStore((s) => s.setVerificationId)
  const setVerifiedAt = useStore((s) => s.setVerifiedAt)
  // const resetSignup = useStore((s) => s.resetSignup) // available if needed

  const phoneE164 = signup.phoneE164
  const canContinue =
    firstName.trim().length > 1 &&
    lastName.trim().length > 1 &&
    /^\S+@\S+\.\S+$/.test(email.trim()) &&
    phone.e164 !== null

  const [submitting, setSubmitting] = useState(false)

  // Guards: enforce the linear flow even if a future URL-routed step
  // refactor lets users jump around.
  useEffect(() => {
    if (REQUIRES_CONTACT_INFO.has(step) && (!email || !phoneE164)) {
      setStep("name")
      return
    }
    if (
      REQUIRES_VERIFICATION_STARTED.has(step) &&
      (!signup.verificationChannel || !signup.verificationId)
    ) {
      setStep("choose-channel")
      return
    }
    if (REQUIRES_VERIFIED.has(step) && !signup.verifiedAt) {
      setStep(signup.verificationId ? "verify" : "choose-channel")
    }
  }, [
    step,
    email,
    phoneE164,
    signup.verificationChannel,
    signup.verificationId,
    signup.verifiedAt,
  ])

  // Top-of-page slide-down error banner (design's .su-toast). Replaces the
  // inline red-text under-the-form pattern so server-side validation errors
  // (e.g. "phoneE164 must be in international E.164 format…") surface as a
  // brief flash at the top instead of pushing form fields around.
  const { message: signupBanner, show: showSignupBanner } = useSuToast()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canContinue || submitting) return
    const e164 = phone.e164
    if (!e164) return
    setSubmitting(true)
    try {
      // POST /auth/signup/begin. We only call this if there isn't already
      // a signupId in the store — refreshing the page or going back from
      // a later step should reuse the same session.
      let signupId = signup.signupId
      if (!signupId) {
        const res = await beginSignup({
          firstName,
          lastName,
          email: email.trim(),
          phoneE164: e164,
        })
        signupId = res.signupId
        setSignupId(signupId)
      }
      setSignupPhoneE164(e164)
      // Picking a new channel + code on the next screen invalidates any
      // earlier verification artifacts.
      setVerificationChannel(null)
      setVerificationId(null)
      setVerifiedAt(null)
      setStep("choose-channel")
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        showSignupBanner("An account with this email already exists.")
      } else if (err instanceof ApiError && err.status === 400) {
        // The backend's phoneE164 message is technical ("phoneE164 must be
        // in international E.164 format, e.g. +97336001234"). Rewrite it to
        // something human; fall back to verbatim for other 400s.
        const m = (err.message || "").toLowerCase()
        if (m.includes("phonee164") || m.includes("e.164")) {
          showSignupBanner(
            "That phone number doesn't look right. Check the country and try again.",
          )
        } else {
          showSignupBanner(err.message || "Check the details and try again.")
        }
      } else {
        showSignupBanner("Couldn't start signup. Try again in a moment.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Progress bar fill — based on the current step's position in the flow.
  const stepIdx = SIGNUP_STEPS.indexOf(step)
  const progress =
    step === "done"
      ? 100
      : Math.round(((Math.max(stepIdx, 0) + 1) / SIGNUP_STEPS.length) * 100)

  return (
    <div className="sb-su su-page">
      {/* Top-of-page slide-down error banner — wired to begin-signup
          failures (server-side validation, conflicts, network). */}
      <SuToast message={signupBanner} />
      {/* Mobile-only auth header (crest + wordmark + hamburger dropdown).
          Desktop continues to use the .su-top brand bar below. */}
      <MAuthBar />
      {/* Left column wrapper (form side). At ≥880px .su-page becomes a
          two-column grid: this `.su-main` holds the wizard, .su-brand-panel
          renders the marketing aside on the right. Below 880px it's just a
          transparent flex column — the design carries no impact at mobile. */}
      <div className="su-main">
      {/* Sticky brand header — matches the homepage nav brand exactly. */}
      <div className="su-top">
        <div className="su-top-inner">
          <Link
            href="/"
            className="su-brandlink"
            aria-label={`${BRAND_NAME} home`}
          >
            {/* Real State Bank logo (wordmark + crest baked in). Replaces the
                inline SVG crest + wordmark to match the redesign. */}
            <img
              className="su-logo"
              src="/brand/sb-logo.png"
              alt={BRAND_NAME}
            />
          </Link>
        </div>
      </div>

      <div className="su-wrap">
        <div className="su-card">
          <div className="su-progress su-progress-top">
            <span style={{ width: `${progress}%` }} />
          </div>
          {step === "name" && (
            <NameStep
              firstName={firstName}
              lastName={lastName}
              email={email}
              phone={phone}
              setFirstName={setFirstName}
              setLastName={setLastName}
              setEmail={setEmail}
              setPhone={setPhone}
              canContinue={canContinue}
              onSubmit={onSubmit}
              submitting={submitting}
            />
          )}
          {step === "choose-channel" && (
            <ChooseChannelStep
              email={email}
              phoneE164={signup.phoneE164 ?? ""}
              signupId={signup.signupId ?? ""}
              initialChannel={signup.verificationChannel}
              onBack={() => setStep("name")}
              onSessionGone={() => {
                // Backend doesn't recognise this signupId (stale localStorage
                // from a wiped/expired session) — clear it and bounce back to
                // the name step so the user can start a fresh session.
                setSignupId(null)
                setVerificationChannel(null)
                setVerificationId(null)
                setStep("name")
              }}
              onSent={(channel, verificationId) => {
                setVerificationChannel(channel)
                setVerificationId(verificationId)
                setVerifiedAt(null) // fresh verification
                setStep("verify")
              }}
            />
          )}
          {step === "verify" && signup.verificationChannel && (
            <VerifyStep
              channel={signup.verificationChannel}
              email={email}
              phoneE164={signup.phoneE164 ?? ""}
              signupId={signup.signupId ?? ""}
              verificationId={signup.verificationId ?? ""}
              onTryAnotherWay={() => setStep("choose-channel")}
              onComplete={() => {
                setVerifiedAt(Date.now())
                setStep("dob")
              }}
            />
          )}
          {step === "dob" && (
            <DobStep
              dob={dob}
              setDob={setDob}
              onBack={() => setStep("verify")}
              onContinue={async () => {
                const id = signup.signupId
                if (!id) throw new ApiError("NO_SIGNUP", "Restart signup.")
                const digits = dob.replace(/\D/g, "")
                const iso = `${digits.slice(4, 8)}-${digits.slice(0, 2)}-${digits.slice(2, 4)}`
                await submitDob({ signupId: id, dob: iso })
                setStep("address")
              }}
            />
          )}
          {step === "address" && (
            <AddressStep
              onBack={() => setStep("dob")}
              onContinue={async (values) => {
                const id = signup.signupId
                if (!id) throw new ApiError("NO_SIGNUP", "Restart signup.")
                await submitAddress({ signupId: id, ...values })
                setStep("password")
              }}
            />
          )}
          {step === "password" && (
            <PasswordStep
              onBack={() => setStep("address")}
              onContinue={async (password) => {
                const id = signup.signupId
                if (!id) throw new ApiError("NO_SIGNUP", "Restart signup.")
                await submitPassword({ signupId: id, password })
                setStep("details")
              }}
            />
          )}
          {step === "details" && (
            <MoreDetailsStep
              onBack={() => setStep("password")}
              onContinue={async (values) => {
                const id = signup.signupId
                if (!id) throw new ApiError("NO_SIGNUP", "Restart signup.")
                await submitDetails({ signupId: id, ...values })
                setStep("ssn")
              }}
            />
          )}
          {step === "ssn" && (
            <SsnStep
              onBack={() => setStep("details")}
              onContinue={async (ssn) => {
                const id = signup.signupId
                if (!id) throw new ApiError("NO_SIGNUP", "Restart signup.")
                await submitSsn({ signupId: id, ssn })
                setStep("documents")
              }}
            />
          )}
          {step === "documents" && (
            <DocumentsStep
              onBack={() => setStep("ssn")}
              onContinue={async ({
                idType,
                billType,
                idFrontFile,
                idBackFile,
                billFile,
              }) => {
                const id = signup.signupId
                if (!id) throw new ApiError("NO_SIGNUP", "Restart signup.")
                const subtype = idTypeToSubtype(idType)
                // Run the real signup pipeline alongside a 4s minimum
                // hold. The button's existing spinner keeps spinning the
                // whole time, so even on a fast network the user gets a
                // deliberate "we're processing your application" beat
                // before the success screen lands. If the uploads take
                // longer than 4s, the longer one wins — no double wait.
                await Promise.all([
                  (async () => {
                    // 1. Upload ID front.
                    await uploadSignupDocument({
                      signupId: id,
                      type: "id_front",
                      subtype,
                      file: idFrontFile,
                    })
                    // 2. Upload ID back (same subtype as front).
                    await uploadSignupDocument({
                      signupId: id,
                      type: "id_back",
                      subtype,
                      file: idBackFile,
                    })
                    // 3. Upload the bill as utility_bill.
                    await uploadSignupDocument({
                      signupId: id,
                      type: "utility_bill",
                      subtype: "other",
                      file: billFile,
                    })
                    // 4. Mark docs done — server transitions stage.
                    await markDocumentsDone({ signupId: id })
                    // 5. Finalize — creates the User + KycRecord.
                    await completeSignup({ signupId: id })
                  })(),
                  new Promise<void>((resolve) =>
                    window.setTimeout(resolve, 4000),
                  ),
                ])
                // billType captured for UI only — no server field yet.
                void billType
                setStep("done")
              }}
            />
          )}
          {step === "done" && (
            <DoneStep
              firstName={firstName}
              email={email}
              onContinue={() => router.push("/login")}
            />
          )}
        </div>
      </div>
      </div>
      {/* Right brand panel — only visible at ≥880px (CSS handles hide).
          Mirrors the login brand panel: sky + columns + logo + tagline +
          security strip, with sides INVERTED relative to login (form left,
          brand right). */}
      <aside className="su-brand-panel" aria-hidden>
        <div className="lb-sky" />
        <div className="lb-cols" />
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
            Open your account <span className="it">in minutes</span>.
          </h1>
          <p className="lb-lede">
            Join over two million customers. Apply online, verify your
            identity securely, and start banking the moment you&apos;re
            approved.
          </p>
        </div>
        <div className="lb-foot">
          <span className="lb-secure">
            <svg
              width="16"
              height="16"
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
    </div>
  )
}

function FloatingInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  autoFocus,
}: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  autoFocus?: boolean
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        // The literal-space placeholder is what makes `:placeholder-shown`
        // a reliable empty-state probe — works for browser autofill which
        // doesn't synchronously fire onChange in React.
        placeholder=" "
        className={cn(
          "peer h-16 w-full rounded-xl border-2 bg-white px-4 pt-5 pb-1 text-base text-ink-dark transition placeholder-transparent",
          "border-ink-dark/15 hover:border-ink-dark/40 focus:border-ink-dark focus:outline-none",
        )}
      />
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-ink-dark/55 transition-all",
          // Float on focus OR when the input has any visible content
          // (covers autofill, drag-and-drop, paste, etc.).
          "peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-ink-dark/60",
          "peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-ink-dark/60",
          // Chrome's autofill *preview* (hover over a suggestion) leaves
          // the React value empty so the selectors above miss it — match
          // :-webkit-autofill explicitly so the label still floats.
          "peer-[:-webkit-autofill]:top-3 peer-[:-webkit-autofill]:translate-y-0 peer-[:-webkit-autofill]:text-xs peer-[:-webkit-autofill]:text-ink-dark/60",
        )}
      >
        {label}
      </label>
    </div>
  )
}

function NameStep({
  firstName,
  lastName,
  email,
  phone,
  setFirstName,
  setLastName,
  setEmail,
  setPhone,
  canContinue,
  onSubmit,
  submitting,
}: {
  firstName: string
  lastName: string
  email: string
  phone: PhoneInputValue
  setFirstName: (v: string) => void
  setLastName: (v: string) => void
  setEmail: (v: string) => void
  setPhone: (v: PhoneInputValue) => void
  canContinue: boolean
  onSubmit: (e: FormEvent) => void
  submitting: boolean
}) {
  const [disclosuresOpen, setDisclosuresOpen] = useState(false)
  const phoneInvalid = phone.display.length > 0 && phone.e164 === null
  return (
    <form onSubmit={onSubmit} className="su-step active">
      <h1>Your contact info</h1>
      <p className="su-sub">
        Tell us your legal name, exactly as it appears on a government-issued
        ID, plus the email and phone you'd like to use.
      </p>

      <div className="su-fields">
        <input
          className="su-in"
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          autoComplete="given-name"
          autoFocus
        />
        <input
          className="su-in"
          placeholder="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          autoComplete="family-name"
        />
        <input
          className="su-in"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <PhoneInput value={phone} onChange={setPhone} invalid={phoneInvalid} />
        {phoneInvalid && (
          <p className="su-err" role="alert">
            Enter a valid phone number for the selected country.
          </p>
        )}
        {/* Server-side errors (conflict / 400 validation / network) are
            now routed to the top-of-page .su-toast banner via
            useSuToast, so no inline strip is rendered here. */}
      </div>

      <p className="su-legal" style={{ textAlign: "center" }}>
        See{" "}
        <button
          type="button"
          onClick={() => setDisclosuresOpen(true)}
          style={{
            color: "#C9A24B",
            fontWeight: 700,
            textDecoration: "underline",
            textUnderlineOffset: "2px",
          }}
        >
          legal disclosures
        </button>
        .
      </p>

      <DisclosuresModal
        open={disclosuresOpen}
        onClose={() => setDisclosuresOpen(false)}
      />

      <button className="su-btn" type="submit" disabled={!canContinue || submitting}>
        {submitting ? <span className="su-spin" aria-label="Loading" /> : "Continue"}
      </button>
      <p className="su-signin">
        Already bank with us? <Link href="/login">Log in</Link>
      </p>
    </form>
  )
}

/* ---------- Choose-Channel step ---------- */

function ChooseChannelStep({
  email,
  phoneE164,
  signupId,
  initialChannel,
  onBack,
  onSent,
  onSessionGone,
}: {
  email: string
  phoneE164: string
  signupId: string
  initialChannel: VerificationChannel | null
  onBack: () => void
  onSessionGone: () => void
  onSent: (channel: VerificationChannel, verificationId: string) => void
}) {
  const [picked, setPicked] = useState<VerificationChannel | null>(
    initialChannel,
  )
  const [sending, setSending] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  // Top-banner toast, mirrors the verification-code step's wrong-code
  // toast (solid red, slides down from the top edge) instead of inline
  // red text below the form.
  function suToast(msg: string) {
    setToastMsg(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 3400)
  }
  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    },
    [],
  )

  async function onSend() {
    if (!picked || sending) return
    setSending(true)
    setToastMsg(null)
    try {
      const { verificationId } = await sendVerification({
        signupId,
        channel: picked,
      })
      onSent(picked, verificationId)
    } catch (err) {
      // Stale signupId — session was wiped server-side (e.g. database
      // reset, expired). Send the user back to the name step to mint a
      // fresh session instead of stranding them on a dead step.
      if (
        err instanceof ApiError &&
        (err.status === 404 || /signup session/i.test(err.message ?? ""))
      ) {
        suToast("Let's start over, your signup session expired.")
        setTimeout(() => onSessionGone(), 600)
        return
      }
      const msg =
        err instanceof ApiError && err.message
          ? err.message
          : "Couldn't send the code. Try again in a moment."
      suToast(msg)
      setSending(false)
    }
  }

  return (
    <div className="su-step active">
      {toastMsg && (
        <div className="su-toast show" role="alert" aria-live="polite">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span>{toastMsg}</span>
        </div>
      )}
      <button type="button" className="su-back" onClick={onBack}>
        <BackArrow /> Back
      </button>

      <h1>How should we send your code?</h1>
      <p className="su-sub">Pick the channel that&apos;s easiest for you right now.</p>

      <div className="su-choice" role="radiogroup" aria-label="Verification channel">
        <button
          type="button"
          role="radio"
          aria-checked={picked === "email"}
          onClick={() => setPicked("email")}
          className={cn("su-opt", picked === "email" && "selected")}
        >
          <span className="o-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </span>
          <span className="o-body">
            <span className="o-t">Email</span>
            <span className="o-s">{email ? maskEmail(email) : "your email"}</span>
          </span>
          <span className="o-radio">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={picked === "sms"}
          onClick={() => setPicked("sms")}
          className={cn("su-opt", picked === "sms" && "selected")}
        >
          <span className="o-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
            </svg>
          </span>
          <span className="o-body">
            <span className="o-t">Text message</span>
            <span className="o-s">{phoneE164 ? maskPhone(phoneE164) : "your phone"}</span>
          </span>
          <span className="o-radio">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
        </button>
      </div>

      <p className="su-hint">We&apos;ll send a 6-digit code to verify it&apos;s you.</p>

      <button className="su-btn" type="button" onClick={onSend} disabled={!picked || sending}>
        {sending ? <span className="su-spin" aria-label="Sending" /> : "Send code"}
      </button>
    </div>
  )
}

function DobStep({
  dob,
  setDob,
  onBack,
  onContinue,
}: {
  dob: string
  setDob: (v: string) => void
  onBack: () => void
  onContinue: () => Promise<void>
}) {
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  // Format input as MM / DD / YYYY while typing
  function format(raw: string) {
    const d = raw.replace(/\D/g, "").slice(0, 8)
    const mm = d.slice(0, 2)
    const dd = d.slice(2, 4)
    const yy = d.slice(4, 8)
    let out = mm
    if (d.length >= 3) out += " / " + dd
    if (d.length >= 5) out += " / " + yy
    return out
  }

  function isAdult(value: string): boolean {
    const digits = value.replace(/\D/g, "")
    if (digits.length !== 8) return false
    const month = parseInt(digits.slice(0, 2), 10)
    const day = parseInt(digits.slice(2, 4), 10)
    const year = parseInt(digits.slice(4, 8), 10)
    if (month < 1 || month > 12 || day < 1 || day > 31) return false
    const birth = new Date(year, month - 1, day)
    if (Number.isNaN(birth.getTime())) return false
    const now = new Date()
    let age = now.getFullYear() - year
    const beforeBirthday =
      now.getMonth() < month - 1 ||
      (now.getMonth() === month - 1 && now.getDate() < day)
    if (beforeBirthday) age -= 1
    return age >= 18
  }

  const valid = isAdult(dob)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid || submitting) return
    setServerError(null)
    setSubmitting(true)
    try {
      await onContinue()
    } catch (err) {
      setServerError(
        err instanceof ApiError && err.message
          ? err.message
          : "Couldn't save. Try again.",
      )
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="su-step active">
      <button type="button" className="su-back" onClick={onBack}>
        <BackArrow /> Back
      </button>
      <h1>Date of birth</h1>
      <p className="su-sub">You must be at least 18 to join.</p>

      <div className="su-fields">
        <input
          className="su-in"
          autoFocus
          inputMode="numeric"
          maxLength={14}
          value={dob}
          onChange={(e) => setDob(format(e.target.value))}
          placeholder="MM / DD / YYYY"
        />
      </div>

      {serverError && (
        <p className="su-err" role="alert">
          {serverError}
        </p>
      )}

      <button className="su-btn" type="submit" disabled={!valid || submitting}>
        {submitting ? <span className="su-spin" aria-label="Saving" /> : "Continue"}
      </button>
    </form>
  )
}

/* ---------- Channel-agnostic verification step ---------- */

function VerifyStep({
  channel,
  email,
  phoneE164,
  signupId,
  verificationId,
  onTryAnotherWay,
  onComplete,
}: {
  channel: VerificationChannel
  email: string
  phoneE164: string
  signupId: string
  verificationId: string
  onTryAnotherWay: () => void
  onComplete: () => void
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""))
  const [resendIn, setResendIn] = useState(60)
  const [verifying, setVerifying] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [shakeKey, setShakeKey] = useState(0)
  const toastTimer = useRef<number | null>(null)
  const { toast } = useToast()

  // Top-banner toast (signup-styled). Replaces inline red text — the design
  // bundle's wrong-code toast slides down from the top edge in solid red.
  function suToast(msg: string) {
    setToastMsg(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 3400)
  }
  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    },
    [],
  )

  useEffect(() => {
    if (resendIn <= 0 || verifying) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn, verifying])

  async function startVerify(fullCode: string) {
    setVerifying(true)
    try {
      await verifyCode({ signupId, verificationId, code: fullCode })
      setTimeout(() => onComplete(), 250)
    } catch {
      suToast("That code isn't correct. Please check and try again.")
      // Bump shakeKey to re-trigger the keyframe on consecutive failures
      // (CSS-only re-animation needs a remount or a class drop/forced
      // reflow — the key bump is the React equivalent).
      setShakeKey((k) => k + 1)
      setDigits(Array(6).fill(""))
      setVerifying(false)
      const first = document.getElementById("verify-code-0") as
        | HTMLInputElement
        | null
      first?.focus()
    }
  }

  function setAt(i: number, v: string) {
    if (verifying) return
    const ch = v.replace(/\D/g, "").slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[i] = ch
      return next
    })
    if (ch) {
      const nextEl = document.getElementById(`verify-code-${i + 1}`) as
        | HTMLInputElement
        | null
      nextEl?.focus()
    }
    if (i === 5 && ch) {
      const full = [...digits.slice(0, 5), ch].join("")
      if (full.length === 6) startVerify(full)
    }
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      const prevEl = document.getElementById(`verify-code-${i - 1}`) as
        | HTMLInputElement
        | null
      prevEl?.focus()
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = Array(6).fill("")
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    const focusIdx = Math.min(pasted.length, 5)
    const el = document.getElementById(`verify-code-${focusIdx}`) as
      | HTMLInputElement
      | null
    el?.focus()
    if (pasted.length === 6) startVerify(pasted)
  }

  async function onResend() {
    if (resendIn > 0 || verifying) return
    try {
      await resendVerification({ signupId, verificationId })
      setResendIn(60)
      toast("New code sent.", { variant: "success" })
    } catch {
      suToast("Couldn't resend right now. Try again in a moment.")
    }
  }

  const isEmail = channel === "email"
  const heading = isEmail ? "Check your email" : "Check your texts"
  const destination = isEmail
    ? email
      ? maskEmail(email)
      : "your email"
    : phoneE164
      ? maskPhone(phoneE164)
      : "your phone"

  return (
    <div
      className="su-step active"
      style={verifying ? { opacity: 0.6, pointerEvents: "none" } : undefined}
    >
      {toastMsg && (
        <div className="su-toast show" role="alert" aria-live="polite">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span>{toastMsg}</span>
        </div>
      )}
      <button type="button" className="su-back" onClick={onTryAnotherWay}>
        <BackArrow /> Back
      </button>

      <span className="su-ic-badge">
        {isEmail ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
          </svg>
        )}
      </span>

      <h1>{heading}</h1>
      <p className="su-sub">
        We sent a 6-digit code to <b>{destination}</b>.
      </p>

      <div
        key={shakeKey}
        className={cn("su-otp", shakeKey > 0 && "shake")}
      >
        {[0, 1, 2].map((i) => (
          <input
            key={i}
            id={`verify-code-${i}`}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            aria-label={`Digit ${i + 1}`}
            value={digits[i]}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
            className={cn(digits[i] && "filled")}
            autoFocus={i === 0}
          />
        ))}
        <span className="dash">–</span>
        {[3, 4, 5].map((i) => (
          <input
            key={i}
            id={`verify-code-${i}`}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            aria-label={`Digit ${i + 1}`}
            value={digits[i]}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
            className={cn(digits[i] && "filled")}
          />
        ))}
      </div>

      <button
        type="button"
        className="su-resend"
        disabled={resendIn > 0 || verifying}
        onClick={onResend}
      >
        {verifying
          ? "Verifying…"
          : resendIn > 0
            ? `Re-send code (${resendIn}s)`
            : "Re-send code"}
      </button>

      <button type="button" className="su-altway" onClick={onTryAnotherWay} disabled={verifying}>
        Try a different way
      </button>

    </div>
  )
}

function AddressStep({
  onBack,
  onContinue,
}: {
  onBack: () => void
  onContinue: (values: {
    street: string
    apt?: string
    city: string
    state: string
    zip: string
  }) => Promise<void>
}) {
  const [street, setStreet] = useState("")
  const [apt, setApt] = useState("")
  const [zip, setZip] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const valid =
    street.trim().length > 2 &&
    /^\d{5}(-\d{4})?$/.test(zip.trim()) &&
    city.trim().length > 1 &&
    state.length === 2

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid || submitting) return
    setServerError(null)
    setSubmitting(true)
    try {
      await onContinue({
        street: street.trim(),
        apt: apt.trim() || undefined,
        city: city.trim(),
        state,
        zip: zip.trim(),
      })
    } catch (err) {
      setServerError(
        err instanceof ApiError && err.message
          ? err.message
          : "Couldn't save your address. Try again.",
      )
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="su-step active">
      <button type="button" className="su-back" onClick={onBack}>
        <BackArrow /> Back
      </button>

      <h1>Home address</h1>
      <p className="su-sub">This is where we&apos;ll send your card.</p>

      <div className="su-fields">
        <input
          className="su-in"
          placeholder="Street address"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          autoComplete="address-line1"
          autoFocus
        />
        <input
          className="su-in"
          placeholder="Apt / Suite # (optional)"
          value={apt}
          onChange={(e) => setApt(e.target.value)}
          autoComplete="address-line2"
        />
        <input
          className="su-in"
          placeholder="ZIP Code"
          inputMode="numeric"
          maxLength={10}
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/[^0-9-]/g, "").slice(0, 10))}
          autoComplete="postal-code"
        />
        <div className="su-row2">
          <input
            className="su-in"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            autoComplete="address-level2"
          />
          <StateSelect value={state} onChange={setState} />
        </div>
      </div>

      {serverError && (
        <p className="su-err" role="alert">
          {serverError}
        </p>
      )}

      <button className="su-btn" type="submit" disabled={!valid || submitting}>
        {submitting ? <span className="su-spin" aria-label="Saving" /> : "Continue"}
      </button>
    </form>
  )
}

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
] as const

function StateSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className={cn("cs up", open && "open")}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn("cs-btn", !value && "placeholder")}
      >
        <span className="cs-val">{value || "State"}</span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="cs-chev"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul role="listbox" className="cs-pop">
          {US_STATES.map((s) => {
            const selected = s === value
            return (
              <li key={s}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(s)
                    setOpen(false)
                  }}
                  className={cn("cs-opt", selected && "sel")}
                >
                  {s}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function PasswordStep({
  onBack,
  onContinue,
}: {
  onBack: () => void
  onContinue: (password: string) => Promise<void>
}) {
  const [pw, setPw] = useState("")
  const [show, setShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const valid = isPasswordValid(pw)
  const reqs = [
    { ok: pw.length >= 8, label: "8+ characters" },
    { ok: /\d/.test(pw), label: "Number" },
    { ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw), label: "Lower and uppercase letters" },
    { ok: /[^A-Za-z0-9]/.test(pw), label: "Special characters like ! @ # $ %" },
  ]

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid || submitting) return
    setServerError(null)
    setSubmitting(true)
    try {
      await onContinue(pw)
    } catch (err) {
      setServerError(
        err instanceof ApiError && err.message
          ? err.message
          : "Couldn't save your password. Try again.",
      )
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="su-step active">
      <button type="button" className="su-back" onClick={onBack}>
        <BackArrow /> Back
      </button>

      <h1>Create password</h1>

      <div className="su-fields">
        <div className="su-pass-wrap">
          <input
            className="su-in"
            autoFocus
            type={show ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="new-password"
            placeholder="Password"
          />
          <button
            type="button"
            className="su-eye-btn"
            aria-label={show ? "Hide password" : "Show password"}
            onClick={() => setShow((v) => !v)}
          >
            {show ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      <ul className="su-reqs">
        {reqs.map((r) => (
          <li key={r.label} className={cn(r.ok && "ok")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {r.label}
          </li>
        ))}
      </ul>

      {serverError && (
        <p className="su-err" role="alert">
          {serverError}
        </p>
      )}

      <button className="su-btn" type="submit" disabled={!valid || submitting}>
        {submitting ? <span className="su-spin" aria-label="Saving" /> : "Continue"}
      </button>
    </form>
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

/* ---------- More-details step ---------- */

const INCOME_SOURCES = [
  "Employment",
  "Self-employed",
  "Unemployment",
  "Social Security",
  "Pension / Retirement",
  "Investment",
  "Household Income",
  "Disability",
  "Government Assistance",
  "Other",
]

const OCCUPATIONS = [
  "Accountant",
  "Administrative Assistant",
  "Agricultural Professional",
  "Architect",
  "Artist / Musician",
  "Aviation Professional",
  "Business Owner",
  "Construction / Trades",
  "Consultant",
  "Customer Service",
  "Designer",
  "Doctor / Medical Professional",
  "Driver / Delivery",
  "Educator / Teacher",
  "Engineer",
  "Finance Professional",
  "Government Employee",
  "Hospitality / Food Service",
  "Information Technology",
  "Lawyer / Legal Professional",
  "Manager",
  "Marketing / Sales",
  "Military / Veteran",
  "Nurse / Healthcare",
  "Real Estate",
  "Retail Worker",
  "Retired",
  "Scientist / Researcher",
  "Software Developer",
  "Student",
  "Tradesperson",
  "Writer / Journalist",
  "Other",
]

const ANNUAL_INCOMES = [
  "Less than $15,000",
  "$15,000 - $30,000",
  "$30,000 - $50,000",
  "$50,000 - $75,000",
  "$75,000 - $100,000",
  "$100,000 - $150,000",
  "More than $150,000",
  "Prefer not to say",
]

const PAY_METHODS = [
  "Direct deposit",
  "Payment app",
  "Check",
  "Cash",
  "Crypto / Other",
]

const FOUND_US = [
  "Television",
  "Social Media",
  "Google / Search",
  "Friend or family",
  "Podcast",
  "Pandora / Streaming",
  "News article",
  "Reddit",
  "Email",
  "Other",
]

function MoreDetailsStep({
  onBack,
  onContinue,
}: {
  onBack: () => void
  onContinue: (values: {
    income: string
    occupation: string
    annualIncome: string
    payMethod: string
    foundUs: string
  }) => Promise<void>
}) {
  const [income, setIncome] = useState("")
  const [occupation, setOccupation] = useState("")
  const [annual, setAnnual] = useState("")
  const [payMethod, setPayMethod] = useState("")
  const [foundUs, setFoundUs] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const valid =
    income !== "" &&
    occupation !== "" &&
    annual !== "" &&
    payMethod !== "" &&
    foundUs !== ""

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid || submitting) return
    setServerError(null)
    setSubmitting(true)
    try {
      await onContinue({
        income,
        occupation,
        annualIncome: annual,
        payMethod,
        foundUs,
      })
    } catch (err) {
      setServerError(
        err instanceof ApiError && err.message
          ? err.message
          : "Couldn't save your details. Try again.",
      )
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="su-step active">
      <button type="button" className="su-back" onClick={onBack}>
        <BackArrow /> Back
      </button>

      <h1>A few more details</h1>
      <p className="su-sub">
        This helps us set up your account and give you the best experience.
      </p>

      <div className="su-fields">
        <SuSelect label="Income source" options={INCOME_SOURCES} value={income} onChange={setIncome} />
        <SuSelect label="Occupation" options={OCCUPATIONS} value={occupation} onChange={setOccupation} />
        <SuSelect label="Annual income" options={ANNUAL_INCOMES} value={annual} onChange={setAnnual} />
        <SuSelect label="How you get paid" options={PAY_METHODS} value={payMethod} onChange={setPayMethod} />
        <SuSelect label="How you found us" options={FOUND_US} value={foundUs} onChange={setFoundUs} />
      </div>

      {serverError && (
        <p className="su-err" role="alert">
          {serverError}
        </p>
      )}

      <button className="su-btn" type="submit" disabled={!valid || submitting}>
        {submitting ? <span className="su-spin" aria-label="Loading" /> : "Continue"}
      </button>
    </form>
  )
}

/* ---------- Reusable popover dropdown ---------- */

function FormDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly string[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  // Decide whether to drop down or up based on viewport room. Measured
  // on every open and on resize while open, so the placement stays
  // correct even if the user scrolls or rotates the device.
  useEffect(() => {
    if (!open) return
    function place() {
      const trigger = triggerRef.current
      if (!trigger) return
      const PANEL_MAX_H = 256 // matches max-h-64 below
      const GAP = 6
      const rect = trigger.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom - GAP
      const spaceAbove = rect.top - GAP
      // Flip up only if there isn't room below AND there's more room above.
      setOpenUp(spaceBelow < PANEL_MAX_H && spaceAbove > spaceBelow)
    }
    place()
    window.addEventListener("resize", place)
    window.addEventListener("scroll", place, true)
    return () => {
      window.removeEventListener("resize", place)
      window.removeEventListener("scroll", place, true)
    }
  }, [open])

  const labelLifted = open || value.length > 0

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative h-16 w-full rounded-xl border-2 bg-white px-4 pt-5 pb-1 text-left text-base text-ink-dark transition",
          "border-ink-dark/15 hover:border-ink-dark/40 focus:outline-none",
          open && "border-ink-dark",
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute left-4 text-ink-dark/55 transition-all",
            labelLifted
              ? "top-3 text-xs text-ink-dark/60"
              : "top-1/2 -translate-y-1/2 text-base",
          )}
        >
          {label}
        </span>
        <span className="block truncate pr-7 text-base font-semibold text-ink-dark">
          {value}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dark/65 transition",
            open && "rotate-180",
          )}
        >
          <path
            d="M3 6l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.75"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className={cn(
            "absolute left-0 right-0 z-20 max-h-64 overflow-y-auto rounded-xl border border-ink-dark/15 bg-white py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            openUp
              ? "bottom-[calc(100%+6px)] shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.25)]"
              : "top-[calc(100%+6px)] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.25)]",
          )}
        >
          {options.map((opt) => {
            const selected = opt === value
            return (
              <li key={opt}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(opt)
                    setOpen(false)
                  }}
                  className={cn(
                    "block w-full px-4 py-2.5 text-left text-sm font-semibold transition",
                    selected
                      ? "bg-ink-dark/10 text-ink-dark"
                      : "text-ink-dark/85 hover:bg-ink-dark/[0.04]",
                  )}
                >
                  {opt}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ---------- SSN verify step ---------- */

function SsnStep({
  onBack,
  onContinue,
}: {
  onBack: () => void
  onContinue: (ssn: string) => Promise<void>
}) {
  const [ssn, setSsn] = useState("")
  const [confirm, setConfirm] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  // Top-banner toast — mirrors the verification-code step's wrong-code
  // toast (solid red, slides down from the top edge) instead of inline
  // red text below the form.
  function suToast(msg: string) {
    setToastMsg(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 3400)
  }
  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    },
    [],
  )

  /**
   * Passport IDs are uppercase alphanumeric (per ICAO 9303). Filter out
   * anything else as the user types and cap the length at 9 — matches
   * the backend regex `^[A-Z0-9]{6,9}$`.
   */
  function format(raw: string) {
    return raw
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 9)
  }

  const passport = ssn.trim()
  const confirmTrimmed = confirm.trim()
  const valid =
    /^[A-Z0-9]{6,9}$/.test(passport) && passport === confirmTrimmed

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid || submitting) return
    setToastMsg(null)
    setSubmitting(true)
    try {
      await onContinue(passport)
    } catch (err) {
      suToast(
        err instanceof ApiError && err.message
          ? err.message
          : "Couldn't verify. Try again.",
      )
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {toastMsg && (
        <div className="su-toast show" role="alert" aria-live="polite">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span>{toastMsg}</span>
        </div>
      )}
      <button type="button" className="su-back" onClick={onBack}>
        <BackArrow /> Back
      </button>

      <h1>Verify your identity</h1>
      <p className="su-sub">
        Enter your passport number, exactly as it appears on the photo
        page. We&apos;ll use this to confirm it&apos;s really you.
      </p>

      <div className="su-fields">
        <input
          className="su-in"
          placeholder="Passport ID number"
          inputMode="text"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={9}
          value={ssn}
          onChange={(e) => setSsn(format(e.target.value))}
          autoFocus
        />
        <input
          className="su-in"
          placeholder="Confirm passport ID"
          inputMode="text"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={9}
          value={confirm}
          onChange={(e) => setConfirm(format(e.target.value))}
        />
      </div>

      {passport.length >= 6 &&
        confirmTrimmed.length >= 6 &&
        passport !== confirmTrimmed && (
          <p className="su-err">Passport IDs don&apos;t match.</p>
        )}

      <div className="su-secure">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        Your info is secured with 256-bit encryption
      </div>

      <div className="su-auth">
        <h4>Authorization to verify your Passport ID</h4>
        <p>
          I authorize the relevant authority to verify and disclose to
          {BRAND_NAME}, through its service provider, whether
          the name, passport number and date of birth I have submitted
          match their records. My consent is for a one-time validation
          within the next 90 days.
        </p>
        <p>
          By tapping &quot;Continue&quot;, I agree and consent to this
          disclosure, and that my electronic signature has the same legal
          meaning and validity as my handwritten signature.
        </p>
      </div>

      <button className="su-btn" type="submit" disabled={!valid || submitting}>
        {submitting ? <span className="su-spin" aria-label="Loading" /> : "Continue"}
      </button>
    </form>
  )
}

function SsnField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const hasValue = value.length > 0
  const lifted = focused || hasValue
  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={lifted && !hasValue ? placeholder : ""}
        className={cn(
          "peer h-16 w-full rounded-xl border-2 bg-white px-4 pt-5 pb-1 font-mono text-base tracking-wider text-ink-dark transition placeholder:font-mono placeholder:text-ink-dark/35",
          "border-ink-dark/15 hover:border-ink-dark/40 focus:border-ink-dark focus:outline-none",
        )}
      />
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-4 font-sans text-base text-ink-dark/55 transition-all",
          lifted
            ? "top-3 translate-y-0 text-xs text-ink-dark/60"
            : "top-1/2 -translate-y-1/2",
        )}
      >
        {label}
      </label>
    </div>
  )
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 1 1 8 0v3" />
    </svg>
  )
}

/* ---------- Documents upload step ---------- */

const ID_TYPES = [
  "Driver's License",
  "Passport / Passport Card",
  "State ID",
  "Permanent Resident Card",
  "Military ID",
  "Tribal ID",
]

const BILL_TYPES = [
  "Electricity bill",
  "Gas bill",
  "Water bill",
  "Internet / Cable bill",
  "Phone / Mobile bill",
  "Rent / Lease statement",
  "Bank statement",
]

function DocumentsStep({
  onBack,
  onContinue,
}: {
  onBack: () => void
  onContinue: (values: {
    idType: string
    billType: string
    idFrontFile: File
    idBackFile: File
    billFile: File
  }) => Promise<void>
}) {
  const [idType, setIdType] = useState("")
  const [billType, setBillType] = useState("")
  const [idFront, setIdFront] = useState<File | null>(null)
  const [idBack, setIdBack] = useState<File | null>(null)
  const [bill, setBill] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const valid =
    idFront != null &&
    idBack != null &&
    bill != null &&
    idType !== "" &&
    billType !== ""

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid || submitting || !idFront || !idBack || !bill) return
    setServerError(null)
    setSubmitting(true)
    try {
      await onContinue({
        idType,
        billType,
        idFrontFile: idFront,
        idBackFile: idBack,
        billFile: bill,
      })
    } catch (err) {
      setServerError(
        err instanceof ApiError && err.message
          ? err.message
          : "Couldn't upload your documents. Try again.",
      )
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="su-step active">
      <button type="button" className="su-back" onClick={onBack}>
        <BackArrow /> Back
      </button>

      <h1>Confirm your details</h1>
      <p className="su-sub">
        Upload your ID (front + back) and a recent bill receipt.
      </p>

      <div className="su-uploads">
        <UploadTile
          id="upload-id-front"
          label="ID, front"
          accept="image/*,application/pdf"
          file={idFront}
          onFile={setIdFront}
          docTypeLabel="Document type"
          docTypeOptions={ID_TYPES}
          docType={idType}
          onDocType={setIdType}
        />
        <UploadTile
          id="upload-id-back"
          label="ID, back"
          accept="image/*,application/pdf"
          file={idBack}
          onFile={setIdBack}
          docTypeLabel="Document type"
          docTypeOptions={ID_TYPES}
          docType={idType}
          onDocType={setIdType}
        />
        <UploadTile
          id="upload-bill"
          label="Bill receipt"
          accept="image/*,application/pdf"
          file={bill}
          onFile={setBill}
          docTypeLabel="Bill type"
          docTypeOptions={BILL_TYPES}
          docType={billType}
          onDocType={setBillType}
        />
      </div>

      <div className="su-secure">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        Encrypted. Never shared without your consent.
      </div>

      {serverError && (
        <p className="su-err" role="alert">
          {serverError}
        </p>
      )}

      <button className="su-btn" type="submit" disabled={!valid || submitting}>
        {submitting ? <span className="su-spin" aria-label="Loading" /> : "Continue"}
      </button>
    </form>
  )
}

function UploadTile({
  id,
  label,
  accept,
  file,
  onFile,
  docType,
  onDocType,
  docTypeLabel,
  docTypeOptions,
}: {
  id: string
  label: string
  accept: string
  file: File | null
  onFile: (f: File | null) => void
  docType: string
  onDocType: (v: string) => void
  docTypeLabel: string
  docTypeOptions: readonly string[]
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [hover, setHover] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  function startFlow() {
    if (docType) {
      inputRef.current?.click()
    } else {
      setPickerOpen(true)
    }
  }

  function pickType(t: string) {
    onDocType(t)
    setPickerOpen(false)
    // Defer click so the sheet has fully closed before the OS file dialog opens
    setTimeout(() => inputRef.current?.click(), 50)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setHover(false)
    if (!docType) {
      // Force user to pick a type first
      setPickerOpen(true)
      return
    }
    const f = e.dataTransfer.files?.[0]
    if (f) onFile(f)
  }

  function clear() {
    onFile(null)
    onDocType("")
  }

  const isImage = file?.type.startsWith("image/")
  const previewUrl = file && isImage ? URL.createObjectURL(file) : null
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  return (
    <>
      {file ? (
        <div className="su-up done">
          <span className="u-ic">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" />
            ) : (
              <FileIcon />
            )}
          </span>
          <span className="u-body">
            <span className="u-t">{docType || label}</span>
            <span className="u-s">
              {file.name} · {(file.size / 1024).toFixed(0)} KB · ready
            </span>
          </span>
          <span className="u-act">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              aria-label="Replace document"
            >
              <ReplaceIcon />
            </button>
            <button type="button" aria-label="Remove" onClick={clear}>
              <CloseSmall />
            </button>
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={startFlow}
          onDragOver={(e) => {
            e.preventDefault()
            setHover(true)
          }}
          onDragLeave={() => setHover(false)}
          onDrop={onDrop}
          className={cn("su-up", hover && "done")}
        >
          <span className="u-ic">
            <UploadIcon />
          </span>
          <span className="u-body">
            <span className="u-t">{label}</span>
            <span className="u-s">Tap to choose document type</span>
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />

      <DocTypePicker
        open={pickerOpen}
        title={docTypeLabel}
        options={docTypeOptions}
        value={docType}
        onClose={() => setPickerOpen(false)}
        onPick={pickType}
      />
    </>
  )
}

function DocTypePicker({
  open,
  title,
  options,
  value,
  onClose,
  onPick,
}: {
  open: boolean
  title: string
  options: readonly string[]
  value: string
  onClose: () => void
  onPick: (v: string) => void
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  return (
    <>
      <div
        className={cn("su-sheet-scrim", open && "show")}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn("su-sheet", open && "open")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="su-sheet-handle" />
        <div className="su-sheet-head">
          <div>
            <h3>{title}</h3>
            <p>Pick the kind of document you&apos;re about to upload.</p>
          </div>
          <button
            type="button"
            className="su-sheet-close"
            aria-label="Close"
            onClick={onClose}
          >
            <CloseSmall />
          </button>
        </div>
        <div className="su-sheet-list">
          {options.map((opt) => {
            const selected = opt === value
            return (
              <button
                key={opt}
                type="button"
                className="su-dt"
                onClick={() => onPick(opt)}
              >
                <span>{opt}</span>
                {selected ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#2F855A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function FileIcon() {
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
      className="text-ink-dark/70"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function CloseSmall() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  )
}

function ReplaceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
      <polyline points="17 8 21 8 21 4" />
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
      <polyline points="7 16 3 16 3 20" />
    </svg>
  )
}

function DisclosuresModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  // Lock body scroll while modal is open and close on Escape
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  return (
    <>
      <div
        className={cn("legal-scrim", open && "show")}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn("legal-modal", open && "open")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="legalTitle"
      >
        <div className="legal-head">
          <div>
            <div className="legal-kicker">{BRAND_NAME}</div>
            <h3 id="legalTitle">Privacy Policy</h3>
          </div>
          <button className="legal-close" onClick={onClose} aria-label="Close">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="legal-body">
          <p>
            This statement applies to {BRAND_NAME}&apos;s website and
            online banking services, and describes how we handle your personal
            information, that is, information about you which is personally
            identifiable, such as your name, address, email address and phone
            number. Other websites that may be linked from ours are not covered
            by this policy.
          </p>
          <p>
            When you simply browse our site, we do not automatically capture or
            store personal information about you, other than logging your IP
            address (the protocol that allows data to be transmitted across the
            internet) and basic session information such as the duration of your
            visit and the type of browser used. This information is used purely
            for system administration and to produce statistical reports that
            help us evaluate and improve how our site is used.
          </p>
          <p>
            When you apply for an account or a product, we collect the personal
            and financial details you provide so that we can verify your
            identity, assess your application, open and operate your account, and
            meet our legal and regulatory obligations, including those relating
            to the prevention of financial crime.
          </p>
          <p>
            We use cookies and similar technologies to keep you signed in
            securely, remember your preferences and protect your account from
            fraud. You can manage non‑essential cookies at any time through your
            browser settings.
          </p>
          <p>
            If you ask us to send you information, respond to a request, or
            subscribe to updates, the personal information you provide will only
            be used for that specific purpose. We do not sell your personal
            information, and we share it only with trusted service providers and
            authorities where permitted or required by law.
          </p>
          <p>
            You have the right to access the personal information we hold about
            you, to ask us to correct it, and to object to certain uses. To
            exercise these rights, or for any privacy question, contact our Data
            Protection Office at{" "}
            <a href="mailto:privacy@cbbank.example">privacy@cbbank.example</a>.
          </p>
          <p className="legal-updated">Last updated 2 June 2026.</p>
        </div>
        <div className="legal-foot">
          <button className="su-btn" onClick={onClose} style={{ margin: 0 }}>
            I understand
          </button>
        </div>
      </div>
    </>
  )
}

function DoneStep({
  firstName,
  email,
  onContinue,
}: {
  firstName: string
  email: string
  onContinue: () => void
}) {
  return (
    <div className="su-step active">
      <div className="su-success">
        <div className="su-check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="m8 12 3 3 5-6" />
          </svg>
        </div>
        <h1>Application submitted</h1>
        <p>
          Thanks, <b>{firstName || "there"}</b>your application is in. Our
          team is reviewing your details and verifying your documents.
        </p>
        <div className="su-mailbox">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
          <span>
            Keep an eye on <b>{email || "your inbox"}</b>we&apos;ll send an{" "}
            <b>activation email</b> the moment your account is approved. Follow
            the link in it to set up online banking.
          </span>
        </div>
        <button
          type="button"
          className="su-btn gold"
          onClick={onContinue}
          style={{ marginTop: 26 }}
        >
          Back to sign in
        </button>
      </div>
    </div>
  )
}

function EnvelopeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="40"
      height="40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <polyline points="3 7 12 13 21 7" />
    </svg>
  )
}

function RowIconMail() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <polyline points="3 7 12 13 21 7" />
    </svg>
  )
}

function RowIconCard() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="7" y1="15" x2="11" y2="15" />
    </svg>
  )
}

function RowIconSpark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="13 3 5 14 11 14 10 21 18 10 12 10 13 3" />
    </svg>
  )
}

function SmallEnvelopeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-ink-dark/65"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <polyline points="3 7 12 13 21 7" />
    </svg>
  )
}

function BulletRow({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <li className="flex items-start gap-3 px-3.5 py-3">
      <span className="mt-0.5 flex-shrink-0 text-brand-deep">{icon}</span>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold leading-tight text-ink-dark">
          {title}
        </div>
        <div className="mt-0.5 text-[12px] leading-snug text-ink-dark/65">
          {body}
        </div>
      </div>
    </li>
  )
}
