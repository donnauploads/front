"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { goalTemplates } from "@/lib/fixtures/goals"
import { useStore } from "@/lib/store"
import {
  cn,
  formatNumericInput,
  unformatNumericInput,
  withMinDelay,
} from "@/lib/utils"
import { ApiError } from "@/lib/api/errors"
import { createGoal } from "@/lib/savings/api/savings.real"
import { useToast } from "@/components/providers/ToastProvider"

export function NewGoalModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const upsertGoal = useStore((s) => s.upsertGoal)
  const { toast } = useToast()
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [target, setTarget] = useState("")
  const [saving, setSaving] = useState(false)

  const template = goalTemplates.find((t) => t.id === templateId)
  const canSave = name.trim().length >= 2 && !saving

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setTemplateId(null)
        setName("")
        setTarget("")
      }, 250)
      return () => clearTimeout(t)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  function pickTemplate(id: string) {
    const t = goalTemplates.find((g) => g.id === id)
    setTemplateId(id)
    if (t && !name) setName(t.label)
    if (t && !target) setTarget(formatNumericInput(String(t.suggested)))
  }

  async function save() {
    if (!canSave) return
    const t = goalTemplates.find((x) => x.id === templateId)
    const targetNum = parseFloat(unformatNumericInput(target))
    setSaving(true)
    try {
      const saved = await withMinDelay(
        createGoal({
          emoji: t?.emoji ?? "✨",
          name: name.trim(),
          target:
            Number.isFinite(targetNum) && targetNum > 0 ? targetNum : null,
          contributePerWeek: 25,
        }),
      )
      upsertGoal(saved)
      onClose()
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't create goal", {
        variant: "error",
      })
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="New savings goal"
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
                <div className="modal-title">What are you saving for?</div>
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

            <div className="tpl-grid">
              {goalTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTemplate(t.id)}
                  className={cn("tpl", templateId === t.id && "active")}
                >
                  <span className="tpl-emoji" aria-hidden>
                    {t.emoji}
                  </span>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="modal-field">
              <label className="modal-label">Goal name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={template?.label ?? "e.g. Tokyo trip"}
                className="docs-input"
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">
                Target amount <span className="opt">(optional)</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(formatNumericInput(e.target.value))}
                placeholder={
                  template ? formatNumericInput(String(template.suggested)) : "1,000"
                }
                className="docs-input"
              />
            </div>

            <button
              type="button"
              disabled={!canSave}
              onClick={save}
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
