"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useStore } from "@/lib/store"

/**
 * Post-sign-in spinner gate. Blocks the dashboard chrome until BOTH a
 * minimum brand pause has elapsed AND the data queries have settled, so we
 * never reveal stale numbers. Only arms on a true sign-in transition; a
 * refresh on an already-authenticated tab skips it.
 */
const MIN_SPINNER_MS = 3000

/**
 * The branded full-screen loader (paper backdrop + gold spinner). Shared by
 * the post-sign-in gate below AND the dashboard layout's session-bootstrap
 * phase, so the user never sees the bare green body behind the chrome.
 */
export function DashboardLoadingScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1500,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "var(--paper, #F2EEE5)",
      }}
    >
      <Loader2
        aria-hidden
        width={36}
        height={36}
        className="animate-spin"
        style={{ color: "var(--gold-deep, #97793A)" }}
      />
      <div
        style={{
          fontFamily: "var(--sans, system-ui)",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: "var(--ink-mute, #8A857B)",
          textTransform: "uppercase",
        }}
      >
        Loading your dashboard…
      </div>
    </div>
  )
}

export function SignInLoaderGate({ children }: { children: React.ReactNode }) {
  const status = useStore((s) => s.session.status)
  const accountsStatus = useStore((s) => s.data.accountsStatus)
  const transactionsStatus = useStore((s) => s.data.transactionsStatus)

  const [armed, setArmed] = useState(false)
  const [minElapsed, setMinElapsed] = useState(false)

  useEffect(() => {
    if (status === "authenticated" && !armed) {
      // "Fresh sign-in" heuristic: both data queries are still pre-fetch.
      if (accountsStatus !== "ready" && transactionsStatus !== "ready") {
        setArmed(true)
        setMinElapsed(false)
        const t = setTimeout(() => setMinElapsed(true), MIN_SPINNER_MS)
        return () => clearTimeout(t)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const dataReady =
    (accountsStatus === "ready" || accountsStatus === "error") &&
    (transactionsStatus === "ready" || transactionsStatus === "error")

  const showSpinner = armed && (!minElapsed || !dataReady)

  useEffect(() => {
    if (armed && minElapsed && dataReady) setArmed(false)
  }, [armed, minElapsed, dataReady])

  if (showSpinner) {
    return <DashboardLoadingScreen />
  }

  return <>{children}</>
}
