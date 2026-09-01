"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"
import { fetchMe } from "@/lib/auth/api/auth.real"
import { refreshTokens } from "@/lib/api/client"
import { useStore } from "@/lib/store"
import { getMyPreferences } from "@/lib/profile/api/preferences.real"
import { fetchFxRatesPerUsd } from "@/lib/fx/api/fx.real"
import { setLiveDisplayRates } from "@/lib/currency"

import { useMocks as USE_MOCKS } from "@/lib/dev/use-mocks-flag"

/**
 * On mount: replays the httpOnly refresh cookie against /auth/refresh to
 * recover the access token, then fetches /me. If anything fails the
 * session goes to `unauthenticated` and route guards take over.
 *
 * In mocks mode this is a no-op — existing demo flows still drive
 * `state.user` directly via StoreHydrator.
 */
export function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const setStatus = useStore((s) => s.setSessionStatus)
  const setUser = useStore((s) => s.setSessionUser)
  const setSessionId = useStore((s) => s.setSessionId)
  const setCustomerUser = useStore((s) => s.setUser)
  const setFxRatesAsOf = useStore((s) => s.setFxRatesAsOf)
  const { setTheme } = useTheme()

  useEffect(() => {
    if (USE_MOCKS) {
      setStatus("unauthenticated")
      return
    }
    let cancelled = false
    setStatus("loading")
    ;(async () => {
      try {
        const data = await refreshTokens()
        if (cancelled) return
        setSessionId(data.sessionId)

        const me = await fetchMe()
        if (cancelled) return
        setUser({
          id: me.id,
          email: me.email,
          firstName: me.firstName,
          lastName: me.lastName,
          role: me.role,
          novaTag: me.novaTag,
          phoneE164: me.phoneE164,
          avatarUrl: me.avatarUrl,
          status: me.status,
          securitySetupRequired: me.securitySetupRequired,
        })
        // Mirror onto the existing demo `user` slice so pages built before
        // WIRE-2 (profile, greeting, top bar) keep rendering the real user.
        setCustomerUser({
          name: `${me.firstName} ${me.lastName}`.trim(),
          novaTag: me.novaTag ?? "",
          memberSince: new Date().getFullYear().toString(),
          initials:
            (me.firstName?.[0] ?? "") + (me.lastName?.[0] ?? "") || "??",
          avatarUrl: me.avatarUrl,
        })
        setStatus("authenticated")

        // Load live FX rates so display-currency conversion matches the wire
        // flow's live rate. Non-fatal — the static fallbacks in lib/currency
        // (Gulf pegs exact, EUR/CNY approximate) keep amounts sensible if the
        // feed is unreachable.
        try {
          const fx = await fetchFxRatesPerUsd()
          if (!cancelled) {
            setLiveDisplayRates(fx.rates)
            setFxRatesAsOf(fx.asOf)
          }
        } catch {
          /* keep static fallback rates */
        }

        // Cross-device theme sync. Server pref wins so a user who picked
        // Dark on their phone sees Dark on the laptop the moment they
        // sign in. Failure is non-fatal — the local next-themes value
        // (driven by localStorage) keeps applying.
        try {
          const prefs = await getMyPreferences()
          if (!cancelled && prefs.theme) setTheme(prefs.theme)
        } catch {
          /* ignore — Appearance page will surface a real error if the user opens it */
        }
      } catch {
        if (!cancelled) setStatus("unauthenticated")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [setStatus, setUser, setSessionId, setCustomerUser, setTheme, setFxRatesAsOf])

  return <>{children}</>
}
