"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const THRESHOLD = 70 // px to trigger refresh
const MAX_PULL = 110 // px clamp on visual stretch

/**
 * Lightweight pull-to-refresh wrapper. Activates only on touch devices
 * when scrolled to top. Fires `onRefresh` once the user pulls past the
 * threshold and releases; awaits the promise then resets.
 */
export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void> | void
  children: React.ReactNode
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef<number | null>(null)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    function atTop() {
      // Triggered only when the *document* is at scroll position 0
      return window.scrollY <= 0
    }

    function onStart(e: TouchEvent) {
      if (!atTop() || refreshing) return
      startYRef.current = e.touches[0].clientY
    }
    function onMove(e: TouchEvent) {
      if (startYRef.current == null) return
      const dy = e.touches[0].clientY - startYRef.current
      if (dy <= 0) {
        setPull(0)
        return
      }
      // Resistance: tanh-style smoothing
      const stretched = Math.min(MAX_PULL, dy * 0.5)
      setPull(stretched)
    }
    async function onEnd() {
      if (startYRef.current == null) return
      startYRef.current = null
      if (pull >= THRESHOLD) {
        setRefreshing(true)
        try {
          await onRefresh()
        } finally {
          setPull(0)
          setRefreshing(false)
        }
      } else {
        setPull(0)
      }
    }

    el.addEventListener("touchstart", onStart, { passive: true })
    el.addEventListener("touchmove", onMove, { passive: true })
    el.addEventListener("touchend", onEnd)
    return () => {
      el.removeEventListener("touchstart", onStart)
      el.removeEventListener("touchmove", onMove)
      el.removeEventListener("touchend", onEnd)
    }
  }, [pull, refreshing, onRefresh])

  const active = pull >= THRESHOLD
  const showSpinner = refreshing || pull > 8

  return (
    <div ref={wrapRef} className="relative">
      {/* Spinner overlay */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none flex items-center justify-center overflow-hidden transition-[height] duration-150",
          showSpinner ? "" : "h-0",
        )}
        style={{ height: refreshing ? 48 : Math.min(pull, 48) }}
      >
        <Loader2
          className={cn(
            "h-5 w-5 text-fern transition",
            (refreshing || active) && "animate-spin",
          )}
          aria-hidden
        />
      </div>
      <div
        style={{ transform: refreshing ? "none" : `translateY(${pull * 0.4}px)` }}
        className="transition-transform duration-100"
      >
        {children}
      </div>
    </div>
  )
}
