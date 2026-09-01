"use client"

import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle } from "lucide-react"
import { useStore } from "@/lib/store"
import { applyOverride } from "@/lib/admin/api/transactions"

export function BalanceGuardModal({
  open,
  onClose,
  info,
  canForce,
  onAcceptOffset,
  onAllowNegative,
}: {
  open: boolean
  onClose: () => void
  info: {
    accountLabel: string
    userName: string
    projectedBalance: number
    suggestedOffset?: { recordId: string; proposedAmount: number }
  } | null
  canForce: boolean
  onAcceptOffset: () => void
  onAllowNegative: () => void
}) {
  const txns = useStore((s) => s.adminTxns)
  const overrides = useStore((s) => s.txOverrides)
  const offsetRec = info?.suggestedOffset
    ? txns.find((t) => t.id === info.suggestedOffset!.recordId)
    : undefined
  const effOffset = offsetRec
    ? applyOverride(offsetRec, overrides[offsetRec.id])
    : null

  return (
    <AnimatePresence>
      {open && info && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900">
                  Balance would go negative
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  This change would make {info.userName}&apos;s {info.accountLabel}{" "}
                  balance{" "}
                  <span className="font-mono font-semibold text-rose-700">
                    {info.projectedBalance.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </span>
                  . We can offset with another transaction to keep the books
                  clean.
                </p>
              </div>
            </div>

            {effOffset && info.suggestedOffset && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  Suggested offset
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">
                      {effOffset.effective.description}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      {effOffset.id}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-slate-400 line-through">
                      {effOffset.effective.amount.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </div>
                    <div className="text-emerald-700">
                      {info.suggestedOffset.proposedAmount.toLocaleString(
                        "en-US",
                        { style: "currency", currency: "USD" },
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onAllowNegative}
                disabled={!canForce}
                title={
                  canForce
                    ? "Apply and let the balance go negative."
                    : "Superadmin only"
                }
                className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-white"
              >
                Allow negative anyway
              </button>
              {effOffset && info.suggestedOffset && (
                <button
                  type="button"
                  onClick={onAcceptOffset}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Accept offset
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
