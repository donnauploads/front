"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GripVertical, X } from "lucide-react"
import { useStore } from "@/lib/store"
import type { SplitAllocation } from "@/lib/store"
import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api/errors"
import { updateAutosave } from "@/lib/savings/api/savings.real"
import { useToast } from "@/components/providers/ToastProvider"

type Mode = "%" | "$"
type Tab = "split" | "roundups"

const ASSUMED_PAYCHECK = 2148.93 // demo paycheck — for $ ↔ % conversion

export function AutosaveModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const goals = useStore((s) => s.goals)
  const autosave = useStore((s) => s.autosave)
  const setAutosave = useStore((s) => s.setAutosave)
  const accounts = useStore((s) => s.accounts)
  const { toast } = useToast()

  const [tab, setTab] = useState<Tab>("split")
  const [mode, setMode] = useState<Mode>("%")
  const [splits, setSplits] = useState<SplitAllocation[]>(autosave.split)
  const [dragId, setDragId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [roundUpsOn, setRoundUpsOn] = useState(autosave.roundUpsEnabled)

  useEffect(() => {
    if (!open) return
    // First-time setup: if there are no saved splits but the user has goals,
    // seed an even split so the modal isn't empty.
    if (autosave.split.length === 0 && goals.length > 0) {
      const even = Math.floor(100 / goals.length)
      const drift = 100 - even * goals.length
      setSplits(
        goals.map((g, i) => ({
          id: g.id,
          label: g.name,
          emoji: g.emoji,
          percent: even + (i === 0 ? drift : 0),
        })),
      )
    } else {
      setSplits(autosave.split)
    }
    setRoundUpsOn(autosave.roundUpsEnabled)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, autosave, goals, onClose])

  const total = useMemo(
    () => splits.reduce((s, a) => s + a.percent, 0),
    [splits],
  )

  // Update one slot's percent, then rebalance the remaining slots proportionally
  // so the total always sums to 100.
  function setPercent(id: string, next: number) {
    setSplits((prev) => {
      const clamped = Math.max(0, Math.min(100, Math.round(next)))
      const others = prev.filter((p) => p.id !== id)
      const remaining = 100 - clamped
      const otherTotal = others.reduce((s, a) => s + a.percent, 0)
      const rebalanced = others.map((p) =>
        otherTotal === 0
          ? { ...p, percent: Math.round(remaining / others.length) }
          : { ...p, percent: Math.round((p.percent / otherTotal) * remaining) },
      )
      // Fix rounding drift by nudging the largest remaining slot
      const sum =
        clamped + rebalanced.reduce((s, a) => s + a.percent, 0)
      if (rebalanced.length && sum !== 100) {
        const drift = 100 - sum
        const idx = rebalanced.reduce(
          (max, p, i) => (p.percent > rebalanced[max].percent ? i : max),
          0,
        )
        rebalanced[idx] = {
          ...rebalanced[idx],
          percent: rebalanced[idx].percent + drift,
        }
      }
      // Restore original order
      return prev.map((p) =>
        p.id === id
          ? { ...p, percent: clamped }
          : rebalanced.find((r) => r.id === p.id) ?? p,
      )
    })
  }

  function onDragStart(id: string) {
    setDragId(id)
  }
  function onDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault()
    if (!dragId || dragId === overId) return
    setSplits((prev) => {
      const from = prev.findIndex((p) => p.id === dragId)
      const to = prev.findIndex((p) => p.id === overId)
      if (from === -1 || to === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }
  function onDragEnd() {
    setDragId(null)
  }

  async function save() {
    if (saving) return
    setSaving(true)
    const checking = accounts.find((a) => a.type === "checking")
    try {
      await updateAutosave({
        enabled: splits.length > 0 || roundUpsOn,
        roundUpEnabled: roundUpsOn,
        ...(checking ? { roundUpSourceAccountId: checking.id } : {}),
        splits: splits.map((s) => ({ goalId: s.id, percent: s.percent })),
      })
      setAutosave({
        split: splits,
        roundUpsEnabled: roundUpsOn,
        roundUpsTargetGoalId: null,
      })
      onSaved()
      onClose()
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't save autosave", {
        variant: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Autosave settings"
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
              <div className="mh-l">
                <div className="modal-title">Autosave</div>
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

            {/* Tabs */}
            <div className="seg" style={{ marginTop: 16 }}>
              <TabButton active={tab === "split"} onClick={() => setTab("split")}>
                Split your pay
              </TabButton>
              <TabButton
                active={tab === "roundups"}
                onClick={() => setTab("roundups")}
              >
                Round-ups
              </TabButton>
            </div>

            {tab === "split" ? (
              <div style={{ marginTop: 18 }}>
                {/* %/$ toggle */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 12.5, color: "var(--ink-mute)" }}>
                    Total{" "}
                    <span
                      style={{
                        fontWeight: 700,
                        color: total === 100 ? "var(--gold-deep)" : "#B23A3A",
                      }}
                    >
                      {total}%
                    </span>{" "}
                    of each paycheck
                  </div>
                  <div className="seg compact">
                    {(["%", "$"] as Mode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={cn("seg-btn", mode === m && "active")}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <ul className="alloc">
                  {splits.map((p) => (
                    <li
                      key={p.id}
                      draggable
                      onDragStart={() => onDragStart(p.id)}
                      onDragOver={(e) => onDragOver(e, p.id)}
                      onDragEnd={onDragEnd}
                      className={cn("alloc-row", dragId === p.id && "dragging")}
                    >
                      <div className="alloc-top">
                        <GripVertical className="alloc-grip" width={16} height={16} aria-hidden />
                        <div className="alloc-emoji" aria-hidden>
                          {p.emoji}
                        </div>
                        <div className="alloc-name">{p.label}</div>
                        <div className="alloc-pill">
                          {mode === "%"
                            ? `${p.percent}%`
                            : `$${((p.percent / 100) * ASSUMED_PAYCHECK).toFixed(0)}`}
                        </div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={p.percent}
                        onChange={(e) =>
                          setPercent(p.id, parseInt(e.target.value, 10))
                        }
                        className="modal-range"
                        aria-label={`${p.label} allocation`}
                      />
                    </li>
                  ))}
                </ul>
                <p style={{ fontSize: 11.5, color: "var(--ink-mute)", marginTop: 10 }}>
                  Drag to reorder. Sliders auto-balance to 100%.
                </p>
              </div>
            ) : (
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                <div
                  className="modal-inset"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}
                >
                  <div>
                    <div className="mi-title">Round-Ups</div>
                    <p className="mi-sub">
                      Every card purchase rounds up to the next dollar. The
                      difference is distributed across your goals using the
                      Split-your-pay percentages.
                    </p>
                  </div>
                  <label className="switch" style={{ flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={roundUpsOn}
                      onChange={() => setRoundUpsOn(!roundUpsOn)}
                    />
                    <span className="track" />
                  </label>
                </div>

                <div className={cn("modal-inset", !roundUpsOn && "muted")}>
                  <div className="mi-label">Where they go</div>
                  <p className="mi-sub">
                    Round-ups follow your{" "}
                    <button
                      type="button"
                      onClick={() => setTab("split")}
                      className="mi-link"
                      style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}
                    >
                      Split your pay
                    </button>{" "}
                    setup, each goal gets its share automatically.
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="lk-cta-btn primary"
              style={{ marginTop: 22 }}
            >
              {saving && <span className="lk-cta-spin" aria-hidden />}
              Save
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("seg-btn", active && "active")}
    >
      {children}
    </button>
  )
}
