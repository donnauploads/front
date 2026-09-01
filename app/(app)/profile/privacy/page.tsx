"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ExternalLink, Loader2 } from "lucide-react"
import { ProfileSubPage } from "@/components/profile/ProfileSubPage"
import { Toast } from "@/components/ui/Toast"
import { ApiError } from "@/lib/api/errors"
import {
  getMyPreferences,
  updateMyPreferences,
  type UpdatePreferencesBody,
  type UserPreferenceDto,
} from "@/lib/profile/api/preferences.real"

type ToggleKey = "doNotSell" | "marketingData" | "analytics" | "shareContacts"

const TOGGLES: { key: ToggleKey; label: string; body: string }[] = [
  {
    key: "doNotSell",
    label: "Do not sell or share my personal information",
    body: "Opt out of targeted advertising and data sharing for advertising.",
  },
  {
    key: "marketingData",
    label: "Use my data for product marketing",
    body: "Lets us tailor offers and product recommendations to you.",
  },
  {
    key: "analytics",
    label: "Help improve State Bank with analytics",
    body: "Anonymous usage data that helps us prioritize what to build next.",
  },
  {
    key: "shareContacts",
    label: "Sync phone contacts",
    body: "Required to send money to friends via $tag, phone, or email.",
  },
]

export default function PrivacySettingsPage() {
  const [prefs, setPrefs] = useState<UserPreferenceDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<ToggleKey | null>(null)
  const [toastState, setToastState] = useState({ open: false, msg: "" })
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function flash(msg: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    // Suppress + remount so AnimatePresence re-runs the enter animation
    // even when the message is identical to the previous one.
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
    getMyPreferences()
      .then((p) => {
        if (cancelled) return
        setPrefs(p)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof ApiError ? e.message : "Couldn't load privacy settings.",
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function flip(key: ToggleKey) {
    if (!prefs || savingKey) return
    const next = !prefs[key]
    const snapshot = prefs
    setPrefs({ ...prefs, [key]: next })
    setSavingKey(key)
    try {
      const saved = await updateMyPreferences({
        [key]: next,
      } as UpdatePreferencesBody)
      setPrefs(saved)
      flash("Settings updated")
    } catch (e) {
      setPrefs(snapshot)
      flash(e instanceof ApiError ? e.message : "Couldn't save that change")
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <ProfileSubPage
      title="Privacy"
      subtitle="How your data is shared, used, and protected."
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
          <Loader2
            className="animate-spin"
            width={16}
            height={16}
            aria-hidden
          />
          Loading your privacy settings…
        </div>
      ) : error ? (
        <div className="card-error" role="alert">
          {error}
        </div>
      ) : prefs ? (
        <div className="panel">
          <div className="panel-body">
            {TOGGLES.map((t) => (
              <div className="set-row" key={t.key}>
                <div className="sr-l">
                  <div className="sn">{t.label}</div>
                  <div className="sd">{t.body}</div>
                </div>
                <Switch
                  on={prefs[t.key]}
                  busy={savingKey === t.key}
                  onClick={() => void flip(t.key)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="pf-group">Documentation</div>
      <div className="panel">
        <div className="panel-body">
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener"
            className="move-row"
          >
            <span className="mr-ic">
              <ExternalLink strokeWidth={2} aria-hidden />
            </span>
            <span className="mr-body">
              <span className="mr-title">Read the full Privacy Notice</span>
              <span className="mr-sub">Opens in a new tab.</span>
            </span>
            <ExternalLink className="mr-chev" aria-hidden />
          </Link>
        </div>
      </div>

      <Toast open={toastState.open} message={toastState.msg} />
    </ProfileSubPage>
  )
}

/**
 * Design's `.switch` toggle — `<label>` containing the hidden checkbox
 * and the `.track` span. CSS owns the gold-deep fill + 21px thumb
 * translation. Optional busy spinner sits to the left so width stays
 * constant.
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
  )
}
