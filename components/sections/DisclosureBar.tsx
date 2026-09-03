"use client"
import { useEffect, useState } from "react"
import { Info, X } from "lucide-react"
import { BRAND_NAME } from "@/lib/brand"

export function DisclosureBar() {
  const [dismissed, setDismissed] = useState(false)
  const [pastHero, setPastHero] = useState(false)

  useEffect(() => {
    const hero = document.querySelector("section")
    if (!hero) return
    const onScroll = () => {
      const rect = hero.getBoundingClientRect()
      // Show only once the hero has scrolled mostly out of view
      setPastHero(rect.bottom <= window.innerHeight * 0.3)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  if (dismissed || !pastHero) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-flush/95 backdrop-blur-md">
      <div className="container flex items-center justify-between gap-4 py-3 text-[13px] text-white">
        <div className="flex items-center gap-2">
          <span>
            {BRAND_NAME} is the central bank and regulator of the
            financial sector in the Kingdom of Bahrain.
          </span>
          <button
            aria-label="More information"
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-white/70 hover:text-white"
          >
            <Info size={14} />
          </button>
        </div>
        <button
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
