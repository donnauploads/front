"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CalendarClock,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat2,
  Trash2,
  X,
} from "lucide-react"
import { format } from "date-fns"
import { useStore } from "@/lib/store"
import type { Account, RecurringTransfer } from "@/lib/store"
import { formatNumericInput, unformatNumericInput } from "@/lib/utils"
import { Toast } from "@/components/ui/Toast"
import { ApiError } from "@/lib/api/errors"
import { AuthorizeTransfer } from "@/components/security/AuthorizeTransfer"
import {
  createRecurringTransfer,
  deleteRecurringTransfer,
  listRecurringTransfers,
  updateRecurringTransfer,
  type RecurringTransferDto,
} from "@/lib/move/api/recurring.real"

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function RecurringPage() {
  const router = useRouter()
  const list = useStore((s) => s.recurringTransfers)
  const setList = useStore((s) => s.setRecurringTransfers)
  const upsertRt = useStore((s) => s.upsertRecurringTransfer)
  const deleteRt = useStore((s) => s.deleteRecurringTransfer)
  const accounts = useStore((s) => s.accounts)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringTransfer | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [toast, setToast] = useState({ open: false, msg: "" })

  const [pendingCreate, setPendingCreate] = useState<EditorOutput | null>(null)
  const [authOpen, setAuthOpen] = useState(false)

  const accountById = useMemo(() => {
    const m = new Map<string, Account>()
    for (const a of accounts) m.set(a.id, a)
    return m
  }, [accounts])
  const labelFor = useCallback(
    (id: string) => accountById.get(id)?.label ?? id.slice(0, 8),
    [accountById],
  )

  const refresh = useCallback(async () => {
    setLoadErr(null)
    try {
      const rows = await listRecurringTransfers()
      setList(rows.map((r) => dtoToStore(r, labelFor)))
    } catch (e) {
      setLoadErr(
        e instanceof ApiError ? e.message : "Couldn't load recurring transfers.",
      )
    } finally {
      setLoading(false)
    }
  }, [labelFor, setList])

  useEffect(() => {
    void refresh()
  }, [refresh])

  function flash(msg: string) {
    setToast({ open: true, msg })
    setTimeout(() => setToast({ open: false, msg: "" }), 3500)
  }

  function openNew() {
    setEditing(null)
    setEditorOpen(true)
  }

  function openEdit(rt: RecurringTransfer) {
    setEditing(rt)
    setEditorOpen(true)
  }

  async function handleSave(input: EditorOutput) {
    if (editing) {
      try {
        const updated = await updateRecurringTransfer(editing.id, {
          amountCents: String(Math.round(input.amount * 100)),
          frequency: input.frequency,
          dayOf: input.dayOf,
        })
        upsertRt(dtoToStore(updated, labelFor))
        flash("Recurring transfer updated")
        setEditorOpen(false)
      } catch (e) {
        flash(e instanceof ApiError ? e.message : "Save failed, try again.")
      }
      return
    }

    setPendingCreate(input)
    setAuthOpen(true)
  }

  async function runCreateWithToken(elevationToken: string) {
    if (!pendingCreate) return
    const created = await createRecurringTransfer({
      fromAccountId: pendingCreate.fromId,
      toAccountId: pendingCreate.toId,
      amountCents: String(Math.round(pendingCreate.amount * 100)),
      frequency: pendingCreate.frequency,
      dayOf: pendingCreate.dayOf,
      elevationToken,
    })
    upsertRt(dtoToStore(created, labelFor))
    setEditorOpen(false)
    setPendingCreate(null)
    flash("Recurring transfer created")
  }

  async function handleDelete(rt: RecurringTransfer) {
    setBusyId(rt.id)
    try {
      await deleteRecurringTransfer(rt.id)
      deleteRt(rt.id)
      flash("Recurring transfer deleted")
    } catch (e) {
      flash(e instanceof ApiError ? e.message : "Couldn't delete, try again.")
    } finally {
      setBusyId(null)
    }
  }

  async function handleTogglePause(rt: RecurringTransfer) {
    setBusyId(rt.id)
    const nextActive = !rt.active
    try {
      const updated = await updateRecurringTransfer(rt.id, { active: nextActive })
      upsertRt(dtoToStore(updated, labelFor))
      flash(nextActive ? "Resumed" : "Paused")
    } catch (e) {
      flash(e instanceof ApiError ? e.message : "Couldn't update, try again.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => router.back()}
        className="view-back"
        aria-label="Back"
      >
        <ArrowLeft aria-hidden /> Back
      </button>

      <div
        className="page-head"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <h2>Recurring transfers</h2>
          <p className="ph-sub">
            Automate weekly, biweekly, or monthly money moves.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          disabled={accounts.length < 2}
          className="li-act gold"
          style={{
            height: 36,
            padding: "0 14px",
            opacity: accounts.length < 2 ? 0.5 : 1,
            cursor: accounts.length < 2 ? "not-allowed" : "pointer",
          }}
        >
          <Plus width={14} height={14} aria-hidden />
          New
        </button>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-body">
          {loading && (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                fontSize: 14,
                color: "var(--ink-mute)",
              }}
            >
              Loading…
            </div>
          )}
          {!loading && loadErr && (
            <div className="card-error" role="alert">
              {loadErr}
            </div>
          )}
          {!loading && !loadErr && list.length === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                fontSize: 14,
                color: "var(--ink-mute)",
              }}
            >
              No recurring transfers yet.
            </div>
          )}
          {!loading &&
            list.map((rt) => (
              <div key={rt.id} className="set-row" style={{ gap: 12 }}>
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "var(--gold-soft)",
                    color: "var(--gold-deep)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  aria-hidden
                >
                  <Repeat2 width={18} height={18} />
                </span>
                <div className="sr-l" style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div
                      className="sn"
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {rt.fromLabel} → {rt.toLabel}
                    </div>
                    <div
                      style={{
                        flexShrink: 0,
                        fontFamily: "ui-monospace, Menlo, monospace",
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--text-strong)",
                      }}
                    >
                      ${rt.amount.toFixed(2)}
                    </div>
                  </div>
                  <div
                    className="sd"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 2,
                    }}
                  >
                    <span>
                      {labelFrequency(rt)} · Next{" "}
                      {format(new Date(rt.nextRun), "MMM d")}
                    </span>
                    {!rt.active && (
                      <span className="li-pill pending">Paused</span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    aria-label={rt.active ? "Pause" : "Resume"}
                    disabled={busyId === rt.id}
                    onClick={() => handleTogglePause(rt)}
                    className={rt.active ? "li-act" : "li-act gold"}
                    style={{
                      width: 36,
                      height: 36,
                      padding: 0,
                      justifyContent: "center",
                      opacity: busyId === rt.id ? 0.5 : 1,
                    }}
                  >
                    {rt.active ? (
                      <Pause width={14} height={14} aria-hidden />
                    ) : (
                      <Play width={14} height={14} aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Edit"
                    onClick={() => openEdit(rt)}
                    className="li-act"
                    style={{
                      width: 36,
                      height: 36,
                      padding: 0,
                      justifyContent: "center",
                    }}
                  >
                    <Pencil width={14} height={14} aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete"
                    disabled={busyId === rt.id}
                    onClick={() => handleDelete(rt)}
                    className="li-act warn"
                    style={{
                      width: 36,
                      height: 36,
                      padding: 0,
                      justifyContent: "center",
                      opacity: busyId === rt.id ? 0.5 : 1,
                    }}
                  >
                    <Trash2 width={14} height={14} aria-hidden />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {!loading && accounts.length < 2 && (
        <p
          style={{
            marginTop: 14,
            textAlign: "center",
            fontSize: 12,
            color: "var(--ink-mute)",
          }}
        >
          You need at least two accounts to schedule a recurring transfer.
        </p>
      )}

      <RecurringEditor
        open={editorOpen}
        initial={editing}
        accounts={accounts}
        onClose={() => {
          setEditorOpen(false)
          setPendingCreate(null)
        }}
        onSave={handleSave}
      />

      <AuthorizeTransfer
        open={authOpen}
        amountLabel={
          pendingCreate ? `$${pendingCreate.amount.toFixed(2)} recurring` : undefined
        }
        processingLabel="Scheduling…"
        processingSubLabel="Saving your recurring transfer"
        successLabel="Scheduled"
        successSubLabel="Your recurring transfer is active"
        onCancel={() => {
          setAuthOpen(false)
          setPendingCreate(null)
        }}
        onAuthorized={runCreateWithToken}
      />

      <Toast open={toast.open} message={toast.msg} />
    </>
  )
}

function labelFrequency(rt: RecurringTransfer): string {
  if (rt.frequency === "weekly") return `Every ${DOW[rt.dayOf] ?? "week"}`
  if (rt.frequency === "biweekly") return `Every other ${DOW[rt.dayOf] ?? "week"}`
  return `Monthly on the ${rt.dayOf}${ordinalSuffix(rt.dayOf)}`
}

function ordinalSuffix(n: number) {
  if (n >= 11 && n <= 13) return "th"
  switch (n % 10) {
    case 1: return "st"
    case 2: return "nd"
    case 3: return "rd"
    default: return "th"
  }
}

/* ---------- Editor modal ---------- */

type EditorOutput = {
  fromId: string
  toId: string
  amount: number
  frequency: RecurringTransfer["frequency"]
  dayOf: number
}

function RecurringEditor({
  open,
  initial,
  accounts,
  onClose,
  onSave,
}: {
  open: boolean
  initial: RecurringTransfer | null
  accounts: Account[]
  onClose: () => void
  onSave: (output: EditorOutput) => void | Promise<void>
}) {
  const firstId = accounts[0]?.id ?? ""
  const secondId = accounts[1]?.id ?? firstId

  const [frequency, setFrequency] = useState<RecurringTransfer["frequency"]>(
    initial?.frequency ?? "weekly",
  )
  const [dayOf, setDayOf] = useState<number>(initial?.dayOf ?? 1)
  const [amount, setAmount] = useState<string>(
    initial ? initial.amount.toString() : "",
  )
  const [fromId, setFromId] = useState<string>(initial?.fromId ?? firstId)
  const [toId, setToId] = useState<string>(initial?.toId ?? secondId)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setFrequency(initial?.frequency ?? "weekly")
    setDayOf(initial?.dayOf ?? 1)
    setAmount(initial ? initial.amount.toString() : "")
    setFromId(initial?.fromId ?? firstId)
    setToId(initial?.toId ?? secondId)
    setSaving(false)
  }, [open, initial, firstId, secondId])

  if (!open) return null

  const parsedAmount = parseFloat(unformatNumericInput(amount))
  const valid =
    parsedAmount > 0 &&
    !!fromId &&
    !!toId &&
    fromId !== toId

  async function save() {
    if (!valid || saving) return
    setSaving(true)
    try {
      await onSave({
        fromId,
        toId,
        amount: parsedAmount,
        frequency,
        dayOf,
      })
    } finally {
      setSaving(false)
    }
  }

  const isEditing = !!initial

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,.55)",
          border: 0,
          cursor: "pointer",
        }}
      />
      <div
        className="panel"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 460,
          padding: 22,
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-strong)",
            }}
          >
            {isEditing ? "Edit recurring" : "New recurring transfer"}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="li-act"
            style={{ width: 32, height: 32, padding: 0, justifyContent: "center" }}
          >
            <X width={14} height={14} aria-hidden />
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <AccountSelect
              label="From"
              value={fromId}
              accounts={accounts}
              disabled={isEditing}
              onChange={setFromId}
            />
            <AccountSelect
              label="To"
              value={toId}
              accounts={accounts}
              disabled={isEditing}
              onChange={setToId}
            />
          </div>
          {fromId && toId && fromId === toId && (
            <div className="card-error" role="alert">
              Source and destination must be different accounts.
            </div>
          )}

          <label style={{ display: "block" }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
              }}
            >
              Amount
            </div>
            <div
              style={{
                marginTop: 6,
                display: "flex",
                alignItems: "center",
                gap: 4,
                borderRadius: 12,
                background: "var(--gold-soft)",
                padding: "0 12px",
                border: "1px solid var(--line)",
              }}
            >
              <span style={{ fontSize: 14, color: "var(--ink-mute)" }}>$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="25.00"
                value={amount}
                onChange={(e) => setAmount(formatNumericInput(e.target.value))}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: 0,
                  padding: "10px 0",
                  fontSize: 14,
                  color: "var(--text-strong)",
                  outline: "none",
                }}
              />
            </div>
          </label>

          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
              }}
            >
              Frequency
            </div>
            <div
              style={{
                marginTop: 8,
                display: "inline-flex",
                width: "100%",
                borderRadius: 999,
                background: "var(--gold-soft)",
                padding: 4,
                border: "1px solid var(--line)",
              }}
            >
              {(
                [
                  ["weekly", "Weekly"],
                  ["biweekly", "Biweekly"],
                  ["monthly", "Monthly"],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFrequency(k)}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    background: frequency === k ? "var(--gold-deep)" : "transparent",
                    color: frequency === k ? "#fff" : "var(--ink-mute)",
                    border: 0,
                    cursor: "pointer",
                    transition: "background .15s ease",
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
              }}
            >
              {frequency === "monthly" ? "Day of month" : "Day of week"}
            </div>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {frequency === "monthly"
                ? Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDayOf(d)}
                      style={dayBtnStyle(dayOf === d, false)}
                    >
                      {d}
                    </button>
                  ))
                : DOW.map((d, i) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDayOf(i)}
                      style={dayBtnStyle(dayOf === i, true)}
                    >
                      {d}
                    </button>
                  ))}
            </div>
          </div>

          {valid && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 12,
                background: "var(--gold-soft)",
                padding: "8px 12px",
                fontSize: 12,
                color: "var(--ink-soft)",
                border: "1px solid var(--line)",
              }}
            >
              <CalendarClock width={16} height={16} aria-hidden />
              Next run · {format(new Date(nextRunFor(frequency, dayOf)), "EEE, MMM d")}
            </div>
          )}

          <button
            type="button"
            disabled={!valid || saving}
            onClick={save}
            className="lk-cta-btn primary"
            style={{
              marginTop: 4,
              opacity: !valid || saving ? 0.6 : 1,
              cursor: !valid || saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? (
              <span
                aria-label="Saving"
                className="animate-spin"
                style={{
                  display: "block",
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,.4)",
                  borderTopColor: "#fff",
                }}
              />
            ) : isEditing ? (
              "Save changes"
            ) : (
              "Schedule"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function dayBtnStyle(active: boolean, wide: boolean): React.CSSProperties {
  return {
    height: 36,
    width: wide ? "auto" : 36,
    padding: wide ? "0 12px" : 0,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: active ? "var(--gold-deep)" : "var(--surface)",
    color: active ? "#fff" : "var(--ink-mute)",
    border: `1px solid ${active ? "var(--gold-deep)" : "var(--line)"}`,
    cursor: "pointer",
    transition: "background .15s ease",
  }
}

function AccountSelect({
  label,
  value,
  accounts,
  disabled,
  onChange,
}: {
  label: string
  value: string
  accounts: Account[]
  disabled?: boolean
  onChange: (id: string) => void
}) {
  return (
    <label
      style={{
        display: "block",
        borderRadius: 12,
        background: "var(--surface)",
        padding: 12,
        border: "1px solid var(--line)",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
        }}
      >
        {label}
      </div>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          marginTop: 4,
          width: "100%",
          background: "transparent",
          border: 0,
          fontSize: 13,
          fontWeight: 700,
          color: "var(--text-strong)",
          outline: "none",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {accounts.length === 0 && <option value="">No accounts</option>}
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function nextRunFor(
  frequency: RecurringTransfer["frequency"],
  dayOf: number,
): string {
  const now = new Date()
  const d = new Date(now)
  if (frequency === "monthly") {
    d.setDate(dayOf)
    if (d <= now) d.setMonth(d.getMonth() + 1)
  } else {
    const targetDow = dayOf
    const diff = (targetDow - d.getDay() + 7) % 7 || 7
    d.setDate(d.getDate() + diff)
    if (frequency === "biweekly") d.setDate(d.getDate() + 7)
  }
  d.setHours(9, 0, 0, 0)
  return d.toISOString()
}

function dtoToStore(
  r: RecurringTransferDto,
  labelFor: (id: string) => string,
): RecurringTransfer {
  return {
    id: r.id,
    fromId: r.fromAccountId,
    fromLabel: labelFor(r.fromAccountId),
    toId: r.toAccountId,
    toLabel: labelFor(r.toAccountId),
    amount: Number(r.amountCents) / 100,
    frequency: r.frequency,
    dayOf: r.dayOf,
    nextRun: r.nextRunAt,
    active: r.active,
  }
}
