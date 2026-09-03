"use client"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, ArrowRight, Star, Apple, MessageCircle, ShieldCheck } from "lucide-react"
import { BRAND_NAME } from "@/lib/brand"

function PlayStoreIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 24" fill="none" aria-hidden>
      <path d="M1 1.5v21l11-10.5L1 1.5z" fill="#0D4029" />
      <path d="M12 12l4-3.5 5 3-9 5.5V12z" fill="#1EC677" />
      <path d="M12 12l9-5.5-5-3-4 3.5V12z" fill="#3CCD88" />
      <path d="M1 22.5l11-10.5-11-10.5v21z" fill="#0D4029" />
    </svg>
  )
}

function SourceBadge({ source }: { source: string }) {
  const lower = source.toLowerCase()
  let Icon: React.ReactNode = null
  if (lower.includes("app store")) Icon = <Apple size={14} fill="currentColor" />
  else if (lower.includes("play")) Icon = <PlayStoreIcon />
  else if (lower.includes("reddit")) Icon = <MessageCircle size={14} />
  else if (lower.includes("trustpilot")) Icon = <ShieldCheck size={14} />
  return (
    <div className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-kale/60">
      <span>{source}</span>
      {Icon}
    </div>
  )
}

const testimonials = [
  {
    source: "App Store",
    body: `Switched from a legacy bank after a billing mistake, ${BRAND_NAME} refunded me in under a minute and shipped a replacement card the next day. I'm not going back.`,
  },
  {
    source: "Play Store",
    body: "Getting paid two days early changed how I budget. Rent doesn't feel like a deadline anymore, it feels like a Tuesday.",
  },
  {
    source: "Reddit",
    body: "The SafetyNet feature has saved me from overdraft three times this year. No fees, no shame popup. Just covers me and reminds me later.",
  },
  {
    source: "App Store",
    body: `My credit jumped 84 points in nine months using the ${BRAND_NAME} credit builder. No annual fee, no interest, no nonsense.`,
  },
  {
    source: "App Store",
    body: `I freelance across three currencies and ${BRAND_NAME} is the first app that doesn't punish me with FX spreads. Mid-market rates, no drama.`,
  },
  {
    source: "Trustpilot",
    body: "Chatted with a real person at 2am about a sketchy charge. Sorted in five minutes. I've worked support, that's a good team.",
  },
  {
    source: "Play Store",
    body: "Round-ups have quietly stacked $1,200 into my Tokyo fund without me noticing. That's the magic.",
  },
  {
    source: "Reddit",
    body: "Their virtual cards are the cleanest I've used, freeze, regenerate, region-lock in two taps.",
  },
]

function usePerPage() {
  const [perPage, setPerPage] = useState(1)
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      setPerPage(w >= 1024 ? 4 : w >= 640 ? 2 : 1)
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])
  return perPage
}

export function Testimonials() {
  const perPage = usePerPage()
  const totalPages = Math.max(1, Math.ceil(testimonials.length / perPage))
  const [page, setPage] = useState(0)

  // Clamp page when perPage changes
  useEffect(() => {
    if (page > totalPages - 1) setPage(0)
  }, [perPage, totalPages, page])

  const slice = testimonials.slice(page * perPage, page * perPage + perPage)

  return (
    <section className="bg-white pb-24 pt-8">
      <div className="container">
        <h2 className="text-center font-display text-4xl font-bold tracking-tight text-kale sm:text-5xl">
          Hear from our members
        </h2>

        <div className="relative mt-12">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${page}-${perPage}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4 }}
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            >
              {slice.map((t, i) => (
                <article
                  key={i}
                  className="flex flex-col gap-4 rounded-2xl bg-lettuce p-6 text-kale shadow-[0_8px_24px_-12px_rgba(13,64,41,0.15)]"
                >
                  <div className="flex gap-0.5 text-kale">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} size={14} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-[15px] leading-relaxed">"{t.body}"</p>
                  <SourceBadge source={t.source} />
                </article>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-10 flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => (p - 1 + totalPages) % totalPages)}
            className="grid h-10 w-10 place-items-center rounded-full text-kale hover:bg-kale/10"
            aria-label="Previous"
          >
            <ArrowLeft size={18} />
          </button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === page ? "w-6 bg-fern" : "w-1.5 bg-kale/30"
              }`}
            />
          ))}
          <button
            onClick={() => setPage((p) => (p + 1) % totalPages)}
            className="grid h-10 w-10 place-items-center rounded-full text-kale hover:bg-kale/10"
            aria-label="Next"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  )
}
