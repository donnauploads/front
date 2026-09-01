"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { ProfileSubPage } from "@/components/profile/ProfileSubPage"
import { Toast } from "@/components/ui/Toast"
import { ApiError } from "@/lib/api/errors"
import {
  fetchPreferences,
  updatePreferences,
  type NotificationPreferences,
  type UpdatePreferencesInput,
} from "@/lib/notifications/api/preferences.real"

type ToggleKey =
  | "txAll"
  | "txLargeOnly"
  | "securityAlerts"
  | "marketingEmail"
  | "marketingPush"

type GroupDef = {
  title: string
  items: {
    key: ToggleKey
    label: string
    body?: string
  }[]
}

const GROUPS: GroupDef[] = [
  {
    title: "Transactions",
    items: [
      {
        key: "txAll",
        label: "Every card swipe",
        body: "Push for every purchase, no matter the size.",
      },
      {
        key: "txLargeOnly",
        label: "Large purchases only",
        body: "Quiet for small swipes, ping for big ones (threshold below).",
      },
    ],
  },
  {
    title: "Security",
    items: [
      {
        key: "securityAlerts",
        label: "Security alerts",
        body: "New device sign-in, password changes, and card freezes.",
      },
    ],
  },
  {
    title: "Marketing",
    items: [
      {
        key: "marketingEmail",
        label: "Promotional email",
        body: "Cash-back offers, referral updates, partner deals.",
      },
      {
        key: "marketingPush",
        label: "Product announcements",
        body: "Push notifications for product launches and updates.",
      },
    ],
  },
]

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<ToggleKey | null>(null)
  const [thresholdDraft, setThresholdDraft] = useState("")
  const [savingThreshold, setSavingThreshold] = useState(false)
  const [toastState, setToastState] = useState({ open: false, msg: "" })
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function flash(msg: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    // Suppress the current toast, then mount a fresh one on the next tick
    // so AnimatePresence runs the exit + enter animation cleanly even
    // when the message is identical.
    setToastState({ open: false, msg: "" })
    requestAnimationFrame(() => {
      setToastState({ open: true, msg })
      toastTimerRef.current = setTimeout(
        () => setToastState({ open: false, msg: "" }),
        3500,
      )
    })
  }

  useEffect(() => {
    let cancelled = false
    fetchPreferences()
      .then((p) => {
        if (cancelled) return
        setPrefs(p)
        setThresholdDraft(centsToDollars(p.txLargeThresholdCents))
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof ApiError
            ? e.message
            : "Couldn't load your notification preferences.",
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function flipToggle(key: ToggleKey) {
    if (!prefs || savingKey) return
    const next = !prefs[key]
    const optimistic = { ...prefs, [key]: next }
    setPrefs(optimistic)
    setSavingKey(key)
    try {
      const saved = await updatePreferences({ [key]: next } as UpdatePreferencesInput)
      setPrefs(saved)
      flash("Settings updated")
    } catch (e) {
      // Rollback.
      setPrefs(prefs)
      flash(e instanceof ApiError ? e.message : "Couldn't save that change")
    } finally {
      setSavingKey(null)
    }
  }

  async function saveThreshold() {
    if (!prefs || savingThreshold) return
    const dollars = parseFloat(thresholdDraft.replace(/,/g, ""))
    if (!Number.isFinite(dollars) || dollars < 0) {
      flash("Enter a positive amount")
      return
    }
    const cents = String(Math.round(dollars * 100))
    if (cents === prefs.txLargeThresholdCents) return
    setSavingThreshold(true)
    const snapshot = prefs
    setPrefs({ ...prefs, txLargeThresholdCents: cents })
    try {
      const saved = await updatePreferences({ txLargeThresholdCents: cents })
      setPrefs(saved)
      setThresholdDraft(centsToDollars(saved.txLargeThresholdCents))
      flash("Settings updated")
    } catch (e) {
      setPrefs(snapshot)
      setThresholdDraft(centsToDollars(snapshot.txLargeThresholdCents))
      flash(e instanceof ApiError ? e.message : "Couldn't save the threshold")
    } finally {
      setSavingThreshold(false)
    }
  }

  return (
    <ProfileSubPage
      title="Notifications"
      subtitle="Choose what we ping you about and what stays quiet."
    >
      {loading ? (
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
          Loading your preferences…
        </div>
      ) : error ? (
        <div className="card-error" role="alert">
          {error}
        </div>
      ) : prefs ? (
        <>
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="pf-group">{g.title}</div>
              <div className="panel">
                <div className="panel-body">
                  {g.items.map((it) => (
                    <div className="set-row" key={it.key}>
                      <div className="sr-l">
                        <div className="sn">{it.label}</div>
                        {it.body && <div className="sd">{it.body}</div>}
                      </div>
                      <Switch
                        on={prefs[it.key]}
                        busy={savingKey === it.key}
                        onClick={() => void flipToggle(it.key)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Threshold input attaches under the Transactions section. */}
              {g.title === "Transactions" && (
                <div className="panel" style={{ marginTop: 10 }}>
                  <div className="panel-body">
                    <div className="set-row" style={{ borderBottom: 0 }}>
                      <div className="sr-l">
                        <div className="sn">Large-transaction threshold</div>
                        <div className="sd">
                          Only ping for purchases above this amount.
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "8px 12px",
                            border: "1.5px solid var(--line)",
                            borderRadius: 6,
                            background: "var(--surface-2)",
                            minWidth: 140,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "var(--ink-mute)",
                            }}
                          >
                            $
                          </span>
                          <input
                            inputMode="decimal"
                            value={thresholdDraft}
                            onChange={(e) =>
                              setThresholdDraft(
                                e.target.value.replace(/[^0-9.]/g, ""),
                              )
                            }
                            onBlur={() => void saveThreshold()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                ;(e.target as HTMLInputElement).blur()
                              }
                            }}
                            style={{
                              flex: 1,
                              minWidth: 60,
                              background: "transparent",
                              border: 0,
                              outline: "none",
                              fontFamily: "var(--sans)",
                              fontSize: 14,
                              fontWeight: 600,
                              color: "var(--text-strong)",
                              fontVariantNumeric: "tabular-nums",
                            }}
                            aria-label="Large-transaction threshold in dollars"
                          />
                        </div>
                        {savingThreshold && (
                          <Loader2
                            className="animate-spin"
                            width={16}
                            height={16}
                            aria-hidden
                            style={{ color: "var(--ink-mute)" }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      ) : null}

      <Toast open={toastState.open} message={toastState.msg} />
    </ProfileSubPage>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function centsToDollars(s: string): string {
  const n = Number(s) / 100
  if (!Number.isFinite(n)) return "0"
  return n.toFixed(2)
}

/**
 * Design's `.switch` toggle — `<label>` containing the hidden
 * checkbox and the `.track` span. The track flips to gold-deep + the
 * 21px thumb translates 21px when the input is checked, all via CSS.
 * The optional busy spinner sits to the left of the track so the toggle
 * width stays stable across loading states.
 */
function Switch({
  on,
  busy,
  onClick,
}: {
  on: boolean
  busy?: boolean
  onClick: () => void
}) {
  return (
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
      <label
        className="switch"
        aria-label={on ? "Toggle on" : "Toggle off"}
      >
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
  )
}
