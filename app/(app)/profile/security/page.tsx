"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import QRCode from "qrcode"
import {
  Check,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Laptop,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Smartphone,
  Tablet,
  X,
} from "lucide-react"
import {
  getTransactionPinStatus,
  setTransactionPin,
  verifyTransactionPin,
} from "@/lib/security/api/transaction-pin"
import { ProfileSubPage } from "@/components/profile/ProfileSubPage"
import { Toast } from "@/components/ui/Toast"
import { getSocket } from "@/lib/realtime/socket"
import { ApiError } from "@/lib/api/errors"
import { freshWebauthnSignal } from "@/lib/security/webauthn-abort"
import {
  biometricRebindBegin,
  biometricRebindFinish,
  biometricRegisterBegin,
  biometricRegisterFinish,
  biometricRemove,
  changePassword as apiChangePassword,
  getSecurityOverview,
  listBiometric,
  listSessions,
  revokeSession,
  totpBegin,
  totpDisable,
  totpVerify,
  type BiometricEnrollment,
  type SecurityOverview,
  type SessionRow,
} from "@/lib/profile/api/security.real"

type ToastState = { open: boolean; msg: string; variant: "success" | "error" }

export default function SecurityCenterPage() {
  const [overview, setOverview] = useState<SecurityOverview | null>(null)
  const [sessions, setSessions] = useState<SessionRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>({
    open: false,
    msg: "",
    variant: "success",
  })

  const [pwOpen, setPwOpen] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const [pinEnabled, setPinEnabled] = useState<boolean | null>(null)
  const [totpOpen, setTotpOpen] = useState<"enable" | "disable" | null>(null)
  const [bioBusy, setBioBusy] = useState(false)
  const [bioEnrollments, setBioEnrollments] = useState<
    BiometricEnrollment[] | null
  >(null)
  // PIN step-up prompt for removing passkey(s). `target: "all"` disables
  // biometric account-wide (the master toggle); a specific id removes one.
  const [pinConfirm, setPinConfirm] = useState<{
    target: "all" | string
  } | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const flash = useCallback(
    (msg: string, variant: "success" | "error" = "success") => {
      setToast({ open: true, msg, variant })
      setTimeout(() => setToast((t) => ({ ...t, open: false })), 3500)
    },
    [],
  )

  const refresh = useCallback(async () => {
    const [ov, ss, pin, bio] = await Promise.all([
      getSecurityOverview(),
      listSessions(),
      getTransactionPinStatus().catch(() => ({ enabled: false })),
      listBiometric().catch(() => [] as BiometricEnrollment[]),
    ])
    setOverview(ov)
    setSessions(ss.filter((s) => !s.revokedAt))
    setPinEnabled(pin.enabled)
    setBioEnrollments(bio)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    refresh()
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof ApiError ? e.message : "Could not load security info.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refresh])

  // Live updates: when any of this user's sessions is revoked (here or on
  // another device), drop it from the list.
  useEffect(() => {
    const sock = getSocket()
    function onRevoked(p: { sessionId: string }) {
      setSessions((prev) =>
        prev ? prev.filter((s) => s.id !== p.sessionId) : prev,
      )
      setOverview((prev) =>
        prev
          ? { ...prev, activeSessions: Math.max(0, prev.activeSessions - 1) }
          : prev,
      )
    }
    sock.on("session.revoked", onRevoked)
    return () => {
      sock.off("session.revoked", onRevoked)
    }
  }, [])

  // Override the "current" session's device metadata with what the *real*
  // browser reports. The DB row might be stale (e.g. recorded from a prior
  // DevTools mobile emulation) — but we know who's looking right now.
  const displaySessions = useMemo(() => {
    if (!sessions) return null
    const live = typeof navigator !== "undefined" ? parseUA(navigator.userAgent) : null
    return sessions.map((s) =>
      s.current && live
        ? {
            ...s,
            device: {
              ...s.device,
              name: live.name,
              os: live.os,
              browser: live.browser,
            },
          }
        : s,
    )
  }, [sessions])

  const current = useMemo(
    () => displaySessions?.find((s) => s.current),
    [displaySessions],
  )
  // The device id we bind a new enrollment to (the current session's device).
  const currentDeviceId = useMemo(
    () => current?.device.id ?? displaySessions?.[0]?.device.id ?? null,
    [current, displaySessions],
  )
  const lastLoginLabel = useMemo(() => {
    if (!current) return null
    const where =
      formatLocation(current.device.locationLastSeen) ??
      formatIp(current.device.ipLastSeen)
    return where
      ? `Last login: ${where} · ${relTime(current.device.lastSeenAt)}.`
      : `Last login: ${relTime(current.device.lastSeenAt)}.`
  }, [current])

  async function onRevoke(s: SessionRow) {
    setRevokingId(s.id)
    const snapshot = sessions
    setSessions((prev) => (prev ? prev.filter((x) => x.id !== s.id) : prev))
    try {
      await revokeSession(s.id)
      flash(`${s.device.name ?? "Device"} signed out`)
    } catch (e) {
      setSessions(snapshot)
      flash(e instanceof ApiError ? e.message : "Could not sign out device")
    } finally {
      setRevokingId(null)
    }
  }

  async function onToggle2fa() {
    if (!overview) return
    setTotpOpen(overview.totpActive ? "disable" : "enable")
  }

  // Open the PIN step-up before removing passkey(s). Disabling a sign-in
  // factor is a security downgrade, so the backend requires a fresh
  // transaction-PIN elevation (scope security:manage). `target: "all"`
  // disables biometric account-wide; an id removes just that passkey.
  function requestRemove(target: "all" | string) {
    if (bioBusy) return
    if (pinEnabled === false) {
      flash("Set a transaction PIN first to manage biometrics.")
      setPinOpen(true)
      return
    }
    setPinConfirm({ target })
  }

  // Runs after the user enters their PIN in the confirm modal. Throws on a
  // bad PIN / failed removal so the modal can surface the error and stay open.
  async function confirmRemove(pin: string, target: "all" | string) {
    const { elevationToken } = await verifyTransactionPin(pin, "security:manage")
    if (target === "all") {
      const rows = await listBiometric()
      // Sequential so one elevation token cleanly covers each DELETE.
      for (const r of rows) await biometricRemove(r.id, elevationToken)
    } else {
      await biometricRemove(target, elevationToken)
    }
    await refresh().catch(() => {})
    setPinConfirm(null)
    flash("Biometric off")
  }

  // Enroll (or rebind) a passkey for the CURRENT device, then refresh so the
  // "Your passkeys" list reflects it. Shared by the master toggle (first
  // enable) and the "Set up a new passkey" button (add another device).
  async function enableBiometricHere(successMsg = "Biometric on") {
    if (!overview || bioBusy) return
    const deviceId = currentDeviceId
    if (!deviceId) {
      flash("No active session, sign in again first.")
      return
    }
    setBioBusy(true)
    try {
      // Enabling ALWAYS runs a real WebAuthn ceremony so the DB enrollment
      // can never point at a passkey that no longer exists on the device.
      //   1. rebind — verify an existing OS passkey via
      //      navigator.credentials.get() and (re)bind it to this device.
      //      This also sidesteps create()'s "already enrolled" condition
      //      when the passkey is still present.
      //   2. fresh enroll — no usable passkey here (first-time setup, or
      //      the OS passkey was deleted) → create() a new one. The server
      //      upserts on (userId, deviceId), so this cleanly replaces any
      //      stale credential.
      const rebound = await tryRebindBiometric(deviceId)
      if (!rebound) {
        await enrollBiometric(deviceId)
      }
      // Refresh so the new passkey shows in the list below; fall back to an
      // optimistic flag flip if the reload hiccups (e.g. Neon cold start).
      await refresh().catch(() =>
        setOverview({ ...overview, biometricEnrolled: true }),
      )
      flash(successMsg)
    } catch (e) {
      const msg = friendlyBiometricError(e)
      if (msg) flash(msg)
    } finally {
      setBioBusy(false)
    }
  }

  async function onToggleBiometric() {
    if (!overview || bioBusy) return
    if (overview.biometricEnrolled) {
      // Biometric is account-level: with a synced passkey (iCloud / Google
      // Password Manager) the whole account shares ONE credential, and the
      // backend soft-disables that shared row on remove — turning sign-in
      // off on every device that uses it. Turning OFF here therefore
      // disables biometric for the account, gated behind a PIN step-up.
      requestRemove("all")
      return
    }
    await enableBiometricHere()
  }

  // Recovery: force a fresh passkey on THIS device, bypassing rebind/
  // reactivate. Fixes the desync where the OS passkey was deleted but the
  // server still holds an enrollment (sign-in then shows the cross-device
  // chooser). create() mints a new credential and the server upserts on
  // (userId, deviceId), replacing the stale one — no cross-device detour.
  async function onResetBiometric() {
    if (!overview || bioBusy) return
    const deviceId =
      current?.device.id ?? displaySessions?.[0]?.device.id ?? null
    if (!deviceId) {
      flash("No active session, sign in again first.")
      return
    }
    setBioBusy(true)
    try {
      await enrollBiometric(deviceId)
      await refresh().catch(() =>
        setOverview({ ...overview, biometricEnrolled: true }),
      )
      flash("Biometric re-set up on this device")
    } catch (e) {
      const msg = friendlyBiometricError(e)
      if (msg) flash(msg)
    } finally {
      setBioBusy(false)
    }
  }

  return (
    <ProfileSubPage
      title="Security Center"
      subtitle="Locks, keys, and everything that protects your money."
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void refresh()} />
      ) : overview ? (
        <>
          {/* Health banner */}
          <div className="card-info-row ok" style={{ marginBottom: 18 }}>
            <span className="ci-ic" aria-hidden>
              <ShieldCheck />
            </span>
            <div className="ci-body">
              <div className="ci-title">Your account looks healthy</div>
              {lastLoginLabel && (
                <div className="ci-sub">{lastLoginLabel}</div>
              )}
            </div>
          </div>

          {/* Sign-in security */}
          <div className="pf-group">Sign-in security</div>
          <div className="panel">
            <div className="panel-body">
              <ActionRow
                Icon={KeyRound}
                title="Change password"
                body={
                  overview.passwordUpdatedAt
                    ? `Last changed ${relTime(overview.passwordUpdatedAt)}.`
                    : "Pick a strong, unique password."
                }
                onClick={() => setPwOpen(true)}
              />
              <ActionRow
                Icon={Lock}
                title="Transaction PIN"
                body={
                  pinEnabled === null
                    ? "Loading…"
                    : pinEnabled
                      ? "Required for every transfer. Tap to change."
                      : "Set a PIN to authorize transfers."
                }
                onClick={() => setPinOpen(true)}
              />
              <ToggleRow
                Icon={Smartphone}
                title="Two-factor authentication"
                body="Use an authenticator app for sign-in codes."
                on={overview.totpActive}
                onClick={onToggle2fa}
              />
              <ToggleRow
                Icon={Fingerprint}
                title="Biometric sign-in"
                body="Use Face ID, Touch ID, or Windows Hello to sign in. Works across your devices; turning it off disables it everywhere."
                on={overview.biometricEnrolled}
                busy={bioBusy}
                onClick={onToggleBiometric}
              />
              {overview.biometricEnrolled && (
                <button
                  type="button"
                  onClick={onResetBiometric}
                  disabled={bioBusy}
                  style={{
                    display: "block",
                    marginTop: 8,
                    marginLeft: "auto",
                    background: "transparent",
                    border: 0,
                    color: "var(--ink-mute)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: bioBusy ? "default" : "pointer",
                  }}
                >
                  Not prompting for Face/Touch/Hello? Re-set up on this device
                </button>
              )}
              {bioEnrollments && bioEnrollments.length > 0 && (
                <div
                  style={{
                    marginTop: 14,
                    borderTop: "1px solid var(--line)",
                    paddingTop: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--ink-mute)",
                      textTransform: "uppercase",
                      letterSpacing: ".04em",
                      marginBottom: 4,
                    }}
                  >
                    Your passkeys
                  </div>
                  {bioEnrollments.map((e) => (
                    <div
                      key={e.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 0",
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          display: "grid",
                          placeItems: "center",
                          width: 34,
                          height: 34,
                          borderRadius: 9,
                          background: "var(--surface-2)",
                          color: "var(--ink-soft)",
                          flexShrink: 0,
                        }}
                      >
                        <KeyRound width={16} height={16} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: "var(--text-strong)",
                          }}
                        >
                          {passkeyLabel(e)}
                        </div>
                        <div
                          style={{ fontSize: 12, color: "var(--ink-mute)" }}
                        >
                          {e.lastUsedAt
                            ? `Last used ${relTime(e.lastUsedAt)}`
                            : `Added ${relTime(e.createdAt)}`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => requestRemove(e.id)}
                        disabled={bioBusy || !!pinConfirm}
                        style={{
                          flexShrink: 0,
                          background: "transparent",
                          border: "1.5px solid var(--line)",
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: "var(--danger, #c0392b)",
                          cursor: bioBusy ? "default" : "pointer",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => void enableBiometricHere("Passkey added")}
                    disabled={bioBusy || !!pinConfirm}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 6,
                      width: "100%",
                      justifyContent: "center",
                      background: "transparent",
                      border: "1.5px dashed var(--line)",
                      borderRadius: 10,
                      padding: "11px 12px",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text-strong)",
                      cursor: bioBusy ? "default" : "pointer",
                    }}
                  >
                    {bioBusy ? (
                      <Loader2
                        className="animate-spin"
                        width={15}
                        height={15}
                        aria-hidden
                      />
                    ) : (
                      <Plus width={15} height={15} aria-hidden />
                    )}
                    Set up a new passkey
                  </button>
                  <p
                    style={{
                      fontSize: 11.5,
                      color: "var(--ink-mute)",
                      marginTop: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    Adds this device&rsquo;s Face ID / Touch ID / Windows Hello.
                    Removing a passkey needs your transaction PIN, and you can
                    still sign in with your password — so this won&rsquo;t lock
                    you out.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Active sessions */}
          <div className="pf-group">
            Active sessions
            {sessions && (
              <span style={{ marginLeft: 6, opacity: .6, letterSpacing: 0 }}>
                ({sessions.length})
              </span>
            )}
          </div>
          <div className="panel">
            <div className="panel-body">
              {displaySessions?.length === 0 && (
                <div
                  style={{
                    padding: "26px 4px",
                    textAlign: "center",
                    color: "var(--ink-mute)",
                    fontSize: 13.5,
                  }}
                >
                  No other devices are signed in.
                </div>
              )}
              {displaySessions?.map((s) => {
                const deviceName =
                  s.device.name ?? deviceFallback(s.device.os, s.device.browser)
                const sub = [
                  formatLocation(s.device.locationLastSeen) ??
                    formatIp(s.device.ipLastSeen),
                  relTime(s.device.lastSeenAt),
                ]
                  .filter(Boolean)
                  .join(" · ")
                return (
                  <div className="set-row" key={s.id}>
                    <div
                      className="sr-l"
                      style={{ display: "flex", gap: 12, alignItems: "center" }}
                    >
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "var(--paper)",
                          color: "var(--ink-soft)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <DeviceIcon name={s.device.name} os={s.device.os} />
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span
                          className="sn"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {deviceName}
                          {s.current && (
                            <span className="li-pill connected">This device</span>
                          )}
                        </span>
                        {sub && <span className="sd">{sub}</span>}
                      </span>
                    </div>
                    {!s.current && (
                      <button
                        type="button"
                        onClick={() => onRevoke(s)}
                        disabled={revokingId === s.id}
                        className="li-act warn"
                      >
                        {revokingId === s.id && (
                          <Loader2
                            className="animate-spin"
                            width={12}
                            height={12}
                            aria-hidden
                          />
                        )}
                        Sign out
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      ) : null}

      {pwOpen && (
        <ChangePasswordModal
          onClose={() => setPwOpen(false)}
          onSaved={() => {
            setPwOpen(false)
            flash("Password updated")
            void refresh()
          }}
          onError={(msg) => flash(msg, "error")}
        />
      )}
      {pinOpen && (
        <TransactionPinModal
          isChanging={!!pinEnabled}
          onClose={() => setPinOpen(false)}
          onSaved={() => {
            setPinOpen(false)
            flash(pinEnabled ? "Transaction PIN changed" : "Transaction PIN set")
            void refresh()
          }}
        />
      )}
      {totpOpen && overview && (
        <TwoFactorModal
          mode={totpOpen}
          onClose={() => setTotpOpen(null)}
          onDone={(msg) => {
            setTotpOpen(null)
            flash(msg)
            void refresh()
          }}
        />
      )}
      {pinConfirm && (
        <PinConfirmModal
          title={
            pinConfirm.target === "all"
              ? "Turn off biometric sign-in"
              : "Remove this passkey"
          }
          body={
            pinConfirm.target === "all"
              ? "Enter your transaction PIN to disable biometric sign-in on your account."
              : "Enter your transaction PIN to remove this passkey."
          }
          onConfirm={(pin) => confirmRemove(pin, pinConfirm.target)}
          onClose={() => setPinConfirm(null)}
        />
      )}

      <Toast open={toast.open} message={toast.msg} variant={toast.variant} />
    </ProfileSubPage>
  )
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: 40,
        color: "var(--ink-mute)",
        fontSize: 14,
      }}
    >
      <Loader2 className="animate-spin" width={16} height={16} aria-hidden />
      Loading your security settings…
    </div>
  )
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="card-error" role="alert" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div style={{ fontWeight: 700 }}>Couldn&apos;t load security info</div>
      <div style={{ marginTop: 4, fontWeight: 500, opacity: .85 }}>{message}</div>
      <button
        type="button"
        onClick={onRetry}
        className="li-act"
        style={{ alignSelf: "flex-start", marginTop: 10 }}
      >
        Try again
      </button>
    </div>
  )
}

function ActionRow({
  Icon,
  title,
  body,
  onClick,
}: {
  Icon: typeof KeyRound
  title: string
  body: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="set-row tight"
      style={{
        width: "100%",
        background: "transparent",
        border: 0,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div
        className="sr-l"
        style={{ display: "flex", gap: 12, alignItems: "center" }}
      >
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--paper)",
            color: "var(--gold-deep)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          aria-hidden
        >
          <Icon width={16} height={16} />
        </span>
        <span>
          <span className="sn">{title}</span>
          <span className="sd">{body}</span>
        </span>
      </div>
      <ChevronRight className="mr-chev" aria-hidden />
    </button>
  )
}

function ToggleRow({
  Icon,
  title,
  body,
  on,
  busy,
  onClick,
}: {
  Icon: typeof KeyRound
  title: string
  body: string
  on: boolean
  busy?: boolean
  onClick: () => void
}) {
  return (
    <div className="set-row tight">
      <div
        className="sr-l"
        style={{ display: "flex", gap: 12, alignItems: "center" }}
      >
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--paper)",
            color: "var(--gold-deep)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          aria-hidden
        >
          <Icon width={16} height={16} />
        </span>
        <span>
          <span className="sn">{title}</span>
          <span className="sd">{body}</span>
        </span>
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {busy && (
          <Loader2
            className="animate-spin"
            width={14}
            height={14}
            aria-hidden
            style={{ color: "var(--ink-mute)" }}
          />
        )}
        <label className="switch" aria-label={on ? "Toggle on" : "Toggle off"}>
          <input
            type="checkbox"
            role="switch"
            aria-checked={on}
            checked={on}
            disabled={busy}
            onChange={onClick}
          />
          <span className="track" />
        </label>
      </div>
    </div>
  )
}

function ChangePasswordModal({
  onClose,
  onSaved,
  onError,
}: {
  onClose: () => void
  onSaved: () => void
  onError: (msg: string) => void
}) {
  const [cur, setCur] = useState("")
  const [pw, setPw] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const valid = cur.length >= 8 && pw.length >= 10 && pw === confirm

  async function submit() {
    if (!valid || saving) return
    setSaving(true)
    setErr(null)
    try {
      await apiChangePassword(cur, pw)
      onSaved()
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not update password"
      setErr(msg)
      onError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      title="Change password"
      icon={<KeyRound aria-hidden />}
      onClose={onClose}
    >
      <PwField
        label="Current password"
        value={cur}
        onChange={setCur}
        autoFocus
      />
      <PwField
        label="New password"
        value={pw}
        onChange={setPw}
        help="At least 10 characters"
      />
      <PwField
        label="Confirm new password"
        value={confirm}
        onChange={setConfirm}
      />
      {err && (
        <p className="modal-err" role="alert">
          {err}
        </p>
      )}
      <button
        type="button"
        disabled={!valid || saving}
        onClick={submit}
        className="lk-cta-btn primary"
        style={{ marginTop: 20 }}
      >
        {saving && (
          <Loader2 className="animate-spin" width={18} height={18} aria-hidden />
        )}
        Update password
      </button>
    </ModalShell>
  )
}

function TwoFactorModal({
  mode,
  onClose,
  onDone,
}: {
  mode: "enable" | "disable"
  onClose: () => void
  onDone: (msg: string) => void
}) {
  const [secret, setSecret] = useState<string | null>(null)
  const [otpauth, setOtpauth] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(mode === "enable")
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  function copySecret() {
    if (!secret) return
    navigator.clipboard?.writeText(secret).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  useEffect(() => {
    if (mode !== "enable") return
    let cancelled = false
    totpBegin()
      .then((r) => {
        if (cancelled) return
        setSecret(r.secret)
        setOtpauth(r.otpauthUrl)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setErr(e instanceof ApiError ? e.message : "Could not start 2FA setup")
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode])

  // Render the QR onto the canvas whenever the otpauth URL changes.
  useEffect(() => {
    const canvas = qrCanvasRef.current
    if (!canvas || !otpauth) return
    QRCode.toCanvas(canvas, otpauth, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 210,
      color: { dark: "#1C1A17", light: "#FFFFFF" },
    }).catch(() => {})
  }, [otpauth])

  async function submit() {
    if (code.length !== 6 || busy) return
    setBusy(true)
    setErr(null)
    try {
      if (mode === "enable") {
        await totpVerify(code)
        onDone("Two-factor enabled")
      } else {
        await totpDisable(code)
        onDone("Two-factor disabled")
      }
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Invalid code")
      setBusy(false)
    }
  }

  return (
    <ModalShell
      title={mode === "enable" ? "Enable two-factor" : "Disable two-factor"}
      icon={<Smartphone aria-hidden />}
      onClose={onClose}
    >
      {mode === "enable" ? (
        <div style={{ marginTop: 14 }}>
          <p
            style={{
              fontSize: 13.5,
              color: "var(--ink-soft)",
              lineHeight: 1.55,
            }}
          >
            Scan this QR with 1Password, Authy, or Google Authenticator, then
            enter the 6-digit code it shows.
          </p>
          {otpauth ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
                marginTop: 16,
              }}
            >
              <div
                style={{
                  background: "#fff",
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid var(--line)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <canvas
                  ref={qrCanvasRef}
                  style={{ display: "block" }}
                  aria-label="Two-factor setup QR"
                />
              </div>
              {secret && (
                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    gap: 8,
                    background: "var(--surface-2)",
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    padding: 6,
                  }}
                >
                  <code
                    style={{
                      flex: 1,
                      minWidth: 0,
                      textAlign: "center",
                      fontFamily: 'ui-monospace, "JetBrains Mono", monospace',
                      fontSize: 14,
                      letterSpacing: ".14em",
                      color: "var(--text-strong)",
                      userSelect: "all",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {secret}
                  </code>
                  <button
                    type="button"
                    onClick={copySecret}
                    aria-label={copied ? "Copied" : "Copy setup key"}
                    title={copied ? "Copied" : "Copy setup key"}
                    className="modal-x"
                    style={{ flexShrink: 0 }}
                  >
                    {copied ? (
                      <Check
                        width={16}
                        height={16}
                        strokeWidth={3}
                        aria-hidden
                        style={{ color: "#2F8A5B" }}
                      />
                    ) : (
                      <Copy width={16} height={16} aria-hidden />
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                height: 240,
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: "var(--ink-mute)",
                fontSize: 13.5,
              }}
            >
              <Loader2 className="animate-spin" width={16} height={16} aria-hidden />
              Generating QR code…
            </div>
          )}
        </div>
      ) : (
        <p
          style={{
            marginTop: 14,
            fontSize: 13.5,
            color: "var(--ink-soft)",
            lineHeight: 1.55,
          }}
        >
          Enter the current 6-digit code from your authenticator app to turn
          off two-factor authentication.
        </p>
      )}

      <CodeField value={code} onChange={setCode} />

      {err && (
        <p className="modal-err" role="alert">
          {err}
        </p>
      )}

      <button
        type="button"
        disabled={code.length !== 6 || busy}
        onClick={submit}
        className="lk-cta-btn primary"
        style={{ marginTop: 18 }}
      >
        {busy && (
          <Loader2 className="animate-spin" width={18} height={18} aria-hidden />
        )}
        {mode === "enable" ? "Verify & enable" : "Disable"}
      </button>
    </ModalShell>
  )
}

function TransactionPinModal({
  isChanging,
  onClose,
  onSaved,
}: {
  isChanging: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [stage, setStage] = useState<"current" | "new" | "confirm">(
    isChanging ? "current" : "new",
  )
  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const active = stage === "current" ? currentPin : stage === "new" ? newPin : confirmPin
  const setActive =
    stage === "current"
      ? setCurrentPin
      : stage === "new"
        ? setNewPin
        : setConfirmPin
  const valid = /^\d{4,6}$/.test(active)

  async function next() {
    setErr(null)
    if (stage === "current") {
      if (!valid) return
      setStage("new")
      return
    }
    if (stage === "new") {
      if (!valid) return
      setStage("confirm")
      return
    }
    // confirm
    if (newPin !== confirmPin) {
      setErr("PINs don't match, try again.")
      setConfirmPin("")
      setStage("new")
      setNewPin("")
      return
    }
    setSubmitting(true)
    try {
      await setTransactionPin({
        newPin,
        ...(isChanging ? { currentPin } : {}),
      })
      onSaved()
    } catch (e) {
      setErr(
        e instanceof ApiError
          ? e.message || "Couldn't save PIN."
          : "Network error. Try again.",
      )
      setSubmitting(false)
    }
  }

  const title =
    stage === "current"
      ? "Enter your current PIN"
      : stage === "new"
        ? isChanging
          ? "Pick a new PIN"
          : "Create a transaction PIN"
        : "Re-enter to confirm"

  return (
    <ModalShell title={title} icon={<Lock aria-hidden />} onClose={onClose}>
      <p
        style={{
          marginTop: 14,
          fontSize: 13.5,
          color: "var(--ink-soft)",
          lineHeight: 1.55,
        }}
      >
        {stage === "new"
          ? "4–6 digits. Avoid 1234 or repeated digits."
          : stage === "confirm"
            ? "Type it once more so we know you've got it."
            : "Required because you're changing an existing PIN."}
      </p>
      <div className="modal-field">
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={active}
          onChange={(e) => setActive(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && valid && !submitting) {
              e.preventDefault()
              void next()
            }
          }}
          className="otp-input"
          aria-label="PIN"
          // login-sb.css's `.otp-input` (the 6-box login OTP) stays in the
          // document after sign-in and caps this field to a tiny 60px square
          // (max-width + aspect-ratio + auto margins). Reset those inline so
          // this single PIN field renders full-width — inline wins over the
          // external class. Mirrors the AppLock re-auth PIN fix.
          style={{
            display: "block",
            width: "100%",
            maxWidth: "none",
            aspectRatio: "auto",
            marginInline: 0,
            height: 58,
            boxSizing: "border-box",
            marginTop: 8,
            fontSize: 26,
            letterSpacing: "0.4em",
            textAlign: "center",
            fontFamily: 'ui-monospace, "JetBrains Mono", Menlo, monospace',
            fontWeight: 700,
            color: "var(--text-strong)",
            background: "var(--surface-2)",
            border: "1.5px solid var(--line)",
            borderRadius: 10,
            outline: "none",
          }}
        />
      </div>
      {err && (
        <p className="modal-err" role="alert">
          {err}
        </p>
      )}
      <button
        type="button"
        disabled={!valid || submitting}
        onClick={next}
        className="lk-cta-btn primary"
        style={{ marginTop: 18 }}
      >
        {submitting
          ? "Saving…"
          : stage === "confirm"
            ? "Save PIN"
            : "Continue"}
      </button>
    </ModalShell>
  )
}

/**
 * Single-field PIN step-up used to authorize a security downgrade (removing
 * a passkey / turning biometric off). `onConfirm` must throw on failure —
 * the modal surfaces the error and stays open; on success the parent unmounts
 * it. Mirrors TransactionPinModal's full-width input styling.
 */
function PinConfirmModal({
  title,
  body,
  onConfirm,
  onClose,
}: {
  title: string
  body: string
  onConfirm: (pin: string) => Promise<void>
  onClose: () => void
}) {
  const [pin, setPin] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const valid = /^\d{4,6}$/.test(pin)

  async function submit() {
    if (!valid || submitting) return
    setSubmitting(true)
    setErr(null)
    try {
      await onConfirm(pin)
      // Success: parent clears pinConfirm, unmounting this modal.
    } catch (e) {
      setErr(
        e instanceof ApiError
          ? e.message || "Incorrect PIN, try again."
          : "Network error. Try again.",
      )
      setPin("")
      setSubmitting(false)
    }
  }

  return (
    <ModalShell title={title} icon={<Lock aria-hidden />} onClose={onClose}>
      <p
        style={{
          marginTop: 14,
          fontSize: 13.5,
          color: "var(--ink-soft)",
          lineHeight: 1.55,
        }}
      >
        {body}
      </p>
      <div className="modal-field">
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && valid && !submitting) {
              e.preventDefault()
              void submit()
            }
          }}
          className="otp-input"
          aria-label="Transaction PIN"
          style={{
            display: "block",
            width: "100%",
            maxWidth: "none",
            aspectRatio: "auto",
            marginInline: 0,
            height: 58,
            boxSizing: "border-box",
            marginTop: 8,
            fontSize: 26,
            letterSpacing: "0.4em",
            textAlign: "center",
            fontFamily: 'ui-monospace, "JetBrains Mono", Menlo, monospace',
            fontWeight: 700,
            color: "var(--text-strong)",
            background: "var(--surface-2)",
            border: "1.5px solid var(--line)",
            borderRadius: 10,
            outline: "none",
          }}
        />
      </div>
      {err && (
        <p className="modal-err" role="alert">
          {err}
        </p>
      )}
      <button
        type="button"
        disabled={!valid || submitting}
        onClick={submit}
        className="lk-cta-btn primary"
        style={{ marginTop: 18 }}
      >
        {submitting ? "Verifying…" : "Confirm"}
      </button>
    </ModalShell>
  )
}

function ModalShell({
  title,
  icon,
  children,
  onClose,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div role="dialog" aria-modal="true" className="modal-scrim">
      <button aria-label="Close" onClick={onClose} className="modal-scrim-btn" />
      <div className="modal-card">
        <div className="modal-grip" />
        <div className="modal-head">
          <div className="mh-l">
            {icon && (
              <span className="modal-ic" aria-hidden>
                {icon}
              </span>
            )}
            <div className="modal-title">{title}</div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="modal-x"
          >
            <X aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function PwField({
  label,
  value,
  onChange,
  help,
  autoFocus,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  help?: string
  autoFocus?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="modal-field">
      <label className="modal-label">{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          autoComplete="off"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="docs-input"
          style={{ cursor: "text", paddingRight: 44 }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          title={show ? "Hide" : "Show"}
          className="pw-eye"
        >
          {show ? (
            <EyeOff width={17} height={17} aria-hidden />
          ) : (
            <Eye width={17} height={17} aria-hidden />
          )}
        </button>
      </div>
      {help && (
        <div
          style={{ marginTop: 6, fontSize: 12, color: "var(--ink-mute)" }}
        >
          {help}
        </div>
      )}
    </div>
  )
}

function CodeField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="modal-field">
      <label className="modal-label">6-digit code</label>
      <input
        inputMode="numeric"
        pattern="\d{6}"
        autoComplete="one-time-code"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className="otp-input"
        placeholder="••••••"
      />
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function DeviceIcon({
  name,
  os,
}: {
  name: string | null
  os: string | null
}) {
  const blob = `${name ?? ""} ${os ?? ""}`.toLowerCase()
  if (/iphone|android|phone|mobile/.test(blob))
    return <Smartphone className="h-4 w-4" aria-hidden />
  if (/ipad|tablet/.test(blob)) return <Tablet className="h-4 w-4" aria-hidden />
  return <Laptop className="h-4 w-4" aria-hidden />
}

function deviceFallback(os: string | null, browser: string | null) {
  if (os && browser) return `${browser} on ${os}`
  return os ?? browser ?? "Unknown device"
}

// Returns null when the user simply cancelled the OS prompt — no toast
// needed. For real failures returns a short, readable message.
function friendlyBiometricError(e: unknown): string | null {
  if (e instanceof ApiError) {
    return e.message || `Biometric setup failed (${e.code})`
  }
  if (!(e instanceof Error)) return "Biometric setup failed"
  const name = (e as Error & { name?: string }).name ?? ""
  if (name === "NotAllowedError") return null
  if (name === "AbortError" || /abort signal/i.test(e.message ?? "")) {
    return "Biometric setup was interrupted. Tap the toggle again without switching apps or locking the screen."
  }
  if (name === "InvalidStateError")
    return "This device is already enrolled."
  if (name === "NotSupportedError")
    return "This browser doesn't support biometric sign-in."
  if (name === "SecurityError")
    return "Biometric requires a secure origin (https or localhost)."
  // Mobile browsers (especially iOS Safari and Android Chrome) raise a
  // generic DOMException with this message when there's no usable
  // platform authenticator, when iCloud Keychain isn't reachable, or
  // when WebAuthn is blocked by an in-app browser. Replace it with
  // something the user can act on.
  if (name === "UnknownError" || /unknown error/i.test(e.message ?? "")) {
    return "Couldn't reach a biometric authenticator on this device. Make sure Face ID/Touch ID/fingerprint is set up and try again, or open this page in Safari/Chrome (not from an in-app browser)."
  }
  return e.message || "Biometric setup failed"
}

function formatIp(ip: string | null): string | null {
  if (!ip) return null
  const v = ip.trim()
  if (!v) return null
  // Hide loopback / link-local addresses that aren't useful to the user.
  if (
    v === "::1" ||
    v === "127.0.0.1" ||
    v === "localhost" ||
    v.startsWith("fe80:") ||
    v.startsWith("169.254.")
  ) {
    return null
  }
  return v
}

// Minimal, deliberately conservative UA parser. We only show data we can
// recognize with high confidence; anything else falls back to "Browser".
// Avoids pulling in ua-parser-js (which has had supply-chain incidents).
function parseUA(ua: string): { os: string; browser: string; name: string } {
  const s = ua || ""
  // Order matters: iPad on iOS 13+ pretends to be Mac, so test mobile first.
  // Edge contains "Chrome" + "Safari"; Chrome contains "Safari"; etc.
  const os = /Windows NT 10\.0/.test(s)
    ? "Windows"
    : /Windows NT/.test(s)
      ? "Windows"
      : /iPad|iPhone|iPod/.test(s)
        ? "iOS"
        : /Android/.test(s)
          ? "Android"
          : /Mac OS X|Macintosh/.test(s)
            ? "macOS"
            : /CrOS/.test(s)
              ? "ChromeOS"
              : /Linux/.test(s)
                ? "Linux"
                : "Unknown"
  const browser = /Edg\//.test(s)
    ? "Edge"
    : /OPR\/|Opera/.test(s)
      ? "Opera"
      : /Firefox\//.test(s)
        ? "Firefox"
        : /Chrome\//.test(s)
          ? "Chrome"
          : /Safari\//.test(s)
            ? "Safari"
            : "Browser"
  return { os, browser, name: `${browser} on ${os}` }
}

function formatLocation(loc: unknown): string | null {
  if (loc == null) return null
  if (typeof loc === "string") return loc.trim() || null
  if (typeof loc !== "object") return null
  const o = loc as Record<string, unknown>
  const parts = [o.city, o.region, o.country]
    .map((v) => (typeof v === "string" && v.trim() ? v.trim() : null))
    .filter((v): v is string => v !== null)
  return parts.length ? parts.join(", ") : null
}

function relTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diff = Date.now() - then
  const sec = Math.round(diff / 1000)
  if (sec < 60) return "just now"
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}d ago`
  const mo = Math.round(day / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.round(mo / 12)}y ago`
}

/**
 * Short, device-accurate label for a passkey row. Prefers the actual device
 * (OS · browser) the enrollment is bound to; falls back to the WebAuthn
 * transport when no device record is available.
 */
function passkeyLabel(e: BiometricEnrollment): string {
  const os = prettyOs(e.device?.os)
  const browser = e.device?.browser?.trim() || null
  if (os && browser) return `${os} · ${browser}`
  if (os) return os
  if (browser) return browser
  const t = e.transports ?? []
  if (t.includes("hybrid")) return "Phone passkey"
  if (t.some((x) => x === "usb" || x === "nfc" || x === "ble")) return "Security key"
  return "This device"
}

/** Collapse a raw OS/user-agent string to a short, recognizable name. */
function prettyOs(os?: string | null): string | null {
  const s = (os ?? "").toLowerCase()
  if (!s) return null
  if (s.includes("windows")) return "Windows"
  if (s.includes("iphone") || s.includes("ios")) return "iPhone"
  if (s.includes("ipad")) return "iPad"
  if (s.includes("mac")) return "Mac"
  if (s.includes("android")) return "Android"
  if (s.includes("linux")) return "Linux"
  if (s.includes("chrome os") || s.includes("cros")) return "ChromeOS"
  // Unknown but non-empty — surface the first token capitalized.
  const first = (os ?? "").trim().split(/[\s/]+/)[0]
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : null
}

// ─── WebAuthn biometric enrollment ────────────────────────────────────────
// Hand-rolled to avoid pulling in @simplewebauthn/browser just for one flow.
// The backend (@simplewebauthn/server) emits and expects the standard
// base64url-encoded JSON shape.

type RegOptions = {
  challenge: string
  rp: { id?: string; name: string }
  user: { id: string; name: string; displayName: string }
  pubKeyCredParams: { type: "public-key"; alg: number }[]
  timeout?: number
  attestation?: AttestationConveyancePreference
  authenticatorSelection?: AuthenticatorSelectionCriteria
  excludeCredentials?: { id: string; type: "public-key"; transports?: AuthenticatorTransport[] }[]
}

async function enrollBiometric(currentDeviceId: string | null): Promise<void> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    throw new Error("This browser doesn't support biometric sign-in.")
  }
  // On phones the "unknown error" most often means there's no usable
  // platform authenticator — no Face ID/Touch ID configured, screen lock
  // disabled, or the page is being viewed in an in-app browser
  // (Instagram/WhatsApp/etc.) that doesn't expose WebAuthn. Pre-check so
  // we can show a useful message instead of letting the WebAuthn API
  // throw a bare DOMException.
  try {
    const available =
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
      "function"
        ? await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        : true
    if (!available) {
      throw new Error(
        "This device doesn't have biometric sign-in available. Set up Face ID/Touch ID/fingerprint or open this page in a different browser.",
      )
    }
  } catch (err) {
    // If the check itself throws (some in-app browsers), surface a hint.
    if (err instanceof Error && err.message.startsWith("This device")) throw err
    throw new Error(
      "This browser can't access biometric sign-in. If you opened this link from another app, try opening it in Safari or Chrome instead.",
    )
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
  if (!cred) throw new Error("Biometric registration was cancelled.")
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
  const deviceId = currentDeviceId ?? crypto.randomUUID()
  const result = await biometricRegisterFinish(deviceId, payload)
  if (!result.verified) throw new Error("Biometric verification failed.")
}

/**
 * Verifies an existing OS-level passkey (synced from another browser /
 * device, or orphaned by a previous toggle-off before soft-delete
 * existed) and binds it to the current device. Returns true on success,
 * false when the user has no passkey we can verify (caller should fall
 * back to a fresh enrollment). Cancellation throws — friendlyBiometricError
 * downstream swallows the user-cancel cases quietly.
 */
type AuthOptions = {
  challenge: string
  timeout?: number
  rpId?: string
  userVerification?: UserVerificationRequirement
  allowCredentials?: { id: string; type: "public-key"; transports?: AuthenticatorTransport[] }[]
}

async function tryRebindBiometric(deviceId: string): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false
  let options: AuthOptions
  try {
    options = (await biometricRebindBegin()) as AuthOptions
  } catch {
    return false
  }
  // No allowCredentials AND no discoverable-credentials flow means there's
  // nothing to rebind to — skip cleanly to fresh enrollment.
  if (!options.allowCredentials || options.allowCredentials.length === 0) {
    return false
  }
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: b64urlToBuf(options.challenge),
    timeout: options.timeout,
    rpId: options.rpId,
    userVerification: options.userVerification,
    allowCredentials: options.allowCredentials.map((c) => ({
      id: b64urlToBuf(c.id),
      type: c.type,
      transports: c.transports,
    })),
  }
  let cred: PublicKeyCredential | null
  try {
    cred = (await navigator.credentials.get({
      publicKey,
      signal: freshWebauthnSignal(),
    })) as PublicKeyCredential | null
  } catch (err) {
    // If the OS can't find any of the listed credentials it raises
    // NotAllowedError. That's not a real failure — it just means the
    // user has no synced passkey for State Bank here, so we fall through to
    // fresh enrollment without surfacing an error.
    const name = (err as Error & { name?: string })?.name ?? ""
    if (name === "NotAllowedError" || name === "AbortError") return false
    throw err
  }
  if (!cred) return false
  const assertion = cred.response as AuthenticatorAssertionResponse
  const payload = {
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
  }
  try {
    const result = await biometricRebindFinish(deviceId, payload)
    return result.verified === true
  } catch {
    return false
  }
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
