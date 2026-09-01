"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { X, Tag, CalendarClock } from "lucide-react"
import { demoDeals, type Deal } from "@/lib/fixtures/deals"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Toast } from "@/components/ui/Toast"

export default function DealsTab() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 md:px-6 md:py-8">
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
        Deals
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Cash back at the places you already shop.
      </p>

      <Unlocked />
    </div>
  )
}

/* ---------- Unlocked ---------- */

function Unlocked() {
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)
  const [toast, setToast] = useState({ open: false, msg: "" })
  const activated = useStore((s) => s.activatedDealIds)
  const toggleDeal = useStore((s) => s.toggleDeal)

  function flash(msg: string) {
    setToast({ open: true, msg })
    setTimeout(() => setToast({ open: false, msg: "" }), 3500)
  }

  const featured = demoDeals[0]
  const rest = demoDeals.slice(1)

  return (
    <>
      {/* Featured strip */}
      <Link
        href="#"
        onClick={(e) => {
          e.preventDefault()
          setActiveDeal(featured)
        }}
        className={cn(
          "mt-5 flex items-center justify-between rounded-3xl bg-gradient-to-br p-5 ring-1 ring-white/10 transition hover:ring-fern/40",
          featured.gradient,
        )}
      >
        <div className="max-w-[70%]">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-white/80">
            Featured · {featured.expires} left
          </div>
          <div className="mt-1 font-display text-xl font-bold text-white">
            {featured.cashbackPct}% back at {featured.merchant}
          </div>
          <div className="mt-1 text-xs text-white/80 line-clamp-2">
            {featured.body}
          </div>
        </div>
        <div className="font-display text-4xl font-bold text-white">
          {featured.cashbackPct}%
        </div>
      </Link>

      {/* Grid */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rest.map((d) => {
          const isOn = activated.includes(d.id)
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setActiveDeal(d)}
              className={cn(
                "relative flex aspect-square flex-col justify-between rounded-2xl bg-gradient-to-br p-3 text-left ring-1 ring-white/10 transition hover:ring-fern/40",
                d.gradient,
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white backdrop-blur">
                  {d.short}
                </div>
                {isOn && (
                  <span className="rounded-full bg-fern px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-flush">
                    Added
                  </span>
                )}
              </div>
              <div>
                <div className="font-display text-2xl font-bold text-white">
                  {d.cashbackPct}%
                </div>
                <div className="text-[11px] font-semibold text-white/85">
                  {d.merchant}
                </div>
                <div className="text-[10px] text-white/65">
                  {d.category} · {d.expires} left
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <DealDetailSheet
        deal={activeDeal}
        onClose={() => setActiveDeal(null)}
        activatedIds={activated}
        onToggle={(d) => {
          const wasOn = activated.includes(d.id)
          toggleDeal(d.id)
          flash(wasOn ? `${d.merchant} removed` : `${d.merchant} added to card`)
        }}
      />

      <Toast open={toast.open} message={toast.msg} />
    </>
  )
}

function DealDetailSheet({
  deal,
  onClose,
  activatedIds,
  onToggle,
}: {
  deal: Deal | null
  onClose: () => void
  activatedIds: string[]
  onToggle: (d: Deal) => void
}) {
  useEffect(() => {
    if (!deal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [deal, onClose])

  const isOn = deal ? activatedIds.includes(deal.id) : false

  return (
    <AnimatePresence>
      {deal && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`${deal.merchant} offer`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
        >
          <button
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl bg-flush ring-1 ring-white/10 sm:rounded-3xl"
          >
            <div
              className={cn(
                "relative bg-gradient-to-br px-6 pt-6 pb-8",
                deal.gradient,
              )}
            >
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white transition hover:bg-black/50"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white backdrop-blur ring-1 ring-white/20">
                  {deal.short}
                </div>
                <div className="font-display text-xl font-bold text-white">
                  {deal.merchant}
                </div>
              </div>
              <div className="mt-4 font-display text-5xl font-bold leading-none text-white">
                {deal.cashbackPct}%
                <span className="ml-1 text-xl font-semibold text-white/80">
                  back
                </span>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <p className="text-sm leading-relaxed text-ink/90">{deal.body}</p>

              <div className="grid grid-cols-2 gap-2">
                <Info label="Category" value={deal.category} Icon={Tag} />
                <Info
                  label="Expires in"
                  value={deal.expires}
                  Icon={CalendarClock}
                />
              </div>

              <div className="rounded-xl bg-white/[0.03] p-3 text-[11px] leading-relaxed text-ink-muted ring-1 ring-white/5">
                <strong className="font-semibold text-ink/85">Terms:</strong>{" "}
                {deal.terms}
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/10">
                <div>
                  <div className="text-sm font-semibold text-ink">
                    Add to card
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    Auto-applies at checkout when you pay with State Bank.
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isOn}
                  onClick={() => onToggle(deal)}
                  className={cn(
                    "relative h-6 w-11 flex-shrink-0 rounded-full transition",
                    isOn ? "bg-fern" : "bg-slate-300 dark:bg-white/15",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-slate-900/10 transition-all",
                      isOn ? "left-[22px]" : "left-0.5",
                    )}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Info({
  label,
  value,
  Icon,
}: {
  label: string
  value: string
  Icon: typeof Tag
}) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-ink-muted">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-ink">{value}</div>
    </div>
  )
}
