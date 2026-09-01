/**
 * Drive a WebAuthn assertion against the backend's
 *   POST /me/security/elevate/biometric/{begin,verify}
 * endpoints to obtain a `transfer:authorize`-scoped elevation token.
 *
 * The shape mirrors `signInWithBiometric` in lib/auth/api/auth.real.ts —
 * same WebAuthn dance, different upstream: this one assumes the user is
 * already signed in and just needs proof-of-presence to authorize money
 * movement.
 */

import { apiFetch } from "@/lib/api/client"
import { freshWebauthnSignal } from "@/lib/security/webauthn-abort"

type AssertOptions = {
  challenge: string
  rpId?: string
  timeout?: number
  userVerification?: UserVerificationRequirement
  allowCredentials?: {
    id: string
    type: "public-key"
    transports?: AuthenticatorTransport[]
  }[]
}

type BeginResponse = { handle: string; options: AssertOptions }

export type BiometricElevationResult = {
  elevationToken: string
  scope: "transfer:authorize"
}

/** Whether the browser exposes WebAuthn. False on legacy browsers. */
export function biometricSupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential
}

/**
 * Full elevation dance. Throws on user-cancel, no-credentials, network,
 * or backend rejection — caller decides whether to surface a toast or
 * fall back to PIN entry.
 */
export async function elevateWithBiometric(): Promise<BiometricElevationResult> {
  if (!biometricSupported()) {
    throw new Error("This browser doesn't support biometric authorization.")
  }

  const { handle, options } = await apiFetch<BeginResponse>(
    "/me/security/elevate/biometric/begin",
    { method: "POST" },
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

  const cred = (await navigator.credentials.get({
    publicKey,
    signal: freshWebauthnSignal(),
  })) as PublicKeyCredential | null
  if (!cred) throw new Error("Biometric authorization was cancelled.")
  const assertion = cred.response as AuthenticatorAssertionResponse

  return apiFetch<BiometricElevationResult>(
    "/me/security/elevate/biometric/verify",
    {
      method: "POST",
      body: {
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
            userHandle: assertion.userHandle
              ? bufToB64url(assertion.userHandle)
              : null,
          },
        },
      },
    },
  )
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
