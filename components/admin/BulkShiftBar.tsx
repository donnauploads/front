"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { CalendarRange, X } from "lucide-react"
import { useStore } from "@/lib/store"
import { useToast } from "@/components/providers/ToastProvider"
import { bulkShift } from "@/lib/admin/api/transactions"
import { cn } from "@/lib/utils"

const PRESETS = [-30, -7, 7, 30] as const

export function BulkShiftBar({
  ids,
  onDone,
}: {
  ids: string[]
  onDone: () => void
}) {
  const bulk = useStore((s) => s.bulkShiftTxns)
  const { toast } = useToast()
  const [delta, setDelta] = useState<number>(7)
  const [custom, setCustom] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function apply() {
    const effective = custom.trim() ? parseInt(custom, 10) : delta
    if (Number.isNaN(effective) || effective === 0) {
      toast("Pick a non-zero shift.", { variant: "error" })
      return
    }
    if (reason.trim().length < 5) {
      toast("Reason is required (≥5 chars).", { variant: "error" })
      return
    }
    setSubmitting(true)
    const res = await bulkShift({
      ids,
      deltaDays: effective,
      reason,
      by: "superadmin@cbb.gov.bh",
    })
    setSubmitting(false)
    if (!res.ok) return
    bulk(ids, effective, reason, "superadmin@cbb.gov.bh")
    toast(
      `Shifted ${res.count} transaction${res.count === 1 ? "" : "s"} by ${effective > 0 ? "+" : ""}${effective}d.`,
      { variant: "success", duration: 2200 },
    )
    onDone()
  }

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      className="fixed inset-x-4 bottom-4 z-30 mx-auto max-w-3xl rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl ring-1 ring-white/10"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarRange className="h-4 w-4" aria-hidden />
          {ids.length} selected
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setDelta(p)
                setCustom("")
              }}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-semibold transition",
                !custom && delta === p
                  ? "bg-white text-slate-900"
                  : "text-white/80 hover:text-white",
              )}
            >
              {p > 0 ? "+" : ""}
              {p}d
            </button>
          ))}
        </div>

        <input
          type="number"
          placeholder="Custom"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="h-8 w-20 rounded-lg border border-white/20 bg-white/5 px-2 text-xs placeholder:text-white/40 focus:border-white/60 focus:outline-none"
        />

        <input
          type="text"
          placeholder="Reason (audit log)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="h-8 min-w-0 flex-1 rounded-lg border border-white/20 bg-white/5 px-2 text-xs placeholder:text-white/40 focus:border-white/60 focus:outline-none"
        />

        <button
          type="button"
          disabled={submitting}
          onClick={apply}
          className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50"
        >
          {submitting ? "Shifting…" : "Apply shift"}
        </button>
        <button
          type="button"
          onClick={onDone}
          aria-label="Clear selection"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </motion.div>
  )
}
