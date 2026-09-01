"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { MessageCircle, ShieldAlert, X } from "lucide-react"
import { ChatSupportModal } from "@/components/support/ChatSupportModal"

/**
 * "Transfers are temporarily locked" modal. Shown ONLY when an admin has
 * locked the account's money movement (client flag `transfersLocked`, or a
 * backend `TRANSFERS_DISABLED` rejection). Otherwise money-moves proceed
 * normally to their success flow. Hard lock — no retry; the user must call
 * support or visit a branch.
 */
export function TransfersBlockedModal({
  open,
  reason,
  onClose,
}: {
  open: boolean
  /** Optional admin-provided context (e.g. "compliance review"). */
  reason?: string | null
  onClose: () => void
}) {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <>
      <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Transfers locked"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="modal-scrim"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="modal-scrim-btn"
          />
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="modal-card sm"
          >
            <div className="modal-grip" />
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="modal-x"
              style={{ position: "absolute", right: 14, top: 14, zIndex: 2 }}
            >
              <X aria-hidden />
            </button>

            <div className="modal-status">
              <div
                className="modal-disc danger"
                style={{ width: 64, height: 64 }}
              >
                <ShieldAlert aria-hidden />
              </div>
              <div className="ms-title" style={{ fontSize: 24 }}>
                Transfers are temporarily locked
              </div>
              <p className="ms-body">
                For your account&apos;s safety, all money movement has been
                paused. This includes payments, transfers to linked accounts,
                wires, and card moves.
              </p>
              {reason && (
                <div className="modal-note">
                  <b>Note:</b> {reason}
                </div>
              )}
              <p className="ms-body">
                Please message our support for assistance. A specialist will
                verify your identity, look into the issue and clear the hold.
              </p>
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="lk-cta-btn primary"
                style={{ marginTop: 18 }}
              >
                <MessageCircle width={18} height={18} aria-hidden />
                Customer Care
              </button>
              <button
                type="button"
                onClick={onClose}
                className="lk-cta-btn secondary"
                style={{ marginTop: 10 }}
              >
                I understand
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
      <ChatSupportModal open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  )
}

/** True if the thrown value is a backend "TRANSFERS_DISABLED" rejection. */
export function isTransfersBlockedError(err: unknown): boolean {
  if (!err) return false
  const message = err instanceof Error ? err.message : String(err)
  return /TRANSFERS_DISABLED/.test(message)
}
