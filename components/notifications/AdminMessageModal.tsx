"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Megaphone } from "lucide-react"
import { useStore } from "@/lib/store"

/**
 * App-wide popup for a real-time admin message (the "popup" / "both"
 * channel of admin → user direct messages). Reads `adminMessage` from the
 * store, which RealtimeProvider sets on the `admin.message` socket event.
 * Mounted once in app/(app)/layout.tsx.
 */
export function AdminMessageModal() {
  const msg = useStore((s) => s.adminMessage)
  const dismiss = useStore((s) => s.dismissAdminMessage)

  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-scrim"
          style={{ zIndex: 1150 }}
        >
          <button
            aria-label="Close"
            onClick={dismiss}
            className="modal-scrim-btn"
          />
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="modal-card sm"
          >
            <div className="modal-grip" />
            <div className="modal-status">
              <span className="modal-disc" aria-hidden>
                <Megaphone />
              </span>
              <div className="ms-title">{msg.title}</div>
              <div
                className="ms-body"
                style={{ whiteSpace: "pre-wrap", textAlign: "center" }}
              >
                {msg.body}
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="lk-cta-btn primary"
              style={{ marginTop: 18 }}
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
