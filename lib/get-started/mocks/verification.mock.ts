/**
 * Mock layer for the channel-agnostic verification step in `/get-started`.
 *
 * The user picks a channel (email or SMS) on the Choose-Channel step; this
 * single endpoint set then drives both. When the real backend ships
 * (planning doc 2.1.11–2.1.13, restructured for one channel-agnostic path),
 * swap the implementations here while keeping the function signatures
 * stable.
 *
 *   POST /auth/signup/:signupId/verification/send    → sendVerification()
 *   POST /auth/signup/:signupId/verification/verify  → verifyCode()
 *   POST /auth/signup/:signupId/verification/resend  → resendVerification()
 *
 * Toggle the mock off later with NEXT_PUBLIC_USE_MOCKS=false.
 */

import type { VerificationChannel } from "@/lib/store"

const USE_MOCKS =
  (process.env.NEXT_PUBLIC_USE_MOCKS ?? "true").toLowerCase() !== "false"

const RESEND_COOLDOWN_MS = 60_000

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return "mock-" + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export type BeginSignupArgs = {
  firstName: string
  lastName: string
  email: string
  phoneE164: string
  referralCode?: string
}

export type BeginSignupResult = {
  signupId: string
  stage: string
}

export async function beginSignup(
  args: BeginSignupArgs,
): Promise<BeginSignupResult> {
  if (!USE_MOCKS) {
    throw new Error("beginSignup: real backend not implemented yet.")
  }
  if (!args.firstName || !args.lastName) throw new Error("MISSING_NAME")
  if (!args.email) throw new Error("MISSING_EMAIL")
  if (!/^\+1\d{10}$/.test(args.phoneE164)) throw new Error("INVALID_PHONE")
  await wait(350)
  return { signupId: `mock-signup-${uuid()}`, stage: "started" }
}

export type SendVerificationArgs = {
  signupId: string
  channel: VerificationChannel
}

export type SendVerificationResult = {
  verificationId: string
  retryAfterMs: number
}

export type VerifyCodeArgs = {
  signupId: string
  verificationId: string
  code: string
}

export type VerifyCodeResult = { ok: true }

export type ResendVerificationArgs = {
  signupId: string
  verificationId: string
}

export type ResendVerificationResult = { retryAfterMs: number }

export async function sendVerification(
  args: SendVerificationArgs,
): Promise<SendVerificationResult> {
  if (!USE_MOCKS) {
    throw new Error(
      "sendVerification: real backend not implemented yet. " +
        "Set NEXT_PUBLIC_USE_MOCKS=true or ship Stage 2 auth/signup.",
    )
  }
  if (!args.signupId) throw new Error("MISSING_SIGNUP_ID")
  if (args.channel !== "email" && args.channel !== "sms")
    throw new Error("INVALID_CHANNEL")
  await wait(600)
  return {
    verificationId: `mock-vrf-${args.channel}-${uuid()}`,
    retryAfterMs: RESEND_COOLDOWN_MS,
  }
}

export async function verifyCode(
  args: VerifyCodeArgs,
): Promise<VerifyCodeResult> {
  if (!USE_MOCKS) {
    throw new Error("verifyCode: real backend not implemented yet.")
  }
  if (!args.verificationId) throw new Error("MISSING_VERIFICATION_ID")
  await wait(400)
  if (!/^\d{6}$/.test(args.code)) throw new Error("INVALID_CODE")
  return { ok: true }
}

export async function resendVerification(
  args: ResendVerificationArgs,
): Promise<ResendVerificationResult> {
  if (!USE_MOCKS) {
    throw new Error("resendVerification: real backend not implemented yet.")
  }
  if (!args.verificationId) throw new Error("MISSING_VERIFICATION_ID")
  await wait(400)
  return { retryAfterMs: RESEND_COOLDOWN_MS }
}

/* ---------- Signup steps (mocked stubs) ---------- */

export type SignupStepOk = { ok: true }

export type SubmitDobArgs = { signupId: string; dob: string }
export async function submitDob(_: SubmitDobArgs): Promise<SignupStepOk> {
  await wait(250)
  return { ok: true }
}

export type CardChoice = "checking" | "savings" | "credit"
export type SubmitCardArgs = { signupId: string; cardChoice: CardChoice }
export async function submitCard(_: SubmitCardArgs): Promise<SignupStepOk> {
  await wait(250)
  return { ok: true }
}

export type SubmitAddressArgs = {
  signupId: string
  street: string
  apt?: string
  city: string
  state: string
  zip: string
}
export async function submitAddress(
  _: SubmitAddressArgs,
): Promise<SignupStepOk> {
  await wait(350)
  return { ok: true }
}

export type SubmitPasswordArgs = { signupId: string; password: string }
export async function submitPassword(
  _: SubmitPasswordArgs,
): Promise<SignupStepOk> {
  await wait(350)
  return { ok: true }
}

export type SubmitDetailsArgs = {
  signupId: string
  income?: string
  occupation?: string
  annualIncome?: string
  payMethod?: string
  foundUs?: string
  marketingConsent?: boolean
}
export async function submitDetails(
  _: SubmitDetailsArgs,
): Promise<SignupStepOk> {
  await wait(400)
  return { ok: true }
}

export type SubmitSsnArgs = { signupId: string; ssn: string }
export async function submitSsn(_: SubmitSsnArgs): Promise<SignupStepOk> {
  await wait(500)
  return { ok: true }
}

export type DocumentType =
  | "id_front"
  | "id_back"
  | "selfie"
  | "utility_bill"
export type DocumentSubtype =
  | "drivers_license"
  | "passport"
  | "state_id"
  | "ssn_card"
  | "other"

export type UploadSignupDocumentArgs = {
  signupId: string
  type: DocumentType
  subtype?: DocumentSubtype
  file: File | Blob
}

export type UploadSignupDocumentResult = {
  id: string
  type: DocumentType
  status: string
}

export async function uploadSignupDocument(
  args: UploadSignupDocumentArgs,
): Promise<UploadSignupDocumentResult> {
  await wait(600)
  return {
    id: `mock-doc-${args.type}-${Math.random().toString(36).slice(2, 8)}`,
    type: args.type,
    status: "uploaded",
  }
}

export type MarkDocsDoneArgs = { signupId: string }
export async function markDocumentsDone(
  _: MarkDocsDoneArgs,
): Promise<SignupStepOk> {
  await wait(250)
  return { ok: true }
}

export type CompleteSignupArgs = { signupId: string }
export type CompleteSignupResult = { ok: true; userId: string }
export async function completeSignup(
  _: CompleteSignupArgs,
): Promise<CompleteSignupResult> {
  await wait(700)
  return { ok: true, userId: `mock-user-${Math.random().toString(36).slice(2, 8)}` }
}

/* ---------- Display helpers ---------- */

/** `alex.rivera@cbb.gov.bh` → `a***@cbb.gov.bh` */
export function maskEmail(email: string): string {
  const at = email.indexOf("@")
  if (at <= 0) return email
  const local = email.slice(0, at)
  const domain = email.slice(at)
  return `${local.charAt(0)}***${domain}`
}

/**
 * `+14155550117` → `(•••) •••-0117`. Keeps last 4 digits visible.
 * Accepts E.164 or already-formatted strings — strips non-digits first.
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(-10)
  if (digits.length < 4) return "(•••) •••-••••"
  const last4 = digits.slice(-4)
  return `(•••) •••-${last4}`
}

/** Format a 10-digit US phone as (XXX) XXX-XXXX while typing. */
export function formatUsPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 10)
  const a = d.slice(0, 3)
  const b = d.slice(3, 6)
  const c = d.slice(6, 10)
  if (d.length === 0) return ""
  if (d.length < 4) return `(${a}`
  if (d.length < 7) return `(${a}) ${b}`
  return `(${a}) ${b}-${c}`
}

/** Convert formatted/raw US phone → `+1XXXXXXXXXX`. Returns null if not 10 digits. */
export function toE164US(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")
  if (digits.length !== 10) return null
  return `+1${digits}`
}
