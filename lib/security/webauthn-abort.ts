/**
 * Shared abort guard for WebAuthn ceremonies.
 *
 * The browser allows only ONE outstanding `navigator.credentials.get()` /
 * `create()` ceremony per page at a time. If a prior ceremony is cancelled
 * or errors WITHOUT being aborted, the browser can keep it "pending" and
 * reject the next call with NotAllowedError until a full page reload — which
 * is exactly why the biometric toggle sometimes needs a refresh to become
 * clickable again after an error.
 *
 * Routing every ceremony through one shared AbortController fixes that:
 * before each new ceremony we abort the previous controller (clearing any
 * stuck pending request) and hand out a fresh signal. Pass the returned
 * signal as `signal` to `navigator.credentials.get/create({ ..., signal })`.
 */
let controller: AbortController | null = null

export function freshWebauthnSignal(): AbortSignal {
  // Abort the PREVIOUS ceremony (the one that may be stuck pending) before
  // starting a new one — this is what releases the browser's lock so the
  // next attempt works without a page reload.
  controller?.abort()
  controller = new AbortController()
  return controller.signal
}
