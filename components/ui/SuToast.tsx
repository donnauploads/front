"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * The design's `.su-toast` — a solid-red top banner that slides down
 * from off-screen and auto-dismisses. Ported from the signup wizard's
 * wrong-code error, generalised so login / mfa / future routes can
 * surface short error messages without duplicating state machinery.
 *
 * Usage:
 *
 *   const { message, show } = useSuToast()
 *   ...
 *   show("That code didn't match.")
 *   ...
 *   return (<>
 *     <SuToast message={message} />
 *     ...rest of page
 *   </>)
 *
 * Styles live in `app/globals.css` (`.su-toast` / `.su-toast.show`).
 */

const DEFAULT_DURATION_MS = 3400

export function useSuToast(durationMs: number = DEFAULT_DURATION_MS) {
  const [message, setMessage] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  const show = useCallback(
    (msg: string) => {
      setMessage(msg)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(
        () => setMessage(null),
        durationMs,
      )
    },
    [durationMs],
  )

  const dismiss = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    setMessage(null)
  }, [])

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  return { message, show, dismiss }
}

export function SuToast({
  message,
  className,
}: {
  message: string | null
  className?: string
}) {
  if (!message) return null
  return (
    <div
      className={cn("su-toast show", className)}
      role="alert"
      aria-live="polite"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <span>{message}</span>
    </div>
  )
}
