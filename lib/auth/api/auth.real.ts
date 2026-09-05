import { apiFetch } from "@/lib/api/client"
import { clearAccessToken, setAccessToken } from "@/lib/api/token-store"
import { markAppLocked, markAppUnlocked } from "@/lib/security/app-lock"
import { markSelfReauth } from "@/lib/auth/reauth-guard"

/**
 * Adapter mirrors backend at apps/api/src/modules/auth/auth.controller.ts.
 * Login + refresh return tokens in BOTH the response body and httpOnly
 * cookies. We keep the access token in memory (token-store) and rely on
 * the cookie for refresh.
 *
 * Backend cookie maxAge for access is 15 min — we mirror that as the local
 * TTL since the response payload does not include `expiresIn`.
 */
const ACCESS_TTL_SECONDS = 15 * 60

export type Role = "customer" | "admin" | "superadmin"

export type SessionUser = {
  id: string
  email: string
  phoneE164: string | null
  novaTag: string | null
  firstName: string
  lastName: string
  dob: string | null
  avatarUrl: string | null
  bio: string | null
  role: Role
  status: string
  /** Set by an admin-created account (or a forced reset). While true the
   *  customer app shows FirstLoginSecurityGate, forcing a password change
   *  + transaction PIN before anything else. Backend clears it once both
   *  are done. */
  securitySetupRequired?: boolean
}

export type LoginRequest = {
  email: string
  password: string
  timezone?: string
  canvasHash?: string
}

export type LoginResponse =
  | {
      stage: "session"
      accessToken: string
      refreshToken: string
      sessionId: string
    }
  | {
      stage: "mfa"
      mfaToken: string
      channel: "sms" | "email"
      phoneHint: string | null
      emailHint: string | null
    }

export type MfaVerifyRequest = {
  mfaToken: string
  code: string
}

export type SessionIssuedResponse = {
  stage: "session"
  accessToken: string
  refreshToken: string
  sessionId: string
}

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const res = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body,
    skipAuth: true,
    headers: { "X-Timezone": body.timezone ?? "" },
  })
  if (res.stage === "session") {
    setAccessToken(res.accessToken, ACCESS_TTL_SECONDS)
    markAppUnlocked() // fresh sign-in counts as an unlock for this browser
  }
  return res
}

export async function verifyMfa(
  body: MfaVerifyRequest,
): Promise<SessionIssuedResponse> {
  const res = await apiFetch<SessionIssuedResponse>("/auth/mfa/verify", {
    method: "POST",
    body,
    skipAuth: true,
  })
  setAccessToken(res.accessToken, ACCESS_TTL_SECONDS)
  markAppUnlocked()
  return res
}

export async function resendMfa(mfaToken: string): Promise<{ mfaToken: string }> {
  return apiFetch<{ mfaToken: string }>("/auth/mfa/resend", {
    method: "POST",
    body: { mfaToken },
    skipAuth: true,
  })
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<void>("/auth/logout", { method: "POST" })
  } finally {
    clearAccessToken()
    markAppLocked() // drop the unlock marker so a later session starts locked
  }
}

export async function fetchMe(): Promise<SessionUser> {
  return apiFetch<SessionUser>("/me")
}

// ─── Passwordless biometric sign-in ────────────────────────────────────────

type AssertOptions = {
  challenge: string
  rpId?: string
  timeout?: number
  userVerification?: UserVerificationRequirement
  allowCredentials?: { id: string; type: "public-key"; transports?: AuthenticatorTransport[] }[]
}

type BeginAuthResponse = {
  handle: string
  options: AssertOptions
}

/**
 * Drives the full passwordless biometric sign-in:
 *   1. GET a challenge from the backend
 *   2. Ask the OS to produce an assertion via navigator.credentials.get
 *   3. POST the assertion back; backend issues a session
 * Throws on cancel / no creds / network. Caller stores the access token.
 */
export async function signInWithBiometric(
  timezone?: string,
  email?: string,
): Promise<SessionIssuedResponse> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    throw new Error("This browser doesn't support biometric sign-in.")
  }

  // We're about to issue a new session, which revokes the current one as
  // `newer_login`. Open the ignore window BEFORE the ceremony so the incoming
  // `session.revoked` push (which can beat our token swap) doesn't log us out.
  markSelfReauth()

  // Passing email scopes allowCredentials to that user's enrollments —
  // platforms with a single match (typical) skip the passkey picker and
  // fire biometric immediately. Backend falls back to discoverable mode
  // when the email is missing or has no enrollments.
  const { handle, options } = await apiFetch<BeginAuthResponse>(
    "/auth/biometric/begin",
    {
      method: "POST",
      body: email ? { email } : undefined,
      skipAuth: true,
    },
  )

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: b64urlToBuf(options.challenge),
    rpId: options.rpId,
    timeout: options.timeout,
    userVerification: options.userVerification,
    allowCredentials: options.allowCredentials?.map((c) => ({
      id: b64urlToBuf(c.id),
      type: c.type,
      transports: c.transports,
    })),
  }
  const cred = (await navigator.credentials.get({ publicKey })) as
    | PublicKeyCredential
    | null
  if (!cred) throw new Error("Biometric sign-in was cancelled.")
  const assertion = cred.response as AuthenticatorAssertionResponse

  const payload = {
    handle,
    response: {
      id: cred.id,
      rawId: bufToB64url(cred.rawId),
      type: cred.type,
      clientExtensionResults: cred.getClientExtensionResults(),
      response: {
        clientDataJSON: bufToB64url(assertion.clientDataJSON),
        authenticatorData: bufToB64url(assertion.authenticatorData),
        signature: bufToB64url(assertion.signature),
        userHandle: assertion.userHandle ? bufToB64url(assertion.userHandle) : null,
      },
    },
  }

  const res = await apiFetch<SessionIssuedResponse>("/auth/biometric/finish", {
    method: "POST",
    body: payload,
    skipAuth: true,
    headers: { "X-Timezone": timezone ?? "" },
  })
  setAccessToken(res.accessToken, ACCESS_TTL_SECONDS)
  markAppUnlocked()
  return res
}

function b64urlToBuf(s: string): ArrayBuffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4))
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/")
  const bin = atob(b64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

function bufToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ""
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/* ──────────────────────────────────────────────────────────────────
   Password recovery (OTP flow)
   1. recoverPasswordRequest({ email })           → 200 (always)
   2. recoverPasswordVerify({ email, code })      → { token } | 401
   3. recoverPasswordReset({ token, newPassword }) → 204
   ────────────────────────────────────────────────────────────────── */

export async function recoverPasswordRequest(body: {
  email: string
}): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>("/auth/recover/password", {
    method: "POST",
    body,
    skipAuth: true,
  })
}

export async function recoverPasswordVerify(body: {
  email: string
  code: string
}): Promise<{ token: string }> {
  return apiFetch<{ token: string }>("/auth/recover/password/verify", {
    method: "POST",
    body,
    skipAuth: true,
  })
}

export async function recoverPasswordReset(body: {
  token: string
  newPassword: string
}): Promise<void> {
  await apiFetch<void>("/auth/recover/password/reset", {
    method: "POST",
    body,
    skipAuth: true,
  })
}
