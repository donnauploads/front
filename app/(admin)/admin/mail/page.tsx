"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  ArrowLeft,
  Loader2,
  Mail,
  Paperclip,
  PenSquare,
  Search,
  Send,
  X,
  Check,
  RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { RichTextEditor } from "@/components/admin/RichTextEditor"
import {
  listMailDesks,
  listMailThreads,
  getMailThread,
  sendMail,
  replyMail,
  closeMailThread,
  reopenMailThread,
  uploadMailAttachment,
  mailAttachmentUrl,
  type MailDesk,
  type MailDeskOption,
  type MailThread,
  type MailMessage,
  type MailThreadStatus,
  type StagedAttachment,
} from "@/lib/admin/api/mail.real"
import { searchAdminUsers, type AdminUserRow } from "@/lib/admin/api/users.real"
import { getSocket, peekSocket } from "@/lib/realtime/socket"

const STATUS_TABS: Array<{ key: MailThreadStatus | "all"; label: string }> = [
  { key: "open", label: "Open" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
]

export default function AdminMailPage() {
  const [desks, setDesks] = useState<MailDeskOption[]>([])
  const [threads, setThreads] = useState<MailThread[]>([])
  const [loading, setLoading] = useState(true)
  const [deskFilter, setDeskFilter] = useState<MailDesk | "all">("all")
  const [statusFilter, setStatusFilter] = useState<MailThreadStatus | "all">("open")
  const [q, setQ] = useState("")
  const [debouncedQ, setDebouncedQ] = useState("")

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  // Bumped on every realtime mail change so the open conversation reloads.
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    listMailDesks().then(setDesks).catch(() => setDesks([]))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  const loadThreads = useCallback(() => {
    setLoading(true)
    listMailThreads({
      desk: deskFilter === "all" ? undefined : deskFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      q: debouncedQ || undefined,
    })
      .then((rows) => setThreads(rows))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false))
  }, [deskFilter, statusFilter, debouncedQ])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  // Live updates: the backend emits `admin.queue.changed` whenever a customer
  // reply lands (and on sends). Re-pull the thread list and nudge the open
  // conversation to reload so inbound replies appear without a manual refresh.
  useEffect(() => {
    let sock = peekSocket()
    if (!sock) sock = getSocket()
    const onChange = () => {
      loadThreads()
      setRefreshTick((t) => t + 1)
    }
    sock.on("admin.queue.changed", onChange)
    return () => {
      sock?.off("admin.queue.changed", onChange)
    }
  }, [loadThreads])

  const deskLabel = useMemo(() => {
    const m = new Map(desks.map((d) => [d.desk, d.label]))
    return (d: MailDesk) => m.get(d) ?? d
  }, [desks])

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-slate-700" />
          <h1 className="text-lg font-semibold text-slate-900">Mail</h1>
        </div>
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <PenSquare className="h-4 w-4" />
          Compose
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left: filters + thread list. On mobile this is the whole screen
            until a thread is opened; on md+ it's a fixed-width rail. */}
        <div
          className={cn(
            "flex-col border-r border-slate-200",
            "w-full md:w-96 md:flex-shrink-0",
            selectedId ? "hidden md:flex" : "flex",
          )}
        >
          <div className="space-y-2 border-b border-slate-200 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search subject, recipient…"
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>
            <div className="flex gap-1">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setStatusFilter(t.key)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
                    statusFilter === t.key
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <select
              value={deskFilter}
              onChange={(e) => setDeskFilter(e.target.value as MailDesk | "all")}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
            >
              <option value="all">All desks</option>
              {desks.map((d) => (
                <option key={d.desk} value={d.desk}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : threads.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">
                No conversations yet.
              </p>
            ) : (
              threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    "block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50",
                    selectedId === t.id && "bg-slate-50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("truncate text-sm", t.unread ? "font-bold text-slate-900" : "font-medium text-slate-700")}>
                      {t.toName || t.toEmail}
                    </span>
                    {t.lastMessageAt && (
                      <span className="flex-shrink-0 text-[11px] text-slate-400">
                        {formatDistanceToNow(new Date(t.lastMessageAt), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {t.unread && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-rose-500" />}
                    <span className="truncate text-xs font-medium text-slate-600">{t.subject}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-slate-400">
                      {t.lastDirection === "inbound" ? "↩ " : ""}
                      {t.lastSnippet ?? ""}
                    </span>
                    <span className="flex-shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                      {deskLabel(t.desk)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: conversation. Hidden on mobile until a thread is opened. */}
        <div
          className={cn(
            "min-h-0 min-w-0 flex-1",
            selectedId ? "flex flex-col" : "hidden md:flex md:flex-col",
          )}
        >
          {selectedId ? (
            <ThreadPane
              key={selectedId}
              threadId={selectedId}
              deskLabel={deskLabel}
              onChanged={loadThreads}
              onBack={() => setSelectedId(null)}
              refreshTick={refreshTick}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-slate-400">
              <Mail className="h-10 w-10" />
              <p className="mt-2 text-sm">Select a conversation</p>
            </div>
          )}
        </div>
      </div>

      {composeOpen && (
        <ComposeModal
          desks={desks}
          onClose={() => setComposeOpen(false)}
          onSent={(threadId) => {
            setComposeOpen(false)
            loadThreads()
            setSelectedId(threadId)
          }}
        />
      )}
    </div>
  )
}

// ─── Conversation pane ────────────────────────────────────────────────────

function ThreadPane({
  threadId,
  deskLabel,
  onChanged,
  onBack,
  refreshTick,
}: {
  threadId: string
  deskLabel: (d: MailDesk) => string
  onChanged: () => void
  onBack: () => void
  refreshTick: number
}) {
  const [thread, setThread] = useState<MailThread | null>(null)
  const [messages, setMessages] = useState<MailMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [replyHtml, setReplyHtml] = useState("")
  const [staged, setStaged] = useState<StagedAttachment[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    setLoading(true)
    getMailThread(threadId)
      .then(({ thread, messages }) => {
        setThread(thread)
        setMessages(messages)
      })
      .catch(() => setError("Couldn't load this conversation."))
      .finally(() => setLoading(false))
  }, [threadId])

  // Reload on mount, on thread switch, and whenever the parent bumps
  // refreshTick (a realtime mail change arrived).
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, refreshTick])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" })
  }, [messages])

  async function onSendReply() {
    if (!replyHtml.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      const msg = await replyMail(threadId, { bodyHtml: replyHtml, attachments: staged })
      setMessages((m) => [...m, msg])
      setReplyHtml("")
      setStaged([])
      onChanged()
    } catch {
      setError("Failed to send reply.")
    } finally {
      setSending(false)
    }
  }

  async function toggleStatus() {
    if (!thread) return
    const fn = thread.status === "open" ? closeMailThread : reopenMailThread
    const res = await fn(threadId)
    setThread({ ...thread, status: res.status })
    onChanged()
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }
  if (!thread) {
    return <div className="flex h-full items-center justify-center text-slate-400">{error ?? "Not found"}</div>
  }

  return (
    <div className="flex h-full flex-col">
      {/* thread header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={onBack}
            aria-label="Back to inbox"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 md:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{thread.subject}</p>
            <p className="truncate text-xs text-slate-500">
              {thread.toName ? `${thread.toName} · ` : ""}
              {thread.toEmail} · {deskLabel(thread.desk)}
            </p>
          </div>
        </div>
        <button
          onClick={toggleStatus}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          {thread.status === "open" ? <Check className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
          {thread.status === "open" ? "Close" : "Reopen"}
        </button>
      </div>

      {/* messages */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} m={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* reply box */}
      {thread.status === "open" ? (
        <div className="border-t border-slate-200 p-3">
          {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}
          <RichTextEditor value={replyHtml} onChange={setReplyHtml} placeholder="Write a reply…" minHeight={90} />
          <AttachmentRow staged={staged} setStaged={setStaged} />
          <div className="mt-2 flex justify-end">
            <button
              onClick={onSendReply}
              disabled={sending || !replyHtml.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send reply
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-slate-200 px-4 py-3 text-center text-xs text-slate-400">
          This conversation is closed. Reopen it to reply.
        </div>
      )}
    </div>
  )
}

function MessageBubble({ m }: { m: MailMessage }) {
  const outbound = m.direction === "outbound"
  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl border px-4 py-3 shadow-sm",
          outbound ? "border-slate-200 bg-white" : "border-amber-200 bg-amber-50",
        )}
      >
        <div className="mb-1 flex items-center gap-2 text-[11px] text-slate-400">
          <span className="font-semibold text-slate-500">
            {outbound ? m.fromName || m.fromEmail : `${m.fromName || m.fromEmail} (customer)`}
          </span>
          <span>· {new Date(m.createdAt).toLocaleString()}</span>
        </div>
        <div
          className="prose prose-sm max-w-none text-slate-800"
          // Server-sanitized HTML (sanitize-html in mail.service).
          dangerouslySetInnerHTML={{ __html: m.bodyHtml }}
        />
        {m.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {m.attachments.map((a) => (
              <a
                key={a.id}
                href={mailAttachmentUrl(a.id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                <Paperclip className="h-3 w-3" />
                {a.filename}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Attachments (shared by composer + reply) ──────────────────────────────

function AttachmentRow({
  staged,
  setStaged,
}: {
  staged: StagedAttachment[]
  setStaged: React.Dispatch<React.SetStateAction<StagedAttachment[]>>
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function onPick(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const meta = await uploadMailAttachment(file)
        setStaged((s) => [...s, meta])
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <input ref={inputRef} type="file" multiple hidden onChange={(e) => onPick(e.target.files)} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
        Attach
      </button>
      {staged.map((a, i) => (
        <span key={a.storageKey} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
          {a.filename}
          <button type="button" onClick={() => setStaged((s) => s.filter((_, j) => j !== i))} className="text-slate-400 hover:text-slate-700">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  )
}

// ─── Compose modal ─────────────────────────────────────────────────────────

function ComposeModal({
  desks,
  onClose,
  onSent,
}: {
  desks: MailDeskOption[]
  onClose: () => void
  onSent: (threadId: string) => void
}) {
  const [desk, setDesk] = useState<MailDesk | "">("")
  const [mode, setMode] = useState<"customer" | "free">("customer")
  const [toUserId, setToUserId] = useState<string | undefined>()
  const [toEmail, setToEmail] = useState("")
  const [toName, setToName] = useState("")
  const [subject, setSubject] = useState("")
  const [greeting, setGreeting] = useState("")
  const [bodyHtml, setBodyHtml] = useState("")
  const [signature, setSignature] = useState("")
  const [staged, setStaged] = useState<StagedAttachment[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!desk && desks.length) setDesk(desks[0].desk)
  }, [desks, desk])

  const canSend = desk && toEmail.trim() && subject.trim() && bodyHtml.trim() && !sending

  async function onSubmit() {
    if (!canSend || !desk) return
    setSending(true)
    setError(null)
    try {
      const { thread } = await sendMail({
        desk,
        toUserId: mode === "customer" ? toUserId : undefined,
        toEmail: toEmail.trim(),
        toName: toName.trim() || undefined,
        subject: subject.trim(),
        greeting: greeting.trim() || undefined,
        bodyHtml,
        signature: signature.trim() || undefined,
        attachments: staged,
      })
      onSent(thread.id)
    } catch {
      setError("Failed to send. Check the recipient and try again.")
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-base font-semibold text-slate-900">New message</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          {/* Desk (sender identity) */}
          <Field label="Send as">
            <select
              value={desk}
              onChange={(e) => setDesk(e.target.value as MailDesk)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              {desks.map((d) => (
                <option key={d.desk} value={d.desk}>
                  {d.label} — {d.fromEmail}
                </option>
              ))}
            </select>
          </Field>

          {/* Recipient */}
          <Field label="To">
            <div className="mb-1.5 flex gap-1 text-xs">
              <ModeTab active={mode === "customer"} onClick={() => setMode("customer")}>Customer</ModeTab>
              <ModeTab active={mode === "free"} onClick={() => setMode("free")}>Other address</ModeTab>
            </div>
            {mode === "customer" ? (
              <RecipientPicker
                onPick={(u) => {
                  setToUserId(u.id)
                  setToEmail(u.email)
                  setToName([u.firstName, u.lastName].filter(Boolean).join(" "))
                }}
                selectedEmail={toEmail}
              />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={toEmail}
                  onChange={(e) => { setToEmail(e.target.value); setToUserId(undefined) }}
                  placeholder="Email@example.com"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
                <input
                  value={toName}
                  onChange={(e) => setToName(e.target.value)}
                  placeholder="Name (optional)"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>
            )}
          </Field>

          <Field label="Subject">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </Field>

          <Field label="Greeting (optional)">
            <input
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder="Dear Mr. Ahmed,"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </Field>

          <Field label="Message">
            <RichTextEditor value={bodyHtml} onChange={setBodyHtml} placeholder="Write your message…" minHeight={160} />
          </Field>

          <Field label="Signature (optional)">
            <textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              rows={2}
              placeholder={"Warm regards,\nCustomer Care Team"}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </Field>

          <AttachmentRow staged={staged} setStaged={setStaged} />

          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3.5">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!canSend}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

function RecipientPicker({
  onPick,
  selectedEmail,
}: {
  onPick: (u: AdminUserRow) => void
  selectedEmail: string
}) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<AdminUserRow[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!q.trim()) {
      setResults([])
      return
    }
    const t = setTimeout(() => {
      setLoading(true)
      searchAdminUsers({ q: q.trim(), limit: 8 })
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={selectedEmail || "Search by name, email, $tag…"}
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-slate-400 focus:outline-none"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
      </div>
      {selectedEmail && !open && (
        <p className="mt-1 text-xs text-emerald-600">Selected: {selectedEmail}</p>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => { onPick(u); setOpen(false); setQ("") }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span className="font-medium text-slate-800">
                {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}
              </span>
              <span className="block text-xs text-slate-400">{u.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      {children}
    </div>
  )
}

function ModeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 font-medium transition",
        active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
      )}
    >
      {children}
    </button>
  )
}
