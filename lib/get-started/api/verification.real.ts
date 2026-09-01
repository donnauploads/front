/**
 * Real adapter for signup + signup-verification endpoints.
 *
 *   POST /auth/signup/begin                          → beginSignup
 *   POST /auth/signup/:id/verification/send          → sendVerification
 *   POST /auth/signup/:id/verification/verify        → verifyCode
 *   POST /auth/signup/:id/verification/resend        → resendVerification
 *
 * Backend lives at apps/api/src/modules/auth/signup/{signup,verification}.
 * All four endpoints are @Public — no Bearer token needed.
 */

import { apiFetch } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import type {
  BeginSignupArgs,
  BeginSignupResult,
  CompleteSignupArgs,
  CompleteSignupResult,
  MarkDocsDoneArgs,
  ResendVerificationArgs,
  ResendVerificationResult,
  SendVerificationArgs,
  SendVerificationResult,
  SignupStepOk,
  SubmitAddressArgs,
  SubmitCardArgs,
  SubmitDetailsArgs,
  SubmitDobArgs,
  SubmitPasswordArgs,
  SubmitSsnArgs,
  UploadSignupDocumentArgs,
  UploadSignupDocumentResult,
  VerifyCodeArgs,
  VerifyCodeResult,
} from "../mocks/verification.mock"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? ""
/** Uploads go through the same-origin streaming Route Handler at
 *  app/api/v1/auth/signup/[id]/documents/route.ts — that avoids the
 *  Next.js dev rewrite's body-buffer 413 AND the cross-origin preflight
 *  that causes DevTools "Provisional headers". We reuse API_BASE so the
 *  path matches and the file-route wins resolution over the rewrite. */
const UPLOAD_BASE = process.env.NEXT_PUBLIC_API_BASE ?? ""

/** Wraps the validation envelope so callers can branch on a stable code. */
function rethrowVerification(err: unknown): never {
  if (err instanceof ApiError) {
    // Backend uses NotFoundException / BadRequestException; surface the
    // status verbatim so the UI can pick a friendly message. The "code"
    // field is synthesised by client.ts as HTTP_<status>.
    throw err
  }
  throw err as Error
}

export async function beginSignup(
  args: BeginSignupArgs,
): Promise<BeginSignupResult> {
  try {
    const res = await apiFetch<{ signupId: string; stage: string }>(
      "/auth/signup/begin",
      {
        method: "POST",
        skipAuth: true,
        body: {
          firstName: args.firstName,
          lastName: args.lastName,
          email: args.email,
          phoneE164: args.phoneE164,
          referralCode: args.referralCode,
        },
      },
    )
    return { signupId: res.signupId, stage: res.stage }
  } catch (err) {
    rethrowVerification(err)
  }
}

export async function sendVerification(
  args: SendVerificationArgs,
): Promise<SendVerificationResult> {
  try {
    const res = await apiFetch<{
      verificationId: string
      channel: "email" | "sms"
      destinationMasked: string
      retryAfterMs: number
    }>(`/auth/signup/${encodeURIComponent(args.signupId)}/verification/send`, {
      method: "POST",
      skipAuth: true,
      body: { channel: args.channel },
    })
    return {
      verificationId: res.verificationId,
      retryAfterMs: res.retryAfterMs,
    }
  } catch (err) {
    rethrowVerification(err)
  }
}

export async function verifyCode(
  args: VerifyCodeArgs,
): Promise<VerifyCodeResult> {
  try {
    await apiFetch<{ ok: true; verifiedChannel: "email" | "sms" }>(
      `/auth/signup/${encodeURIComponent(args.signupId)}/verification/verify`,
      {
        method: "POST",
        skipAuth: true,
        body: { verificationId: args.verificationId, code: args.code },
      },
    )
    return { ok: true }
  } catch (err) {
    rethrowVerification(err)
  }
}

export async function resendVerification(
  args: ResendVerificationArgs,
): Promise<ResendVerificationResult> {
  try {
    const res = await apiFetch<{ retryAfterMs: number }>(
      `/auth/signup/${encodeURIComponent(args.signupId)}/verification/resend`,
      {
        method: "POST",
        skipAuth: true,
        body: { verificationId: args.verificationId },
      },
    )
    return { retryAfterMs: res.retryAfterMs }
  } catch (err) {
    rethrowVerification(err)
  }
}

/* ---------- Signup steps ---------- */

function stepPath(signupId: string, suffix: string) {
  return `/auth/signup/${encodeURIComponent(signupId)}/${suffix}`
}

export async function submitDob(args: SubmitDobArgs): Promise<SignupStepOk> {
  await apiFetch<SignupStepOk>(stepPath(args.signupId, "dob"), {
    method: "POST",
    skipAuth: true,
    body: { dob: args.dob },
  })
  return { ok: true }
}

export async function submitCard(args: SubmitCardArgs): Promise<SignupStepOk> {
  await apiFetch<SignupStepOk>(stepPath(args.signupId, "card"), {
    method: "POST",
    skipAuth: true,
    body: { cardChoice: args.cardChoice },
  })
  return { ok: true }
}

export async function submitAddress(
  args: SubmitAddressArgs,
): Promise<SignupStepOk> {
  await apiFetch<SignupStepOk>(stepPath(args.signupId, "address"), {
    method: "POST",
    skipAuth: true,
    body: {
      street: args.street,
      apt: args.apt,
      city: args.city,
      state: args.state,
      zip: args.zip,
    },
  })
  return { ok: true }
}

export async function submitPassword(
  args: SubmitPasswordArgs,
): Promise<SignupStepOk> {
  await apiFetch<SignupStepOk>(stepPath(args.signupId, "password"), {
    method: "POST",
    skipAuth: true,
    body: { password: args.password },
  })
  return { ok: true }
}

export async function submitDetails(
  args: SubmitDetailsArgs,
): Promise<SignupStepOk> {
  await apiFetch<SignupStepOk>(stepPath(args.signupId, "details"), {
    method: "POST",
    skipAuth: true,
    body: {
      income: args.income,
      occupation: args.occupation,
      annualIncome: args.annualIncome,
      payMethod: args.payMethod,
      foundUs: args.foundUs,
      marketingConsent: args.marketingConsent,
    },
  })
  return { ok: true }
}

export async function submitSsn(args: SubmitSsnArgs): Promise<SignupStepOk> {
  await apiFetch<SignupStepOk>(stepPath(args.signupId, "ssn"), {
    method: "POST",
    skipAuth: true,
    body: { ssn: args.ssn },
  })
  return { ok: true }
}

/**
 * Multipart upload. apiFetch can't synthesize FormData itself, so we hand a
 * pre-built FormData. The wrapper recognises FormData and skips JSON
 * stringify + Content-Type — the browser sets the boundary header.
 */
export async function uploadSignupDocument(
  args: UploadSignupDocumentArgs,
): Promise<UploadSignupDocumentResult> {
  const fd = new FormData()
  fd.append("type", args.type)
  if (args.subtype) fd.append("subtype", args.subtype)
  fd.append("file", args.file)
  // apiFetch handles FormData but does not currently support `skipAuth` +
  // FormData together cleanly. Use raw fetch for parity with the other
  // public signup endpoints. Hits the backend directly (UPLOAD_BASE) so
  // the Next.js dev rewrite doesn't 413 on large image bodies.
  const res = await fetch(
    `${UPLOAD_BASE}${stepPath(args.signupId, "documents")}`,
    {
      method: "POST",
      credentials: "include",
      headers: { "ngrok-skip-browser-warning": "true" },
      body: fd,
    },
  )
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    let parsed: { message?: string; code?: string } | null = null
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      parsed = null
    }
    throw new ApiError(
      parsed?.code ?? `HTTP_${res.status}`,
      parsed?.message ?? (text || res.statusText),
      undefined,
      res.status,
    )
  }
  return (await res.json()) as UploadSignupDocumentResult
}

export async function markDocumentsDone(
  args: MarkDocsDoneArgs,
): Promise<SignupStepOk> {
  await apiFetch<SignupStepOk>(stepPath(args.signupId, "documents/done"), {
    method: "POST",
    skipAuth: true,
  })
  return { ok: true }
}

export async function completeSignup(
  args: CompleteSignupArgs,
): Promise<CompleteSignupResult> {
  const res = await apiFetch<{ ok: true; userId: string }>(
    stepPath(args.signupId, "complete"),
    { method: "POST", skipAuth: true },
  )
  return { ok: true, userId: res.userId }
}
