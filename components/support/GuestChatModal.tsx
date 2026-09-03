"use client"

import { useEffect, useRef, useState } from "react"
import type { Socket } from "socket.io-client"
import { Send, ShieldCheck, X } from "lucide-react"
import { connectGuestSocket } from "@/lib/realtime/socket"
import { ApiError } from "@/lib/api/errors"
import { BRAND_NAME } from "@/lib/brand"
import {
  clearStoredGuest,
  listGuestMessages,
  loadStoredGuest,
  openGuestThread,
  saveStoredGuest,
  sendGuestMessage,
  type GuestSupportMessage,
} from "@/lib/support/api/guest-support.real"

/**
 * Guest (logged-out) live support chat. Works on the public auth pages with
 * NO session: the visitor enters name + email, which opens a guest thread;
 * messages then stream both ways over an anonymous guest socket, and admins
 * see + reply from the normal admin support queue. Fully self-contained
 * inline styles so it renders correctly without the dashboard stylesheet.
 */
export function GuestChatModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [stage, setStage] = useState<"intake" | "chat">("intake")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [thread, setThread] = useState<{ id: string; token: string } | null>(
    null,
  )
  const [messages, setMessages] = useState<GuestSupportMessage[]>([])
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  // Set when the admin closes the thread mid-session (live event below, or
  // the THREAD_CLOSED 403 as a fallback). The next send transparently spins
  // up a fresh guest thread, so the visitor never sees the raw error.
  const [closed, setClosed] = useState(false)
  const [adminTyping, setAdminTyping] = useState(false)
  const sockRef = useRef<Socket | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  // Typing relay (mirrors the authed customer modal): while the visitor types
  // we re-announce "true" on a heartbeat so a dropped packet self-heals, then
  // emit "false" after an idle gap. `adminTypingHideRef` defensively hides the
  // admin's dots if their "false" is ever lost.
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingHeartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const adminTypingHideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingEmitRef = useRef(false)

  const append = (m: GuestSupportMessage) =>
    setMessages((prev) =>
      prev.some((x) => x.id === m.id) ? prev : [...prev, m],
    )

  // Wire a guest socket for the active thread (live admin replies + echoes).
  function attachSocket(threadId: string, token: string) {
    if (sockRef.current) return
    const s = connectGuestSocket(token)
    sockRef.current = s
    s.on("connect", () => setConnected(true))
    s.on("disconnect", () => setConnected(false))
    s.on(
      "support.message.created",
      (p: { threadId: string; message: GuestSupportMessage }) => {
        if (p?.threadId === threadId && p.message) append(p.message)
      },
    )
    // Live "support is typing…" from the admin. Guest threads route the
    // admin's typing event to this thread's guest room.
    s.on(
      "support.typing",
      (p: {
        threadId: string
        senderRole: "admin" | "guest" | "customer"
        isTyping: boolean
      }) => {
        if (p?.threadId !== threadId || p.senderRole !== "admin") return
        setAdminTyping(p.isTyping)
        if (adminTypingHideRef.current) clearTimeout(adminTypingHideRef.current)
        if (p.isTyping) {
          adminTypingHideRef.current = setTimeout(() => setAdminTyping(false), 4000)
        }
      },
    )
    // Admin closed the conversation → flag it so the UI shows a notice and
    // the next send starts a fresh session instead of 403-ing.
    s.on("support.thread.closed", (p: { threadId: string }) => {
      if (p?.threadId === threadId) {
        setClosed(true)
        setAdminTyping(false)
      }
    })
  }

  // Throttled outbound typing signal — see the ref comments above.
  function emitTyping(active: boolean) {
    const s = sockRef.current
    const threadId = thread?.id
    if (!s || !threadId) return

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
        s.emit("support.typing", { threadId, isTyping: false })
        lastTypingEmitRef.current = false
      }
      return
    }

    if (!lastTypingEmitRef.current) {
      s.emit("support.typing", { threadId, isTyping: true })
      lastTypingEmitRef.current = true
    }
    if (!typingHeartbeatRef.current) {
      typingHeartbeatRef.current = setInterval(() => {
        const sk = sockRef.current
        if (sk && lastTypingEmitRef.current) {
          sk.emit("support.typing", { threadId, isTyping: true })
        }
      }, 1500)
    }
    typingTimerRef.current = setTimeout(() => emitTyping(false), 2500)
  }

  // Stop the typing relay and forget any pending state. Used on close, fresh
  // thread, and unmount.
  function stopTyping() {
    if (typingHeartbeatRef.current) {
      clearInterval(typingHeartbeatRef.current)
      typingHeartbeatRef.current = null
    }
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = null
    }
    lastTypingEmitRef.current = false
  }

  // On open: recover an existing guest thread, else show the intake form.
  useEffect(() => {
    if (!open) return
    const stored = loadStoredGuest()
    if (stored) {
      setThread({ id: stored.threadId, token: stored.token })
      setName(stored.name)
      setEmail(stored.email)
      setStage("chat")
      attachSocket(stored.threadId, stored.token)
      listGuestMessages(stored.threadId, stored.token)
        .then(setMessages)
        .catch(() => {
          // Token/thread gone (server reset) — fall back to intake.
          clearStoredGuest()
          setThread(null)
          setStage("intake")
        })
    } else {
      setStage("intake")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Tear down the socket when the modal closes / unmounts.
  useEffect(() => {
    if (open) return
    stopTyping()
    setAdminTyping(false)
    sockRef.current?.disconnect()
    sockRef.current = null
    setConnected(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    return () => {
      stopTyping()
      sockRef.current?.disconnect()
      sockRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the timeline pinned to the latest message (and to the typing bubble
  // when it appears, so it isn't tucked under the input).
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, stage, adminTyping])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // Mobile keyboard fix. On phones the on-screen keyboard shrinks the *visual*
  // viewport without resizing the layout viewport, so a position:fixed sheet
  // would sit behind the keyboard and the browser scrolls the whole page (the
  // sign-in header included) up to chase the focused input. We instead pin the
  // overlay to the visual viewport and lock body scroll so nothing underneath
  // can shift.
  useEffect(() => {
    if (!open) return
    const body = document.body
    const prevOverflow = body.style.overflow
    body.style.overflow = "hidden"

    const vv = window.visualViewport
    const apply = () => {
      const el = overlayRef.current
      if (!el || !vv) return
      el.style.height = `${vv.height}px`
      el.style.transform = `translateY(${vv.offsetTop}px)`
    }
    if (vv) {
      apply()
      vv.addEventListener("resize", apply)
      vv.addEventListener("scroll", apply)
    }
    return () => {
      body.style.overflow = prevOverflow
      if (vv) {
        vv.removeEventListener("resize", apply)
        vv.removeEventListener("scroll", apply)
      }
      const el = overlayRef.current
      if (el) {
        el.style.height = ""
        el.style.transform = ""
      }
    }
  }, [open])

  async function submitIntake(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    const n = name.trim()
    const em = email.trim()
    if (!n || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) {
      setError("Enter your name and a valid email.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const t = await openGuestThread(n, em)
      saveStoredGuest({ threadId: t.id, token: t.token, name: n, email: em })
      setThread({ id: t.id, token: t.token })
      setStage("chat")
      setClosed(false)
      attachSocket(t.id, t.token)
    } catch {
      setError("Couldn't start the chat. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  /** Open a brand-new guest thread (reusing the visitor's name/email),
   *  rewire the socket to its room, and reset the timeline. Returns the new
   *  thread so the caller can send into it immediately. */
  async function startFreshThread(): Promise<{ id: string; token: string }> {
    const n = name.trim()
    const em = email.trim()
    const t = await openGuestThread(n, em)
    saveStoredGuest({ threadId: t.id, token: t.token, name: n, email: em })
    stopTyping()
    setAdminTyping(false)
    sockRef.current?.disconnect()
    sockRef.current = null
    setThread({ id: t.id, token: t.token })
    setMessages([])
    setClosed(false)
    attachSocket(t.id, t.token)
    return { id: t.id, token: t.token }
  }

  // Explicit "Start new chat" action from the closed-session notice.
  async function onStartNewChat() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await startFreshThread()
    } catch {
      setError("Couldn't start a new chat. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body || !thread || busy) return
    emitTyping(false)
    setBusy(true)
    setError(null)
    try {
      // If support closed the prior thread, the next send transparently opens
      // a fresh one — the visitor just keeps talking.
      const active = closed ? await startFreshThread() : thread
      const m = await sendGuestMessage(active.id, active.token, body)
      append(m) // socket echo is deduped by id
      setDraft("")
    } catch (err) {
      // Fallback for when the realtime close event was missed (e.g. socket
      // dropped): the backend rejects with THREAD_CLOSED. Flag it so the next
      // tap starts a fresh session rather than failing again.
      if (err instanceof ApiError && err.message === "THREAD_CLOSED") {
        setClosed(true)
        setError("This chat was closed. Send again to start a new session.")
      } else {
        setError("Message didn't send. Tap to retry.")
      }
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null
  const sans =
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Chat with ${BRAND_NAME} support`}
      onClick={onClose}
      className="gcm-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        // Fallback for browsers without the VisualViewport API; the effect
        // above overrides height/transform to track the keyboard on mobile.
        height: "100dvh",
        zIndex: 2000,
        display: "flex",
        justifyContent: "center",
        background: "rgba(28,26,23,.55)",
        fontFamily: sans,
      }}
    >
      {/* Mobile: bottom sheet (rounded top). Desktop (≥721px): centered
          dialog (all corners rounded, breathing room around it). */}
      <style>{`
        .gcm-overlay { align-items: flex-end; }
        .gcm-card { border-radius: 16px 16px 0 0; box-shadow: 0 -24px 60px -24px rgba(0,0,0,.4); }
        @media (min-width: 721px) {
          .gcm-overlay { align-items: center; padding: 24px; }
          .gcm-card { border-radius: 16px; box-shadow: 0 30px 70px -28px rgba(0,0,0,.45); }
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        className="gcm-card"
        style={{
          width: "100%",
          maxWidth: 440,
          height: "min(78dvh, 620px)",
          // When the keyboard shrinks the overlay, clamp the sheet to it so
          // the composer rides just above the keyboard instead of overflowing.
          maxHeight: "100%",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "14px 16px",
            borderBottom: "1px solid #ECE8DF",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "rgba(201,162,74,.16)",
              color: "#97793A",
              flexShrink: 0,
            }}
          >
            <ShieldCheck width={19} height={19} aria-hidden />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: "#211F1B" }}>
              {BRAND_NAME} Support
            </div>
            <div style={{ fontSize: 11.5, color: "#756F66", marginTop: 1 }}>
              {stage === "chat"
                ? connected
                  ? "Connected · we reply in 15 mins to 1 hour"
                  : "Connecting…"
                : "Start a conversation"}
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#EFECE4",
              color: "#3A352D",
              border: 0,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X width={16} height={16} aria-hidden />
          </button>
        </div>

        {stage === "intake" ? (
          <form
            onSubmit={submitIntake}
            style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}
          >
            <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#514D45", margin: 0 }}>
              Hi 👋 Tell us who you are and we&apos;ll connect you with the
              team. We&apos;ll also email you if you step away.
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              style={guestInput}
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              type="email"
              autoComplete="email"
              inputMode="email"
              style={guestInput}
            />
            {error && <div style={errStyle}>{error}</div>}
            <button type="submit" disabled={busy} style={primaryBtn}>
              {busy ? "Starting…" : "Start chat"}
            </button>
          </form>
        ) : (
          <>
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                background: "#FBF9F4",
              }}
            >
              {messages.length === 0 && (
                <div style={{ fontSize: 13, color: "#8C8578", textAlign: "center", padding: "20px 0" }}>
                  Send a message and the team will reply here.
                </div>
              )}
              {messages.map((m) => {
                const mine = m.senderRole === "guest"
                return (
                  <div
                    key={m.id}
                    style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}
                  >
                    <div
                      style={{
                        maxWidth: "80%",
                        padding: "9px 12px",
                        borderRadius: 12,
                        fontSize: 13.5,
                        lineHeight: 1.4,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        background: mine ? "#C9A24A" : "#fff",
                        color: mine ? "#1F1C18" : "#211F1B",
                        border: mine ? "0" : "1px solid #ECE8DF",
                      }}
                    >
                      {m.body}
                    </div>
                  </div>
                )
              })}
              {adminTyping && !closed && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div
                    style={{
                      padding: "9px 12px",
                      borderRadius: 12,
                      background: "#fff",
                      border: "1px solid #ECE8DF",
                    }}
                  >
                    <TypingDots />
                  </div>
                </div>
              )}
              {closed && (
                <div style={closedNote}>
                  <b style={{ display: "block", marginBottom: 2 }}>
                    Chat session closed
                  </b>
                  Support closed this conversation. Start a new chat or just
                  send another message.
                  <button
                    type="button"
                    onClick={onStartNewChat}
                    disabled={busy}
                    style={newChatBtn}
                  >
                    {busy ? "Starting…" : "Start new chat"}
                  </button>
                </div>
              )}
            </div>
            {error && <div style={{ ...errStyle, margin: "0 16px" }}>{error}</div>}
            <form
              onSubmit={send}
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 9,
                borderTop: "1px solid #ECE8DF",
                padding: 12,
                flexShrink: 0,
              }}
            >
              <textarea
                value={draft}
                onChange={(e) => {
                  const next = e.target.value
                  setDraft(next)
                  emitTyping(next.trim().length > 0)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void send(e as unknown as React.FormEvent)
                  }
                }}
                rows={1}
                placeholder="Type a message…"
                style={{
                  flex: 1,
                  resize: "none",
                  maxHeight: 96,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1.5px solid #E5DFCF",
                  fontFamily: sans,
                  fontSize: 16,
                  color: "#1F1C18",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                aria-label="Send"
                disabled={busy || !draft.trim()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: "#C9A24A",
                  color: "#1F1C18",
                  border: 0,
                  cursor: "pointer",
                  flexShrink: 0,
                  opacity: busy || !draft.trim() ? 0.5 : 1,
                }}
              >
                <Send width={18} height={18} aria-hidden />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

/** Three pulsing dots. Self-contained keyframes via an inline <style> so the
 *  modal renders correctly on public pages without the dashboard stylesheet. */
function TypingDots() {
  return (
    <div
      aria-label="Support is typing"
      style={{ display: "inline-flex", gap: 4, alignItems: "center", height: 14 }}
    >
      <style>{`@keyframes sbGuestTyping{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}`}</style>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#9A937F",
            display: "inline-block",
            animation: "sbGuestTyping 1.2s infinite ease-in-out",
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </div>
  )
}

const guestInput: React.CSSProperties = {
  width: "100%",
  height: 48,
  padding: "0 14px",
  borderRadius: 12,
  border: "1.5px solid #E5DFCF",
  background: "#fff",
  fontSize: 16,
  color: "#1F1C18",
  outline: "none",
}

const primaryBtn: React.CSSProperties = {
  height: 50,
  borderRadius: 12,
  background: "#C9A24A",
  color: "#1F1C18",
  fontSize: 15,
  fontWeight: 700,
  border: 0,
  cursor: "pointer",
}

const errStyle: React.CSSProperties = {
  fontSize: 12.5,
  color: "#B23A3A",
  background: "rgba(178,58,58,.08)",
  border: "1px solid rgba(178,58,58,.2)",
  borderRadius: 8,
  padding: "8px 10px",
}

const closedNote: React.CSSProperties = {
  alignSelf: "center",
  maxWidth: "90%",
  textAlign: "center",
  fontSize: 12.5,
  lineHeight: 1.45,
  color: "#756F66",
  background: "#F3EFE6",
  border: "1px solid #E5DFCF",
  borderRadius: 10,
  padding: "10px 12px",
  margin: "4px 0",
}

const newChatBtn: React.CSSProperties = {
  display: "block",
  margin: "10px auto 0",
  padding: "8px 16px",
  borderRadius: 9,
  background: "#C9A24A",
  color: "#1F1C18",
  fontSize: 13,
  fontWeight: 700,
  border: 0,
  cursor: "pointer",
}
