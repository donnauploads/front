"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import { Loader2, Paperclip, Send, Lock, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { ApiError } from "@/lib/api/errors"
import {
  adminCloseThread,
  adminReopenThread,
  adminReply,
  adminSendAttachment,
  fetchAdminAttachment,
  listAdminMessages,
  listAdminThreads,
  type AdminThread,
  type SupportMessage,
} from "@/lib/support/api/support.real"
import { AttachmentBubble } from "@/components/support/AttachmentBubble"
import { PendingAttachment } from "@/components/support/PendingAttachment"
import {
  ATTACH_ACCEPT,
  validateAttachment,
} from "@/components/support/attachment-validate"
import { peekSocket, getSocket } from "@/lib/realtime/socket"

/**
 * Admin support inbox. Left rail lists open threads (unread first),
 * right pane shows the selected thread + reply box. The WebSocket pushes
 * `support.message.created` into both sides so the inbox preview and the
 * open conversation stay live without polling.
 */
export default function AdminSupportPage() {
  const adminId = useStore((s) => s.session.user?.id)
  const [threads, setThreads] = useState<AdminThread[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customerTyping, setCustomerTyping] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  // Staged (picked but unsent) attachment — sent only when the admin taps Send.
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const pendingPreviewRef = useRef<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingHeartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const customerTypingHideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingEmitRef = useRef<boolean>(false)

  // Initial thread load.
  useEffect(() => {
    let cancelled = false
    setLoadingThreads(true)
    listAdminThreads()
      .then((rows) => {
        if (cancelled) return
        setThreads(rows)
        // Intentionally do NOT auto-select a thread here — opening the
        // chat modal is an explicit click. Otherwise every refresh would
        // pop the modal on the most-recent thread.
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load support threads.")
      })
      .finally(() => {
        if (!cancelled) setLoadingThreads(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch messages when the active thread changes.
  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    let cancelled = false
    setLoadingMessages(true)
    listAdminMessages(activeId)
      .then((rows) => {
        if (cancelled) return
        setMessages(rows)
        // Selecting a thread marks it read server-side; mirror locally.
        setThreads((prev) =>
          prev.map((t) => (t.id === activeId ? { ...t, unread: false } : t)),
        )
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load messages.")
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeId])

  // Customer-facing presence indicator. While the admin is on this page
  // and the tab is visible we report `online`. Tab hidden for 5+ min flips
  // to `away`. Navigating away from the page or logging out also flips us
  // off (`away` on unmount; the gateway treats socket disconnect as the
  // `offline` signal).
  useEffect(() => {
    let sock = peekSocket()
    if (!sock) sock = getSocket()
    let hiddenTimer: ReturnType<typeof setTimeout> | null = null
    const AWAY_AFTER_MS = 5 * 60 * 1000

    function emitPresence(status: "online" | "away") {
      sock?.emit("support.admin.presence", { status })
    }

    function onVisibilityChange() {
      if (typeof document === "undefined") return
      if (document.hidden) {
        if (hiddenTimer) clearTimeout(hiddenTimer)
        hiddenTimer = setTimeout(() => emitPresence("away"), AWAY_AFTER_MS)
      } else {
        if (hiddenTimer) {
          clearTimeout(hiddenTimer)
          hiddenTimer = null
        }
        emitPresence("online")
      }
    }

    emitPresence("online")
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange)
      if (hiddenTimer) clearTimeout(hiddenTimer)
      // Leaving the support page is the cleanest signal that we shouldn't
      // be advertised as actively waiting on customer messages anymore.
      emitPresence("away")
    }
  }, [])

  // Realtime push subscription — both for new customer messages (inbox
  // updates) and for our own admin echoes (server-assigned id).
  useEffect(() => {
    let sock = peekSocket()
    if (!sock) sock = getSocket()

    function onMessage(payload: {
      threadId: string
      message: SupportMessage
    }) {
      // 1. Append to the open conversation if it matches.
      if (payload.threadId === activeId) {
        setMessages((prev) =>
          prev.some((m) => m.id === payload.message.id)
            ? prev
            : [...prev, payload.message],
        )
      }
      // 2. Bump the thread to the top + mark unread if it's not the
      //    currently-open one and the author wasn't us (admin).
      setThreads((prev) => {
        const idx = prev.findIndex((t) => t.id === payload.threadId)
        const justSentByCustomer = payload.message.senderRole === "customer"
        const isOpen = payload.threadId === activeId
        if (idx === -1) {
          // New thread we haven't fetched yet. Refresh the inbox.
          void listAdminThreads().then((rows) => setThreads(rows))
          return prev
        }
        const updated = {
          ...prev[idx]!,
          lastBody: payload.message.body,
          lastMessageAt: payload.message.createdAt,
          unread: justSentByCustomer && !isOpen
            ? true
            : isOpen
              ? false
              : prev[idx]!.unread,
        }
        const next = [updated, ...prev.filter((t) => t.id !== payload.threadId)]
        return next
      })
    }
    function onTyping(payload: {
      threadId: string
      senderRole: "admin" | "customer" | "guest"
      isTyping: boolean
    }) {
      if (payload.threadId !== activeId) return
      // Either party on the other side: a signed-in customer OR a logged-out
      // guest. Both should light up the admin's "typing…" indicator.
      if (payload.senderRole !== "customer" && payload.senderRole !== "guest") {
        return
      }
      setCustomerTyping(payload.isTyping)
      if (customerTypingHideRef.current) clearTimeout(customerTypingHideRef.current)
      if (payload.isTyping) {
        customerTypingHideRef.current = setTimeout(
          () => setCustomerTyping(false),
          4000,
        )
      }
    }
    function onRead(payload: {
      threadId: string
      messageIds: string[]
      readAt: string
    }) {
      if (payload.threadId !== activeId) return
      const ids = new Set(payload.messageIds)
      setMessages((prev) =>
        prev.map((m) =>
          ids.has(m.id) && !m.readAt ? { ...m, readAt: payload.readAt } : m,
        ),
      )
    }
    sock.on("support.message.created", onMessage)
    sock.on("support.typing", onTyping)
    sock.on("support.messages.read", onRead)
    return () => {
      sock?.off("support.message.created", onMessage)
      sock?.off("support.typing", onTyping)
      sock?.off("support.messages.read", onRead)
    }
  }, [activeId])

  // Auto-scroll to bottom on a new message OR when the customer's typing
  // indicator appears — otherwise the typing bubble lands below the fold,
  // hidden behind the input, until you scroll.
  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, customerTyping])

  // When the admin switches threads (or leaves), stop the typing heartbeat so
  // it doesn't keep emitting "true" against the thread they just left.
  useEffect(
    () => () => {
      if (typingHeartbeatRef.current) {
        clearInterval(typingHeartbeatRef.current)
        typingHeartbeatRef.current = null
      }
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
        typingTimerRef.current = null
      }
      lastTypingEmitRef.current = false
    },
    [activeId],
  )

  // Discard a staged (unsent) attachment when switching threads; revoke the
  // preview object URL on unmount.
  useEffect(() => {
    clearPending()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])
  useEffect(
    () => () => {
      if (pendingPreviewRef.current) {
        URL.revokeObjectURL(pendingPreviewRef.current)
      }
    },
    [],
  )

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeId) ?? null,
    [threads, activeId],
  )

  // Mobile keyboard fix (mirrors GuestChatModal): the on-screen keyboard
  // shrinks the visual viewport but not the layout viewport, so the fixed
  // bottom-sheet would sit behind the keyboard and the page would scroll up to
  // chase the focused input. Lock body scroll, and on small screens pin the
  // overlay to the visual viewport so the composer rides just above the
  // keyboard. Desktop (centered dialog, no keyboard) is left untouched.
  const chatOpen = activeThread != null
  useEffect(() => {
    if (!chatOpen) return
    const body = document.body
    const prevOverflow = body.style.overflow
    body.style.overflow = "hidden"

    const small = window.matchMedia("(max-width: 639px)").matches
    const vv = window.visualViewport
    const apply = () => {
      const el = overlayRef.current
      if (!el || !vv) return
      el.style.top = `${vv.offsetTop}px`
      el.style.height = `${vv.height}px`
      el.style.bottom = "auto"
    }
    if (small && vv) {
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
        el.style.top = ""
        el.style.height = ""
        el.style.bottom = ""
      }
    }
  }, [chatOpen])

  // Robust typing relay — re-announces "true" on a 1.5s heartbeat while the
  // admin is actively typing so a single dropped packet (or a reconnect)
  // can't make the customer's indicator never-show or vanish mid-sentence;
  // "false" is sent only after a real idle gap. Mirrors ChatSupportModal.
  function emitTyping(active: boolean) {
    if (!activeId) return
    const thread = threads.find((t) => t.id === activeId)
    if (!thread) return
    const sock = peekSocket()
    if (!sock) return
    const threadId = activeId
    const customerUserId = thread.userId

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
        sock.emit("support.typing", { threadId, customerUserId, isTyping: false })
        lastTypingEmitRef.current = false
      }
      return
    }

    if (!lastTypingEmitRef.current) {
      sock.emit("support.typing", { threadId, customerUserId, isTyping: true })
      lastTypingEmitRef.current = true
    }
    if (!typingHeartbeatRef.current) {
      typingHeartbeatRef.current = setInterval(() => {
        const s = peekSocket()
        if (s && lastTypingEmitRef.current) {
          s.emit("support.typing", { threadId, customerUserId, isTyping: true })
        }
      }, 1500)
    }
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

  // Picking a file only STAGES it — upload happens on Send.
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
    if (!activeId || (!trimmed && !pendingFile) || sending) return
    emitTyping(false)
    setSending(true)
    setError(null)
    try {
      const created = pendingFile
        ? await adminSendAttachment(activeId, pendingFile, trimmed || undefined)
        : await adminReply(activeId, trimmed)
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
          : "Reply failed. Try again.",
      )
    } finally {
      setSending(false)
    }
  }

  const [toggling, setToggling] = useState(false)
  async function toggleThreadStatus() {
    if (!activeId || toggling) return
    const current = threads.find((t) => t.id === activeId)
    if (!current) return
    const nextStatus = current.status === "closed" ? "open" : "closed"
    setToggling(true)
    setError(null)
    // Optimistic update — flip locally first so the button label / pill
    // change feels instant; revert on failure.
    setThreads((prev) =>
      prev.map((t) => (t.id === activeId ? { ...t, status: nextStatus } : t)),
    )
    try {
      if (nextStatus === "closed") {
        await adminCloseThread(activeId)
      } else {
        await adminReopenThread(activeId)
      }
    } catch {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, status: current.status } : t,
        ),
      )
      setError(
        nextStatus === "closed"
          ? "Couldn't close the thread."
          : "Couldn't reopen the thread.",
      )
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support</h1>
          <p className="mt-1 text-sm text-slate-500">
            {threads.filter((t) => t.unread).length} unread ·{" "}
            {threads.length} total
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Inbox — full width. Clicking a thread opens the conversation
            in an overlay modal so it can be focused / closed cleanly. */}
        <aside className="max-h-[72vh] overflow-y-auto rounded-xl border border-slate-200 bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loadingThreads && (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              Loading…
            </div>
          )}
          {!loadingThreads && threads.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              No conversations yet.
            </div>
          )}
          <ul className="divide-y divide-slate-100">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    "block w-full px-4 py-3 text-left transition hover:bg-slate-50",
                    t.id === activeId && "bg-slate-50",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900">
                      {t.customerName ?? t.customerEmail ?? "Unknown"}
                    </span>
                    {t.unread && (
                      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-fern" />
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">
                    {t.lastBody ?? "(no messages yet)"}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      {t.lastMessageAt
                        ? formatDistanceToNow(new Date(t.lastMessageAt), {
                            addSuffix: true,
                          })
                        : ""}
                    </span>
                    {t.status === "closed" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-600">
                        <Lock className="h-2.5 w-2.5" aria-hidden />
                        closed
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

      </div>

      {/* Conversation modal — appears whenever a thread is selected. */}
      <AnimatePresence>
        {activeThread && (
          <motion.div
            ref={overlayRef}
            key="admin-chat-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Chat with ${activeThread.customerName ?? activeThread.customerEmail ?? "customer"}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-x-0 top-[57px] bottom-0 z-30 flex items-end justify-center pb-[env(safe-area-inset-bottom)] sm:items-center"
          >
            <button
              type="button"
              aria-label="Close conversation"
              onClick={() => setActiveId(null)}
              className="absolute inset-0"
            />
            <motion.section
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:h-[640px] sm:max-h-[calc(100dvh_-_57px_-_3rem)] sm:rounded-3xl"
            >
              <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {activeThread.customerName ?? "Unknown"}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {activeThread.customerEmail}
                  </div>
                  {(activeThread.lastIp || activeThread.lastGeo) && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                      {activeThread.lastGeo?.countryCode && (
                        <span
                          aria-label={
                            activeThread.lastGeo.country ??
                            activeThread.lastGeo.countryCode
                          }
                          title={
                            [
                              activeThread.lastGeo.city,
                              activeThread.lastGeo.region,
                              activeThread.lastGeo.country,
                            ]
                              .filter(Boolean)
                              .join(", ") || activeThread.lastGeo.countryCode
                          }
                          className="text-base leading-none"
                        >
                          {flagFromCountryCode(activeThread.lastGeo.countryCode)}
                        </span>
                      )}
                      <span className="truncate">
                        {[
                          activeThread.lastGeo?.city,
                          activeThread.lastGeo?.region,
                          activeThread.lastGeo?.country,
                        ]
                          .filter(Boolean)
                          .join(", ") || "Location unknown"}
                      </span>
                      {activeThread.lastIp && (
                        <span className="font-mono text-slate-400">
                          · {activeThread.lastIp}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleThreadStatus}
                    disabled={toggling}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50",
                      activeThread.status === "closed"
                        ? "border-fern/30 bg-fern/10 text-fern hover:bg-fern/15"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    {toggling
                      ? activeThread.status === "closed"
                        ? "Reopening…"
                        : "Closing…"
                      : activeThread.status === "closed"
                        ? "Reopen"
                        : "Close"}
                  </button>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => setActiveId(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </header>

              <div
                ref={messagesRef}
                className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4"
              >
                {loadingMessages && messages.length === 0 && (
                  <div className="py-6 text-center text-sm text-slate-500">
                    Loading messages…
                  </div>
                )}
                {!loadingMessages && messages.length === 0 && (
                  <div className="py-6 text-center text-sm text-slate-500">
                    No messages yet.
                  </div>
                )}
                {(() => {
                  // Index of the last admin-authored message that's been
                  // read by the customer — that's the only row we annotate
                  // with "Seen", so we don't litter the timeline.
                  let lastSeenIdx = -1
                  for (let i = messages.length - 1; i >= 0; i--) {
                    if (messages[i]!.senderRole === "admin" && messages[i]!.readAt) {
                      lastSeenIdx = i
                      break
                    }
                  }
                  return messages.map((m, i) => {
                    const mine = m.senderId === adminId
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex flex-col",
                          mine ? "items-end" : "items-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                            mine
                              ? "rounded-br-md bg-slate-900 text-white"
                              : "rounded-bl-md bg-white text-slate-900 ring-1 ring-slate-200",
                          )}
                        >
                          {m.attachment && (
                            <AttachmentBubble
                              attachment={m.attachment}
                              messageId={m.id}
                              mine={mine}
                              load={() =>
                                fetchAdminAttachment(m.threadId, m.id)
                              }
                            />
                          )}
                          {m.body && (
                            <p className="whitespace-pre-wrap break-words">
                              {m.body}
                            </p>
                          )}
                          <div
                            className={cn(
                              "mt-1 text-[10px]",
                              mine ? "text-white/70" : "text-slate-400",
                            )}
                          >
                            {new Date(m.createdAt).toLocaleString()}
                          </div>
                        </div>
                        {i === lastSeenIdx && (
                          <div className="mt-1 mr-1 text-[10px] font-semibold text-slate-400">
                            Seen{m.readAt
                              ? ` · ${new Date(m.readAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                              : ""}
                          </div>
                        )}
                      </div>
                    )
                  })
                })()}
                {customerTyping && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md bg-white px-3 py-2 ring-1 ring-slate-200">
                      <TypingDots />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
                  {error}
                </div>
              )}

              {pendingFile && (
                <div className="border-t border-slate-200 bg-white pt-2">
                  <PendingAttachment
                    file={pendingFile}
                    preview={pendingPreview}
                    onRemove={clearPending}
                    disabled={sending}
                  />
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void send()
                }}
                className={cn(
                  "flex items-end gap-2 bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
                  !pendingFile && "border-t border-slate-200",
                )}
              >
                {/* Guest (logged-out) threads are text-only — no userId means
                    the visitor can't authenticate an attachment download. */}
                {activeThread.userId && (
                  <>
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
                      disabled={sending || activeThread.status === "closed"}
                      aria-label="Attach a file"
                      title="Attach an image, PDF, or Word document"
                      className={cn(
                        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition",
                        sending || activeThread.status === "closed"
                          ? "bg-slate-200 text-slate-400"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                      )}
                    >
                      <Paperclip className="h-4 w-4" aria-hidden />
                    </button>
                  </>
                )}
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
                  placeholder={pendingFile ? "Add a caption…" : "Type a reply…"}
                  className="max-h-32 flex-1 resize-none rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 ring-1 ring-slate-200 focus:outline-none focus:ring-slate-400"
                />
                <button
                  type="submit"
                  disabled={
                    (!draft.trim() && !pendingFile) ||
                    sending ||
                    activeThread.status === "closed"
                  }
                  aria-label="Send reply"
                  className={cn(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition",
                    (draft.trim() || pendingFile) &&
                      !sending &&
                      activeThread.status !== "closed"
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "bg-slate-200 text-slate-400",
                  )}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </form>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** ISO-3166 alpha-2 → flag emoji via regional-indicator codepoints.
 *  Returns an empty string for invalid input so the caller can omit. */
function flagFromCountryCode(code: string | null | undefined): string {
  if (!code || code.length !== 2 || !/^[A-Za-z]{2}$/.test(code)) return ""
  const base = 0x1f1e6 // 🇦
  const A = "A".charCodeAt(0)
  return String.fromCodePoint(
    base + (code.toUpperCase().charCodeAt(0) - A),
    base + (code.toUpperCase().charCodeAt(1) - A),
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Typing">
      <div className="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.3s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.15s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-slate-500" />
    </div>
  )
}
