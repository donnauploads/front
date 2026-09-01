"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Fingerprint, Loader2, Lock } from "lucide-react"
import { useStore } from "@/lib/store"
import { useResolvedMocks } from "@/lib/dev/use-mocks-flag"
import {
  getTransactionPinStatus,
  verifyTransactionPin,
} from "@/lib/security/api/transaction-pin"
import { logout, signInWithBiometric } from "@/lib/auth/api/auth.real"
import { ApiError } from "@/lib/api/errors"
import { readAppLock, setAppLock } from "@/lib/security/app-lock"

/** How long the tab must be hidden/blurred before the app locks. */
const AWAY_LOCK_MS = 30_000

/**
 * Privacy lock. Tokens stay valid, but if the user leaves the tab (hidden
 * or blurred) for ≥30s and returns, the UI is covered by a lock screen
 * that re-confirms the person with their transaction PIN or biometrics.
 *
 * Only engages for an authenticated real-mode session that has a PIN set
 * (the guaranteed unlock path) — never traps a user who can't unlock.
 * Mounted once in app/(app)/layout.tsx.
 */
export function AppLock() {
  const status = useStore((s) => s.session.status)
  const user = useStore((s) => s.session.user)
  const USE_MOCKS = useResolvedMocks()
  const authed = !USE_MOCKS && status === "authenticated"

  const [pinEnabled, setPinEnabled] = useState(false)
  // Restore the lock across a refresh (AppLock only mounts client-side in the
  // authenticated branch, so reading localStorage here is hydration-safe).
  const [locked, setLocked] = useState<boolean>(() => readAppLock())
  const awayAt = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)

  const lock = useCallback(() => {
    setLocked(true)
    setAppLock(true)
  }, [])
  const unlock = useCallback(() => {
    setLocked(false)
    setAppLock(false)
  }, [])

  // Is a PIN available to unlock with? (checked once per session)
  useEffect(() => {
    if (!authed) {
      setPinEnabled(false)
      return
    }
    let cancelled = false
    getTransactionPinStatus()
      .then((r) => {
        if (!cancelled) setPinEnabled(r.enabled)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [authed])

  // Lock after AWAY_LOCK_MS of INACTIVITY. Two complementary triggers:
  //   1. Idle-on-page — no pointer/keyboard/scroll/touch for the window,
  //      even while the tab stays focused (the "30s of inactivity" rule).
  //   2. Tab-away — the tab is hidden/blurred for the window and comes back.
  useEffect(() => {
    if (!authed || !pinEnabled) return

    // (Re)start the idle countdown. A single shared timer serves both the
    // idle-on-page and background-tab cases.
    const armIdle = () => {
      if (timerRef.current != null) clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => lock(), AWAY_LOCK_MS)
    }

    // Any real interaction resets the countdown. Throttled to ≤1/sec so a
    // stream of mousemove events doesn't thrash the timer.
    let lastReset = 0
    const onActivity = () => {
      const now = Date.now()
      if (now - lastReset < 1000) return
      lastReset = now
      armIdle()
    }
    const ACTIVITY_EVENTS = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "wheel",
      "click",
    ] as const
    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true }),
    )

    // Tab-away: background tabs throttle timers, so record when we left and
    // re-check the true elapsed time on return.
    const markAway = () => {
      if (awayAt.current == null) awayAt.current = Date.now()
    }
    const markBack = () => {
      if (awayAt.current != null) {
        const elapsed = Date.now() - awayAt.current
        awayAt.current = null
        if (elapsed >= AWAY_LOCK_MS) {
          lock()
          return
        }
      }
      armIdle() // resume the idle countdown after returning
    }
    const onVisibility = () => (document.hidden ? markAway() : markBack())

    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("blur", markAway)
    window.addEventListener("focus", markBack)

    armIdle() // start counting from mount

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity))
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("blur", markAway)
      window.removeEventListener("focus", markBack)
      if (timerRef.current != null) clearTimeout(timerRef.current)
    }
  }, [authed, pinEnabled, lock])

  if (!locked) return null
  return (
    <LockScreen
      firstName={user?.firstName ?? null}
      email={user?.email ?? null}
      avatarUrl={user?.avatarUrl ?? null}
      initials={initialsOf(user?.firstName, user?.lastName, user?.email)}
      onUnlock={unlock}
    />
  )
}

function initialsOf(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
): string {
  const a = (firstName ?? "").trim()
  const b = (lastName ?? "").trim()
  const ini = `${a[0] ?? ""}${b[0] ?? ""}`.toUpperCase()
  if (ini) return ini
  return (email ?? "?").trim().slice(0, 1).toUpperCase() || "?"
}

function LockScreen({
  firstName,
  email,
  avatarUrl,
  initials,
  onUnlock,
}: {
  firstName: string | null
  email: string | null
  avatarUrl: string | null
  initials: string
  onUnlock: () => void
}) {
  const [pin, setPin] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  const bioAvailable =
    typeof window !== "undefined" && !!window.PublicKeyCredential

  const pinValid = /^\d{4,6}$/.test(pin)

  async function submitPin() {
    if (!pinValid || busy) return
    setBusy(true)
    setErr(null)
    try {
      await verifyTransactionPin(pin)
      onUnlock()
    } catch (e) {
      setErr(
        e instanceof ApiError
          ? e.message || "Incorrect PIN. Try again."
          : "Couldn't verify your PIN. Try again.",
      )
      setPin("")
    } finally {
      setBusy(false)
    }
  }

  async function unlockBiometric() {
    if (busy) return
    setBusy(true)
    setErr(null)
    try {
      const tz =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : undefined
      await signInWithBiometric(tz, email ?? undefined)
      onUnlock()
    } catch (e) {
      // User cancelling the OS prompt isn't an error worth surfacing.
      const name = (e as { name?: string })?.name
      if (name !== "NotAllowedError" && name !== "AbortError") {
        setErr(e instanceof Error ? e.message : "Biometric unlock failed.")
      }
    } finally {
      setBusy(false)
    }
  }

  async function onSignOut() {
    try {
      await logout()
    } finally {
      window.location.href = "/login"
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Locked"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="modal-scrim"
        style={{
          zIndex: 1300,
          // Opaque so the dashboard behind is fully hidden while away.
          background: "var(--paper)",
          backdropFilter: "none",
        }}
      >
        <motion.div
          initial={{ y: 24, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="modal-card sm"
        >
          <div className="modal-status">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
              }}
            >
              {/* User picture */}
              <span
                aria-hidden
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: "50%",
                  overflow: "hidden",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))",
                  color: "var(--navy-deep)",
                  fontFamily: "var(--serif)",
                  fontWeight: 700,
                  fontSize: 25,
                  border: "2px solid var(--surface)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  initials
                )}
              </span>
              {/* Bold lock badge */}
              <span
                aria-hidden
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--navy)",
                  color: "#fff",
                  boxShadow: "var(--shadow-md)",
                }}
              >
                <Lock width={23} height={23} strokeWidth={2.6} />
              </span>
            </div>
            <div className="ms-title">
              {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
            </div>
            <div className="ms-sub">
              You&apos;ve been away for a bit. Enter your PIN or use biometrics
              to continue.
            </div>
          </div>

          <div className="modal-field">
            <label
              className="modal-label"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              Login PIN
              <button
                type="button"
                onClick={() => setShowHelp((v) => !v)}
                aria-label="What is the login PIN?"
                aria-expanded={showHelp}
                title="What is this?"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 15,
                  height: 15,
                  borderRadius: "50%",
                  padding: 0,
                  border: "1px solid var(--gold-deep)",
                  background: "transparent",
                  color: "var(--gold-deep)",
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: 1,
                  cursor: "pointer",
                  textTransform: "none",
                }}
              >
                ?
              </button>
            </label>
            {showHelp && (
              <p
                style={{
                  margin: "6px 0 8px",
                  fontSize: 11.5,
                  fontWeight: 500,
                  letterSpacing: 0,
                  textTransform: "none",
                  color: "var(--ink-mute)",
                  lineHeight: 1.45,
                }}
              >
                Use your transaction PIN as your login PIN to continue.
              </p>
            )}
            <input
              autoFocus
              // type="text" + CSS masking so Chrome's password manager
              // doesn't fire "Update password?" after each unlock.
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              data-lpignore="true"
              data-form-type="other"
              data-1p-ignore="true"
              spellCheck={false}
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitPin()
              }}
              className="otp-input"
              aria-label="Login PIN"
              // Inline styles win over any CSS class — production
              // builds sometimes have a Tailwind preflight or stale
              // utility class collapsing the input to its intrinsic
              // size. Explicit width/display here is the belt-and-
              // suspenders the cascade can't undo.
              style={{
                display: "block",
                width: "100%",
                // login-sb.css's `.otp-input` (the 6-box login OTP) caps
                // width to 60px with an aspect-ratio + auto margins. Those
                // reuse the same class, so reset them here for the single
                // full-width PIN field. Inline wins over the external rule.
                maxWidth: "none",
                aspectRatio: "auto",
                marginInline: 0,
                height: 58,
                boxSizing: "border-box",
                marginTop: 8,
                fontSize: 26,
                letterSpacing: "0.4em",
                textAlign: "center",
                fontFamily:
                  'ui-monospace, "JetBrains Mono", Menlo, monospace',
                fontWeight: 700,
                color: "var(--text-strong)",
                background: "var(--surface-2)",
                border: "1.5px solid var(--line)",
                borderRadius: 10,
                outline: "none",
                // Mask the PIN as dots. WebkitTextSecurity isn't in React's
                // CSSProperties type, so cast through unknown.
                WebkitTextSecurity: "disc",
              } as unknown as React.CSSProperties}
            />
          </div>

          {err && (
            <p className="modal-err" role="alert">
              {err}
            </p>
          )}

          <button
            type="button"
            disabled={!pinValid || busy}
            onClick={() => void submitPin()}
            className="lk-cta-btn primary"
            style={{ marginTop: 16 }}
          >
            {busy && (
              <Loader2 className="animate-spin" width={18} height={18} aria-hidden />
            )}
            Unlock
          </button>

          {bioAvailable && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void unlockBiometric()}
              className="modal-alt-btn"
              style={{ marginTop: 10 }}
            >
              <Fingerprint aria-hidden />
              Use biometrics
            </button>
          )}

          <button
            type="button"
            onClick={() => void onSignOut()}
            style={{
              display: "block",
              margin: "14px auto 0",
              background: "transparent",
              border: 0,
              color: "var(--ink-mute)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Not you? Sign out
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
