"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Loader2, Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { ProfileSubPage } from "@/components/profile/ProfileSubPage"
import { useToast } from "@/components/providers/ToastProvider"
import { ApiError } from "@/lib/api/errors"
import {
  getMyPreferences,
  updateMyPreferences,
  type ThemePref,
} from "@/lib/profile/api/preferences.real"
import { cn } from "@/lib/utils"

const OPTIONS = [
  { id: "light" as const, label: "Light", body: "Bright and crisp.", Icon: Sun },
  {
    id: "dark" as const,
    label: "Dark",
    body: "Easy on the eyes at night.",
    Icon: Moon,
  },
  {
    id: "system" as const,
    label: "System",
    body: "Follow your device setting automatically.",
    Icon: Monitor,
  },
] as const

export default function AppearancePage() {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  // Avoid SSR mismatch — only render the selected indicator on the client.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Server theme is the source of truth across devices. We hydrate
  // next-themes from the server once on mount; after the first user
  // tap we lock the reconciliation off so a late-resolving fetch can't
  // override the optimistic flip (that was the "flicker → revert" bug).
  const [serverLoaded, setServerLoaded] = useState(false)
  const [pendingId, setPendingId] = useState<ThemePref | null>(null)
  const userInteractedRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<ThemePref | null>(null)

  useEffect(() => {
    let cancelled = false
    getMyPreferences()
      .then((prefs) => {
        if (cancelled || userInteractedRef.current) return
        if (prefs.theme !== theme) setTheme(prefs.theme)
        lastSavedRef.current = prefs.theme
        setServerLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setServerLoaded(true)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persist = useCallback(
    (next: ThemePref) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      setPendingId(next)
      saveTimerRef.current = setTimeout(async () => {
        try {
          await updateMyPreferences({ theme: next })
          lastSavedRef.current = next
        } catch (err) {
          toast(
            err instanceof ApiError
              ? err.message || "Couldn't save your theme."
              : "Couldn't save your theme. Check your connection.",
            { variant: "error", duration: 2400 },
          )
          // Roll the local theme back to the last value we confirmed
          // landed on the server.
          if (lastSavedRef.current) setTheme(lastSavedRef.current)
        } finally {
          setPendingId((p) => (p === next ? null : p))
        }
      }, 320)
    },
    [setTheme, toast],
  )

  // Drive the visible "selected" state from our own ref-backed value
  // instead of trusting next-themes' context — that context can lag a
  // tick on system→light/dark resolution and was causing the checkmark
  // to flicker between the old and new option.
  const [selected, setSelected] = useState<ThemePref>("dark")
  useEffect(() => {
    if (!mounted) return
    if (!userInteractedRef.current) {
      setSelected(((theme ?? "system") as ThemePref))
    }
  }, [mounted, theme])

  function onPick(id: ThemePref) {
    if (id === selected) return
    userInteractedRef.current = true
    setSelected(id)
    setTheme(id)
    persist(id)
  }

  const value: ThemePref = mounted ? selected : "dark"

  return (
    <ProfileSubPage
      title="Appearance"
      subtitle="Pick the look that fits your eyes today."
    >
      <div className="theme-grid" role="radiogroup" aria-label="Appearance">
        {OPTIONS.map((opt) => {
          const active = value === opt.id
          const saving = pendingId === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onPick(opt.id)}
              className={cn("theme-opt", active && "selected")}
            >
              <span className="theme-ic" aria-hidden>
                <opt.Icon />
              </span>
              <span className="to-body">
                <span className="to-name">{opt.label}</span>
                <span className="to-desc">{opt.body}</span>
              </span>
              <span className="theme-check" aria-hidden>
                {saving ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Check strokeWidth={3} />
                )}
              </span>
            </button>
          )
        })}
      </div>
      <p className="theme-note">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 2 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-4Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        {serverLoaded
          ? "Your theme is saved to your account and applied on every device you sign in to."
          : "Loading your saved theme…"}
      </p>
    </ProfileSubPage>
  )
}
