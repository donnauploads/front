"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, X, Pencil, Check } from "lucide-react"
import { useStore } from "@/lib/store"
import type { SavingsGoal } from "@/lib/store"
import { formatMoney } from "@/lib/currency"
import {
  cn,
  formatNumericInput,
  unformatNumericInput,
  withMinDelay,
} from "@/lib/utils"
import { ApiError } from "@/lib/api/errors"
import {
  archiveGoal,
  contributeToGoal as apiContribute,
  updateGoal,
} from "@/lib/savings/api/savings.real"
import { useToast } from "@/components/providers/ToastProvider"

export function GoalDetailSheet({
  goal,
  onClose,
}: {
  goal: SavingsGoal | null
  onClose: () => void
}) {
  const contributeToGoal = useStore((s) => s.contributeToGoal)
  const upsertGoal = useStore((s) => s.upsertGoal)
  const deleteGoal = useStore((s) => s.deleteGoal)
  const accounts = useStore((s) => s.accounts)
  const currency = useStore((s) => s.displayCurrency)
  const { toast } = useToast()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState("")
  const [target, setTarget] = useState("")
  const [addAmount, setAddAmount] = useState("")
  const [busy, setBusy] = useState<"edit" | "contribute" | "delete" | null>(null)

  useEffect(() => {
    if (!goal) return
    setName(goal.name)
    setTarget(goal.target ? formatNumericInput(String(goal.target)) : "")
    setAddAmount("")
    setEditing(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [goal, onClose])

  if (!goal) return null

  const pct = goal.target ? Math.min(100, (goal.balance / goal.target) * 100) : null

  async function saveEdit() {
    if (!goal || busy) return
    const tNum = parseFloat(unformatNumericInput(target))
    setBusy("edit")
    try {
      const updated = await updateGoal(goal.id, {
        name: name.trim() || goal.name,
        target: Number.isFinite(tNum) && tNum > 0 ? tNum : null,
      })
      upsertGoal(updated)
      setEditing(false)
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't update goal", {
        variant: "error",
      })
    } finally {
      setBusy(null)
    }
  }

  async function contribute() {
    if (!goal || busy) return
    const n = parseFloat(unformatNumericInput(addAmount))
    if (!Number.isFinite(n) || n <= 0) return
    const checking = accounts.find((a) => a.type === "checking")
    if (!checking) {
      toast("You need a checking account to contribute.", { variant: "error" })
      return
    }
    setBusy("contribute")
    try {
      await apiContribute(goal.id, checking.id, n)
      // Update the store optimistically with the new running balance.
      contributeToGoal(goal.id, n)
      setAddAmount("")
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't contribute", {
        variant: "error",
      })
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    if (!goal || goal.isDefault || busy) return
    setBusy("delete")
    try {
      await archiveGoal(goal.id)
      deleteGoal(goal.id)
      onClose()
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't delete goal", {
        variant: "error",
      })
      setBusy(null)
    }
  }

  return (
    <AnimatePresence>
      {goal && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`${goal.name} goal`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-scrim"
        >
          <button
            aria-label="Close"
            onClick={onClose}
            className="modal-scrim-btn"
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="modal-card"
          >
            <div className="modal-grip" />

            <div className="modal-head">
              <div className="mh-l" style={{ flex: 1 }}>
                <div style={{ fontSize: 28, lineHeight: 1 }} aria-hidden>
                  {goal.emoji}
                </div>
                {editing ? (
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="docs-input"
                    style={{ flex: 1, cursor: "text" }}
                  />
                ) : (
                  <div className="modal-title">{goal.name}</div>
                )}
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="modal-x"
              >
                <X aria-hidden />
              </button>
            </div>

            <div style={{ marginTop: 18 }}>
              <div className="goal-amt">{formatMoney(goal.balance, currency)}</div>
              {(goal.target || editing) && (
                <div className="goal-amt-sub">
                  {editing ? (
                    <>
                      Target{" "}
                      <input
                        inputMode="decimal"
                        value={target}
                        onChange={(e) => setTarget(formatNumericInput(e.target.value))}
                        placeholder="1,000"
                        className="goal-amt-edit"
                      />
                    </>
                  ) : (
                    <>
                      of {formatMoney(goal.target!, currency)}
                    </>
                  )}
                </div>
              )}
            </div>

            {pct !== null && (
              <div style={{ marginTop: 16 }}>
                <div className="goal-track">
                  <span style={{ width: `${pct}%` }} />
                </div>
                <div
                  style={{
                    marginTop: 7,
                    textAlign: "right",
                    fontSize: 11.5,
                    color: "var(--ink-mute)",
                    fontWeight: 600,
                  }}
                >
                  {Math.round(pct)}%
                </div>
              </div>
            )}

            {/* Quick contribute */}
            <div className="modal-inset" style={{ marginTop: 18 }}>
              <div className="mi-label">Contribute</div>
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 9 }}>
                <div className="amt-group">
                  <span className="amt-cur">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="25.00"
                    value={addAmount}
                    onChange={(e) => setAddAmount(formatNumericInput(e.target.value))}
                  />
                </div>
                <button
                  type="button"
                  onClick={contribute}
                  disabled={busy === "contribute"}
                  className="lk-cta-btn primary compact"
                >
                  {busy === "contribute" ? (
                    <span className="lk-cta-spin" aria-hidden />
                  ) : (
                    <Plus width={18} height={18} aria-hidden />
                  )}
                  Add
                </button>
              </div>
            </div>

            {/* Edit / Delete actions */}
            <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10 }}>
              {editing ? (
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={busy === "edit"}
                  className="lk-cta-btn primary"
                  style={{ flex: 1 }}
                >
                  {busy === "edit" ? (
                    <span className="lk-cta-spin" aria-hidden />
                  ) : (
                    <Check width={18} height={18} strokeWidth={3} aria-hidden />
                  )}
                  Save changes
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="lk-cta-btn secondary"
                  style={{ flex: 1 }}
                >
                  <Pencil width={18} height={18} aria-hidden />
                  Edit
                </button>
              )}
              <button
                type="button"
                onClick={remove}
                disabled={goal.isDefault || busy === "delete"}
                className={cn(
                  "lk-cta-btn compact",
                  goal.isDefault ? "secondary" : "danger",
                )}
              >
                {busy === "delete" ? (
                  <span className="lk-cta-spin" aria-hidden />
                ) : (
                  <Trash2 width={18} height={18} aria-hidden />
                )}
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
