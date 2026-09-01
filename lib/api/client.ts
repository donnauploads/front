import { ApiError, NetworkError, UnauthorizedError } from "./errors"
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./token-store"
import { useStore } from "@/lib/store"

/**
 * Called from a single chokepoint when the session truly ends (refresh
 * failed → cookie is dead). Flips the store to `unauthenticated` so the
 * `(app)` route guard's existing redirect-to-/login effect fires. We don't
 * navigate here directly — the guard already owns that and using
 * `router.replace` from a non-React module is awkward.
 */
function handleSessionLost() {
  clearAccessToken()
  try {
    useStore.getState().clearSession()
  } catch {
    // store may not be ready in odd contexts (tests, SSR-only paths)
  }
}

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? ""

if (!BASE && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    "[api] NEXT_PUBLIC_API_BASE is not set. Add it to frontend/.env.local.",
  )
}

export type ApiInit = Omit<RequestInit, "body"> & {
  /** Auto JSON-stringified unless it's already a FormData / string / Blob. */
  body?: unknown
  /** Skip Authorization + refresh handling. Use for /auth/login, /auth/refresh. */
  skipAuth?: boolean
  /** Default 15_000 ms. */
  timeout?: number
}

const DEFAULT_TIMEOUT_MS = 15_000

/**
 * Thin fetch wrapper:
 *   • prepends NEXT_PUBLIC_API_BASE
 *   • JSON-serializes plain-object bodies
 *   • injects Bearer token unless skipAuth
 *   • on 401 → single-flight refresh + retry once
 *   • throws typed ApiError / UnauthorizedError / NetworkError
 */
export async function apiFetch<T>(path: string, init: ApiInit = {}): Promise<T> {
  return doFetch<T>(path, init, /* isRetry */ false)
}

async function doFetch<T>(
  path: string,
  init: ApiInit,
  isRetry: boolean,
): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`
  const { body, skipAuth, timeout, headers, ...rest } = init

  const finalHeaders = new Headers(headers)
  let finalBody: BodyInit | undefined

  if (body instanceof FormData || body instanceof Blob) {
    finalBody = body
  } else if (typeof body === "string") {
    finalBody = body
  } else if (body !== undefined && body !== null) {
    finalBody = JSON.stringify(body)
    if (!finalHeaders.has("Content-Type")) {
      finalHeaders.set("Content-Type", "application/json")
    }
  }

  if (!skipAuth) {
    const token = getAccessToken()
    if (token && !finalHeaders.has("Authorization")) {
      finalHeaders.set("Authorization", `Bearer ${token}`)
    }
  }

  // ngrok free serves an HTML "Visit Site" interstitial in front of every
  // tunneled request unless this header is present. Harmless on any other
  // host (non-ngrok APIs just ignore unknown headers), so we always send.
  if (!finalHeaders.has("ngrok-skip-browser-warning")) {
    finalHeaders.set("ngrok-skip-browser-warning", "true")
  }

  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(),
    timeout ?? DEFAULT_TIMEOUT_MS,
  )

  let res: Response
  try {
    res = await fetch(url, {
      ...rest,
      headers: finalHeaders,
      body: finalBody,
      credentials: "include",
      signal: controller.signal,
    })
  } catch (e) {
    clearTimeout(timer)
    throw new NetworkError(e)
  }
  clearTimeout(timer)

  if (res.status === 401 && !skipAuth && !isRetry) {
    try {
      await refreshTokens()
    } catch {
      // Session is truly gone — boot the user out of the authenticated
      // area instead of letting individual call sites surface a
      // "Session expired" error inline.
      handleSessionLost()
      throw new UnauthorizedError()
    }
    return doFetch<T>(path, init, /* isRetry */ true)
  }

  if (res.status === 204) {
    return undefined as T
  }

  if (res.ok) {
    // Some endpoints (binary downloads) won't be JSON. The caller can pass
    // a custom Accept header / use fetch directly for those. Default: JSON.
    const ct = res.headers.get("Content-Type") ?? ""
    if (ct.includes("application/json")) {
      return (await res.json()) as T
    }
    return (await res.text()) as unknown as T
  }

  // Non-2xx → typed error. Note: a 401 reaching this point means we already
  // refreshed successfully and retried, so the failure is the *action* being
  // denied (e.g. wrong PIN). Preserve the backend's message rather than
  // collapsing to "Session expired".
  const text = await res.text()
  let payload: { code?: string; message?: string; details?: unknown } | null =
    null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = null
  }
  throw new ApiError(
    payload?.code ?? `HTTP_${res.status}`,
    payload?.message ?? (text || res.statusText),
    payload?.details,
    res.status,
  )
}

// ─── Single-flight refresh (cross-tab) ────────────────────────────────────
//
// Two callers in the same tab are deduped by `refreshPromise`. Two callers
// in DIFFERENT tabs share the same httpOnly refresh cookie — without
// coordination they both POST /auth/refresh with the same token and the
// backend treats the second one as reuse (P2002 on RefreshTokenAudit,
// then family revoke). navigator.locks serializes across tabs of the same
// origin; inside the lock each refresh uses the cookie the previous one
// just rotated, so no collision.

export interface RefreshResult {
  accessToken: string
  refreshToken: string
  sessionId: string
}

const ACCESS_TTL_SECONDS = 15 * 60

let refreshPromise: Promise<RefreshResult> | null = null

export async function refreshTokens(): Promise<RefreshResult> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    try {
      return await withAuthRefreshLock(doRefresh)
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

async function doRefresh(): Promise<RefreshResult> {
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
  if (!res.ok) throw new UnauthorizedError()
  const data = (await res.json()) as RefreshResult
  // Access TTL is fixed at 15 min server-side (auth.controller.ts
  // cookieOpts); response doesn't include it, so mirror the constant.
  setAccessToken(data.accessToken, ACCESS_TTL_SECONDS)
  return data
}

/** Wraps fn in a cross-tab exclusive lock when the Web Locks API is
 *  available (all modern browsers, https or localhost). Falls back to a
 *  bare call in environments without it (older Safari, SSR). */
function withAuthRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.locks?.request === "function"
  ) {
    return navigator.locks.request(
      "nova-auth-refresh",
      { mode: "exclusive" },
      fn,
    ) as Promise<T>
  }
  return fn()
}
