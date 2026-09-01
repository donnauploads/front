/**
 * Inline biometric enrollment for the AuthorizeTransfer modal.
 *
 * Mirrors the dance in `app/(app)/profile/security/page.tsx` but trimmed
 * to the path needed from the pay/transfer authorization sheet: try a
 * silent reactivate first (if the user previously had a credential here
 * and toggled it off), otherwise run a fresh WebAuthn registration.
 */

import { apiFetch } from "@/lib/api/client"
import {
  biometricReactivate,
  biometricRegisterBegin,
  biometricRegisterFinish,
} from "@/lib/profile/api/security.real"
import { freshWebauthnSignal } from "@/lib/security/webauthn-abort"

type RegOptions = {
  challenge: string
  rp: PublicKeyCredentialRpEntity
  user: { id: string; name: string; displayName: string }
  pubKeyCredParams: PublicKeyCredentialParameters[]
  timeout?: number
  attestation?: AttestationConveyancePreference
  authenticatorSelection?: AuthenticatorSelectionCriteria
  excludeCredentials?: {
    id: string
    type: "public-key"
    transports?: AuthenticatorTransport[]
  }[]
}

/**
 * Pull the current session id from /auth/sessions. Falls back to a fresh
 * UUID when the call fails — the backend just needs a stable deviceId per
 * user, it doesn't have to match an existing session row.
 */
async function pickDeviceId(): Promise<string> {
  try {
    const sessions = await apiFetch<
      { id: string; current: boolean; device: { id: string } }[]
    >("/auth/sessions")
    const current = sessions.find((s) => s.current)
    if (current) return current.device.id
    if (sessions[0]) return sessions[0].device.id
  } catch {
    /* fall through */
  }
  return crypto.randomUUID()
}

/**
 * Enroll a biometric credential for the current user, then return.
 * Throws on unsupported browser, missing platform authenticator, user
 * cancel, or backend rejection — caller surfaces an inline message.
 */
export async function enrollBiometricInline(): Promise<void> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    throw new Error("This browser doesn't support biometric sign-in.")
  }
  try {
    const available =
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
      "function"
        ? await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        : true
    if (!available) {
      throw new Error(
        "This device doesn't have Face ID / Touch ID / fingerprint set up.",
      )
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("This device")) throw err
    throw new Error(
      "This browser can't access biometric sign-in. Try Safari or Chrome.",
    )
  }

  const deviceId = await pickDeviceId()

  // Silent path: server already has a soft-disabled enrollment for this
  // device — flip it back on and we're done, no OS prompt needed.
  try {
    const { reactivated } = await biometricReactivate(deviceId)
    if (reactivated) return
  } catch {
    /* fall through to fresh registration */
  }

  const options = (await biometricRegisterBegin()) as RegOptions
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: b64urlToBuf(options.challenge),
    rp: options.rp,
    user: {
      id: b64urlToBuf(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: options.pubKeyCredParams,
    timeout: options.timeout,
    attestation: options.attestation,
    authenticatorSelection: options.authenticatorSelection,
    excludeCredentials: options.excludeCredentials?.map((c) => ({
      id: b64urlToBuf(c.id),
      type: c.type,
      transports: c.transports,
    })),
  }
  const cred = (await navigator.credentials.create({
    publicKey,
    signal: freshWebauthnSignal(),
  })) as PublicKeyCredential | null
  if (!cred) throw new Error("Biometric setup was cancelled.")
  const attestation = cred.response as AuthenticatorAttestationResponse
  const transports =
    typeof attestation.getTransports === "function"
      ? attestation.getTransports()
      : []
  const payload = {
    id: cred.id,
    rawId: bufToB64url(cred.rawId),
    type: cred.type,
    clientExtensionResults: cred.getClientExtensionResults(),
    response: {
      clientDataJSON: bufToB64url(attestation.clientDataJSON),
      attestationObject: bufToB64url(attestation.attestationObject),
      transports,
    },
  }
  const result = await biometricRegisterFinish(deviceId, payload)
  if (!result.verified) throw new Error("Biometric setup failed.")
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
