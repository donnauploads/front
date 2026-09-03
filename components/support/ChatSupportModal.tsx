"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2, Paperclip, Send, ShieldCheck, X } from "lucide-react"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { BRAND_NAME } from "@/lib/brand"
import { ApiError } from "@/lib/api/errors"
import {
  fetchMyAttachment,
  listMyMessages,
  markMyThreadRead,
  openMyThread,
  sendMyAttachment,
  sendMyMessage,
  type SupportMessage,
} from "@/lib/support/api/support.real"
import { AttachmentBubble } from "./AttachmentBubble"
import { PendingAttachment } from "./PendingAttachment"
import {
  ATTACH_ACCEPT,
  validateAttachment,
} from "./attachment-validate"
import { peekSocket, getSocket } from "@/lib/realtime/socket"

/**
 * Customer chat with support. Opens (or recovers) the user's rolling
 * thread on mount, renders the message timeline, and listens for
 * `support.message.created` pushes from the gateway. Sending POSTs the
 * message — the FE waits for the WS echo before deduping, so optimistic
 * insertion stays consistent with what the admin sees.
 */
export function ChatSupportModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const selfId = useStore((s) => s.session.user?.id)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // A file the user picked but hasn't sent yet — staged with a preview until
  // they tap Send (the draft text becomes its caption).
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const pendingPreviewRef = useRef<string | null>(null)
  const [adminTyping, setAdminTyping] = useState(false)
  /** Set when the admin closes the thread mid-session. Cleared when the
   *  customer's next send spins up a fresh thread. */
  const [threadClosed, setThreadClosed] = useState(false)
  // Live support-team presence reported by the gateway. Starts unknown —
  // the gateway answers our query on open. Falls back to `offline` if the
  // socket isn't connected at all.
  const [presence, setPresence] = useState<"online" | "away" | "offline">(
    "offline",
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingHeartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const adminTypingHideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingEmitRef = useRef<boolean>(false)

  // Boot the thread when the modal opens.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError(null)
    setLoading(true)
    setThreadClosed(false)
    ;(async () => {
      try {
        const t = await openMyThread()
        if (cancelled) return
        setThreadId(t.id)
        const rows = await listMyMessages(t.id)
        if (cancelled) return
        setMessages(rows)
      } catch {
        if (!cancelled) setError("Couldn't open chat. Try again in a moment.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  // Subscribe to incoming messages — both the user's own echoes (so the
  // optimistic insert can reconcile with the server-assigned id) and
  // admin replies.
  useEffect(() => {
    if (!open || !threadId) return
    // Make sure the socket exists. RealtimeProvider also manages this,
    // but a defensive get() here covers cases where the user opened the
    // modal mid-reconnect.
    let sock = peekSocket()
    if (!sock) sock = getSocket()

    function onMessage(payload: {
      threadId: string
      message: SupportMessage
    }) {
      if (payload.threadId !== threadId) return
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.message.id)) return prev
        return [...prev, payload.message]
      })
      // If the new message is from the admin and the chat is open in the
      // foreground, mark it read immediately so the admin sees "Seen".
      if (payload.message.senderRole === "admin") {
        markMyThreadRead(threadId).catch(() => {})
      }
    }
    function onTyping(payload: {
      threadId: string
      senderRole: "admin" | "customer"
      isTyping: boolean
    }) {
      if (payload.threadId !== threadId) return
      if (payload.senderRole !== "admin") return
      setAdminTyping(payload.isTyping)
      // Defensive timeout — if a `false` event is lost, hide the dots
      // after 4 seconds anyway.
      if (adminTypingHideRef.current) clearTimeout(adminTypingHideRef.current)
      if (payload.isTyping) {
        adminTypingHideRef.current = setTimeout(() => setAdminTyping(false), 4000)
      }
    }
    function onClosed(payload: { threadId: string }) {
      if (payload.threadId !== threadId) return
      setThreadClosed(true)
      setAdminTyping(false)
    }
    sock.on("support.message.created", onMessage)
    sock.on("support.typing", onTyping)
    sock.on("support.thread.closed", onClosed)
    return () => {
      sock?.off("support.message.created", onMessage)
      sock?.off("support.typing", onTyping)
      sock?.off("support.thread.closed", onClosed)
    }
  }, [open, threadId])

  // Subscribe to support-team presence whenever the modal is open. The
  // gateway broadcasts `support.presence.changed` on every state shift;
  // we also send a one-shot `support.presence.query` on open so the dot
  // reflects current state without waiting for the next change.
  useEffect(() => {
    if (!open) return
    let sock = peekSocket()
    if (!sock) sock = getSocket()
    function onChange(state: { status: "online" | "away" | "offline" }) {
      if (state?.status) setPresence(state.status)
    }
    sock.on("support.presence.changed", onChange)
    sock.emit("support.presence.query")
    return () => {
      sock?.off("support.presence.changed", onChange)
    }
  }, [open])

  // When the modal becomes visible (or messages refresh), mark all
  // admin messages read in one shot so the admin sees a fresh "Seen".
  useEffect(() => {
    if (!open || !threadId) return
    if (!messages.some((m) => m.senderRole === "admin" && !m.readAt)) return
    markMyThreadRead(threadId).catch(() => {})
  }, [open, threadId, messages])

  // Auto-scroll to bottom on a new message OR when the admin's typing
  // indicator appears — otherwise the typing bubble lands below the fold,
  // tucked under the input box, until the user scrolls.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, adminTyping])

  // Stop the typing heartbeat (and tell the other side we stopped) whenever
  // the modal closes or the component unmounts — otherwise the interval would
  // keep firing "true" against a thread the user has walked away from.
  useEffect(() => {
    if (open) return
    if (typingHeartbeatRef.current) {
      clearInterval(typingHeartbeatRef.current)
      typingHeartbeatRef.current = null
    }
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = null
    }
    if (lastTypingEmitRef.current) {
      peekSocket()?.emit("support.typing", { threadId, isTyping: false })
      lastTypingEmitRef.current = false
    }
  }, [open, threadId])

  useEffect(
    () => () => {
      if (typingHeartbeatRef.current) clearInterval(typingHeartbeatRef.current)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    },
    [],
  )

  // Discard a staged (unsent) attachment when the modal closes; revoke its
  // preview object URL on unmount so we don't leak blobs.
  useEffect(() => {
    if (!open) clearPending()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  useEffect(
    () => () => {
      if (pendingPreviewRef.current) {
        URL.revokeObjectURL(pendingPreviewRef.current)
      }
    },
    [],
  )

  // Robust typing relay. A single fire-and-forget "true" is fragile: if that
  // one packet is dropped (a reconnect/blip) the indicator never shows, and
  // if the user types for longer than the receiver's auto-hide window the
  // dots vanish mid-sentence. So while actively typing we RE-ANNOUNCE "true"
  // on a 1.5s heartbeat (refreshing the receiver's hide timer and self-
  // healing after a reconnect), and only emit "false" after a real idle gap.
  function emitTyping(active: boolean) {
    if (!threadId) return
    const sock = peekSocket()
    if (!sock) return

    // Every signal resets the idle-stop watchdog.
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = null
    }

    if (!active) {
      if (typingHeartbeatRef.current) {
        clearInterval(typingHeartbeatRef.current)
        typingHeartbeatRef.current = null
      }
      if (lastTypingEmitRef.current) {
        sock.emit("support.typing", { threadId, isTyping: false })
        lastTypingEmitRef.current = false
      }
      return
    }

    // Announce immediately on the first keystroke.
    if (!lastTypingEmitRef.current) {
      sock.emit("support.typing", { threadId, isTyping: true })
      lastTypingEmitRef.current = true
    }
    // Keep re-announcing while typing — grabs the live socket each tick so it
    // survives reconnects.
    if (!typingHeartbeatRef.current) {
      typingHeartbeatRef.current = setInterval(() => {
        const s = peekSocket()
        if (s && lastTypingEmitRef.current) {
          s.emit("support.typing", { threadId, isTyping: true })
        }
      }, 1500)
    }
    // Stop declaring "typing" after 2.5s of keyboard silence.
    typingTimerRef.current = setTimeout(() => emitTyping(false), 2500)
  }

  function clearPending() {
    if (pendingPreviewRef.current) {
      URL.revokeObjectURL(pendingPreviewRef.current)
      pendingPreviewRef.current = null
    }
    setPendingPreview(null)
    setPendingFile(null)
  }

  // Picking a file only STAGES it — nothing is uploaded until the user taps
  // Send (with the draft as an optional caption).
  function onPickFile(file: File | null | undefined) {
    if (!file || sending) return
    const invalid = validateAttachment(file)
    if (invalid) {
      setError(invalid)
      if (fileRef.current) fileRef.current.value = ""
      return
    }
    setError(null)
    clearPending()
    setPendingFile(file)
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file)
      pendingPreviewRef.current = url
      setPendingPreview(url)
    }
    if (fileRef.current) fileRef.current.value = ""
  }

  async function send() {
    const trimmed = draft.trim()
    if ((!trimmed && !pendingFile) || sending) return
    emitTyping(false)
    setSending(true)
    setError(null)
    try {
      // If the admin closed the prior thread, the next send transparently
      // opens a fresh one. The user perceives it as "kept talking" — but
      // backend-side it's a brand new SupportThread row.
      let activeThreadId = threadId
      if (threadClosed || !activeThreadId) {
        const fresh = await openMyThread()
        activeThreadId = fresh.id
        setThreadId(fresh.id)
        setMessages([])
        setThreadClosed(false)
      }
      const created = pendingFile
        ? await sendMyAttachment(activeThreadId, pendingFile, trimmed || undefined)
        : await sendMyMessage(activeThreadId, trimmed)
      setMessages((prev) =>
        prev.some((m) => m.id === created.id) ? prev : [...prev, created],
      )
      setDraft("")
      clearPending()
    } catch (e) {
      setError(
        pendingFile
          ? e instanceof ApiError
            ? e.message || "Couldn't send file."
            : "Couldn't send file. Try again."
          : "Message didn't send. Tap to retry.",
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Chat with support"
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
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="modal-card chat"
          >
            <header className="chat-head">
              <div className="chat-id">
                <span className={cn("chat-badge", presence)} aria-label={`Support is ${presence}`}>
                  <ShieldCheck aria-hidden />
                  {/* Tiny status dot in the bottom-right of the badge. */}
                  <span className={cn("chat-dot", presence)} aria-hidden />
                </span>
                <div>
                  <div className="chat-name">{BRAND_NAME} Support</div>
                  <div className="chat-status">
                    {presence === "online"
                      ? "Online · replies in minutes"
                      : presence === "away"
                        ? "Away · back shortly"
                        : "Offline · leave a message"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="modal-x"
              >
                <X aria-hidden />
              </button>
            </header>

            <div ref={scrollRef} className="chat-body">
              {loading && messages.length === 0 && (
                <div className="chat-loading">Opening chat…</div>
              )}
              {!loading && messages.length === 0 && (
                <div className="chat-empty">
                  Hi 👋, drop us a message and someone from the team will
                  reply shortly.
                </div>
              )}
              {messages.map((m) => {
                const mine = m.senderId === selfId
                return (
                  <div key={m.id} className={cn("chat-msg", mine && "mine")}>
                    <div className="chat-bubble">
                      {m.attachment && (
                        <AttachmentBubble
                          attachment={m.attachment}
                          messageId={m.id}
                          mine={mine}
                          load={() => fetchMyAttachment(m.threadId, m.id)}
                        />
                      )}
                      {m.body && <p>{m.body}</p>}
                      <div className="ts">
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
              {adminTyping && (
                <div className="chat-msg">
                  <div className="chat-bubble">
                    <TypingDots />
                  </div>
                </div>
              )}
              {threadClosed && (
                <div className="chat-note">
                  <b>Chat session closed</b>
                  Support closed this conversation. Send another message to
                  start a new session.
                </div>
              )}
            </div>

            {error && <div className="chat-err">{error}</div>}

            {pendingFile && (
              <PendingAttachment
                file={pendingFile}
                preview={pendingPreview}
                onRemove={clearPending}
                disabled={sending}
              />
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                void send()
              }}
              className="chat-form"
            >
              <input
                ref={fileRef}
                type="file"
                accept={ATTACH_ACCEPT}
                hidden
                onChange={(e) => onPickFile(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={sending}
                aria-label="Attach a file"
                title="Attach an image, PDF, or Word document"
                className="chat-send"
              >
                <Paperclip aria-hidden />
              </button>
              <textarea
                rows={1}
                value={draft}
                onChange={(e) => {
                  const next = e.target.value
                  setDraft(next)
                  emitTyping(next.trim().length > 0)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void send()
                  }
                }}
                placeholder={pendingFile ? "Add a caption…" : "Type a message…"}
                className="chat-input"
              />
              <button
                type="submit"
                disabled={(!draft.trim() && !pendingFile) || sending}
                aria-label="Send"
                className="chat-send"
              >
                {sending ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Send aria-hidden />
                )}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Three pulsing dots — same animation pattern both sides use. */
function TypingDots() {
  return (
    <div className="chat-typing" aria-label="Typing">
      <span />
      <span />
      <span />
    </div>
  )
}
