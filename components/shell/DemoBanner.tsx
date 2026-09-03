"use client"

import { useEffect, useState } from "react"
import { Info, X } from "lucide-react"
import { useStore } from "@/lib/store"
import { BRAND_NAME } from "@/lib/brand"

export function DemoBanner() {
  const dismissed = useStore((s) => s.prefs.demoBannerDismissed)
  const dismiss = useStore((s) => s.dismissDemoBanner)

  // Avoid SSR/CSR mismatch on the persisted flag
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  if (!hydrated || dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[100] flex items-center justify-between gap-3 bg-brand-deep px-4 py-2 text-[12px] font-medium text-white sm:text-[13px]"
    >
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 flex-shrink-0 text-fern" aria-hidden />
        <span>
          {BRAND_NAME}, the central bank and regulator of the Kingdom of Bahrain.
        </span>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss demo banner"
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
