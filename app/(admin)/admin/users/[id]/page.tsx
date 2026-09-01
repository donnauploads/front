"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, ArrowLeft, Ban, Banknote, Check, Eye, EyeOff, KeyRound, Loader2, Lock, MailX, MessageSquare, Monitor, Pencil, Power, Send, ShieldCheck, Trash2, UserX, Wallet, X } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api/errors"
import { useToast } from "@/components/providers/ToastProvider"
import { useIsAtLeast } from "@/components/admin/RoleGate"
import {
  activateAdminUser,
  deactivateAdminUser,
  deleteAdminUser,
  displayNameOf,
  forceUserPasswordReset,
  getAdminUser,
  listAdminUserSessions,
  resetAdminUserHistory,
  resetUserLoginHistory,
  revokeAllUserSessions,
  sendUserMessage,
  setAdminUserPassword,
  setUserEmailNotificationsDisabled,
  setUserTransfersDisabled,
  updateAdminUser,
  type AdminMessageChannel,
  type AdminUserAccount,
  type AdminUserDetail,
  type AdminUserSession,
  type AdminUserStatus,
} from "@/lib/admin/api/users.real"
import { createAdminTransaction } from "@/lib/admin/api/transactions.real"
import type { Role } from "@/lib/store"

/**
 * Admin user detail. Stage A: real fetch + profile / accounts / activity
 * overview. Sessions card, editable personal info, and admin actions
 * (activate/deactivate, reset password, reset history) land in subsequent
 * stages.
 */
export default function UserDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id ?? ""
  const isSuperadmin = useIsAtLeast("superadmin")

  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Sessions are loaded in parallel with the main user fetch — failure to
  // load them is non-fatal (the section renders an inline message), so we
  // keep their state separate from the page's hard error.
  const [sessions, setSessions] = useState<AdminUserSession[] | null>(null)
  const [sessionsError, setSessionsError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    setSessions(null)
    setSessionsError(null)
    try {
      const [userData, sessionRows] = await Promise.all([
        getAdminUser(id),
        listAdminUserSessions(id, 3).catch((err) => {
          setSessionsError(
            err instanceof Error
              ? err.message || "Couldn't load sessions."
              : "Couldn't load sessions.",
          )
          return [] as AdminUserSession[]
        }),
      ])
      setUser(userData)
      setSessions(sessionRows)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message || "Couldn't load user."
          : "Couldn't load user.",
      )
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-10 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading…
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {error ?? "User not found."}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <BackLink />

      <ProfileCard user={user} />

      <AccountsGrid
        accounts={user.accounts}
        onAdjusted={(accountId, newBalanceCents) =>
          setUser((prev) =>
            prev
              ? {
                  ...prev,
                  accounts: prev.accounts.map((a) =>
                    a.id === accountId
                      ? { ...a, balanceCents: newBalanceCents }
                      : a,
                  ),
                }
              : prev,
          )
        }
      />

      <ActivityRow userId={user.id} />

      <SessionsCard
        sessions={sessions}
        error={sessionsError}
        userId={user.id}
        onChanged={() => void load()}
      />

      <PersonalInfoCard
        user={user}
        onUpdated={(fresh) =>
          setUser((prev) => (prev ? { ...prev, ...fresh } : prev))
        }
      />

      <AccountActionsCard
        user={user}
        onStatusChanged={(status) =>
          setUser((prev) => (prev ? { ...prev, status } : prev))
        }
        onHistoryReset={() => void load()}
        onDeleted={() => router.replace("/admin/users")}
        onTransfersBlockChanged={(disabled, reason) =>
          setUser((prev) =>
            prev
              ? {
                  ...prev,
                  transfersDisabled: disabled,
                  transfersDisabledReason: reason,
                  transfersDisabledAt: disabled ? new Date().toISOString() : null,
                }
              : prev,
          )
        }
        onEmailNotificationsChanged={(disabled, reason) =>
          setUser((prev) =>
            prev
              ? {
                  ...prev,
                  emailNotificationsDisabled: disabled,
                  emailNotificationsDisabledReason: reason,
                  emailNotificationsDisabledAt: disabled
                    ? new Date().toISOString()
                    : null,
                }
              : prev,
          )
        }
        canDelete={true}
      />
    </div>
  )
}

// ─── Sections ────────────────────────────────────────────────────────────

function BackLink() {
  return (
    <Link
      href="/admin/users"
      className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:underline"
    >
      <ArrowLeft className="h-4 w-4" /> Back to users
    </Link>
  )
}

function ProfileCard({ user }: { user: AdminUserDetail }) {
  const name = displayNameOf(user)
  const initials = initialsOf(user.firstName, user.lastName, user.email)
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-base font-bold text-white sm:h-16 sm:w-16">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-bold text-slate-900 sm:text-xl">
            {name}
          </div>
          <div className="truncate text-sm text-slate-500">{user.email}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <RolePill role={user.role} />
            <StatusPill status={user.status} />
            <KycPill record={user.kycRecord} />
          </div>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <Kv k="$tag" v={user.novaTag ?? "—"} mono />
        <Kv k="Phone" v={user.phoneE164 ?? "—"} mono />
        <Kv
          k="Date of birth"
          v={user.dob ? format(new Date(user.dob), "MMM d, yyyy") : "—"}
        />
        <Kv
          k="Member since"
          v={format(new Date(user.createdAt), "MMM d, yyyy")}
        />
        <Kv k="User ID" v={user.id} mono />
      </dl>
    </div>
  )
}

function AccountsGrid({
  accounts,
  onAdjusted,
}: {
  accounts: AdminUserAccount[]
  onAdjusted: (accountId: string, newBalanceCents: string) => void
}) {
  const [adjust, setAdjust] = useState<AdminUserAccount | null>(null)
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Accounts</h2>
        <span className="text-xs text-slate-500">
          {accounts.length} total
        </span>
      </div>
      {accounts.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          This user has no accounts yet.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <div
              key={a.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {a.label || a.type}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-slate-400">
                    {a.type} · {a.status}
                  </div>
                </div>
                <Wallet className="h-4 w-4 text-slate-400" aria-hidden />
              </div>
              <div className="mt-2 font-mono text-base font-bold text-slate-900">
                {formatCents(a.balanceCents)}
              </div>
              <button
                type="button"
                onClick={() => setAdjust(a)}
                className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Banknote className="h-3.5 w-3.5" aria-hidden />
                Adjust balance
              </button>
            </div>
          ))}
        </div>
      )}
      {adjust && (
        <AdjustBalanceModal
          account={adjust}
          onClose={() => setAdjust(null)}
          onAdjusted={(newBal) => {
            onAdjusted(adjust.id, newBal)
            setAdjust(null)
          }}
        />
      )}
    </div>
  )
}

function AdjustBalanceModal({
  account,
  onClose,
  onAdjusted,
}: {
  account: AdminUserAccount
  onClose: () => void
  onAdjusted: (newBalanceCents: string) => void
}) {
  const { toast } = useToast()
  const [direction, setDirection] = useState<"add" | "remove">("add")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [reason, setReason] = useState("")
  const [allowNegative, setAllowNegative] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cents = Math.round((parseFloat(amount) || 0) * 100)
  const valid = cents > 0 && reason.trim().length > 0 && !busy

  async function submit() {
    if (!valid) return
    setBusy(true)
    setError(null)
    const signed = direction === "add" ? cents : -cents
    try {
      await createAdminTransaction({
        accountId: account.id,
        amountCents: String(signed),
        occurredAt: new Date().toISOString(),
        description:
          note.trim() || (direction === "add" ? "Admin credit" : "Admin debit"),
        category: "other",
        status: "posted",
        kind: "adjustment",
        reason: reason.trim(),
        forceAllowNegative: direction === "remove" ? allowNegative : false,
      })
      const newBalance = (
        BigInt(account.balanceCents) + BigInt(signed)
      ).toString()
      toast(
        `${direction === "add" ? "Added" : "Removed"} ${formatCents(
          String(cents),
        )}.`,
        { variant: "success", duration: 2000 },
      )
      onAdjusted(newBalance)
    } catch (e) {
      if (e instanceof ApiError) {
        setError(
          e.status === 409
            ? "That would put the balance below zero. Tick “Allow negative” to force it."
            : e.message || "Couldn't adjust the balance.",
        )
      } else {
        setError("Network error — try again.")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-sm font-semibold text-slate-900">
          Adjust balance — {account.label || account.type}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Current{" "}
          <span className="font-mono">{formatCents(account.balanceCents)}</span>
          . This posts a transaction and updates the balance.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDirection("add")}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm font-semibold transition",
              direction === "add"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            + Add
          </button>
          <button
            type="button"
            onClick={() => setDirection("remove")}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm font-semibold transition",
              direction === "remove"
                ? "border-rose-300 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            – Remove
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <Field label="Amount (USD)">
            <input
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value.replace(/[^\d.]/g, ""))
              }
              placeholder="0.00"
              className={cn(fieldCls, "font-mono")}
            />
          </Field>
          <Field label="Note (shown on the transaction)">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={direction === "add" ? "Admin credit" : "Admin debit"}
              className={fieldCls}
            />
          </Field>
          <Field label="Reason (audit log)">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this happening?"
              className={fieldCls}
            />
          </Field>
          {direction === "remove" && (
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={allowNegative}
                onChange={(e) => setAllowNegative(e.target.checked)}
              />
              Allow the balance to go negative
            </label>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!valid}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {direction === "add" ? "Add funds" : "Remove funds"}
          </button>
        </div>
      </div>
    </div>
  )
}

function ActivityRow({ userId }: { userId: string }) {
  return (
    <Link
      href={`/admin/users/${userId}/transactions`}
      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-sm transition hover:border-slate-300 hover:bg-slate-50 sm:p-5"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white">
          <Wallet className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <div className="font-semibold text-slate-900">Transactions</div>
          <div className="text-xs text-slate-500">
            Review and edit this user's feed.
          </div>
        </div>
      </div>
      <span className="text-slate-400">→</span>
    </Link>
  )
}

function PersonalInfoCard({
  user,
  onUpdated,
}: {
  user: AdminUserDetail
  onUpdated: (fresh: Partial<AdminUserDetail>) => void
}) {
  const { toast } = useToast()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Local draft seeded from the current user. Reset every time we enter
  // edit mode so a Cancel discards in-flight changes.
  const [firstName, setFirstName] = useState(user.firstName ?? "")
  const [lastName, setLastName] = useState(user.lastName ?? "")
  const [novaTag, setNovaTag] = useState(user.novaTag ?? "")
  const [phoneE164, setPhoneE164] = useState(user.phoneE164 ?? "")
  const [dob, setDob] = useState(user.dob ? user.dob.slice(0, 10) : "")
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState<Role>(user.role)
  const [status, setStatus] = useState<AdminUserStatus>(user.status)
  const [reason, setReason] = useState("")

  function beginEdit() {
    setFirstName(user.firstName ?? "")
    setLastName(user.lastName ?? "")
    setNovaTag(user.novaTag ?? "")
    setPhoneE164(user.phoneE164 ?? "")
    setDob(user.dob ? user.dob.slice(0, 10) : "")
    setEmail(user.email)
    setRole(user.role)
    setStatus(user.status)
    setReason("")
    setError(null)
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
    setError(null)
  }

  // Only send fields that actually changed so the audit log stays clean.
  function buildPatch(): Record<string, unknown> {
    const body: Record<string, unknown> = { reason: reason.trim() }
    if (firstName.trim() !== (user.firstName ?? "")) body.firstName = firstName.trim()
    if (lastName.trim() !== (user.lastName ?? "")) body.lastName = lastName.trim()
    if (novaTag.trim() !== (user.novaTag ?? "")) body.novaTag = novaTag.trim()
    if (phoneE164.trim() !== (user.phoneE164 ?? "")) body.phoneE164 = phoneE164.trim()
    const currentDob = user.dob ? user.dob.slice(0, 10) : ""
    if (dob !== currentDob && dob) body.dob = dob
    if (email.trim().toLowerCase() !== user.email) body.email = email.trim()
    if (role !== user.role) body.role = role
    if (status !== user.status) body.status = status
    return body
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const body = buildPatch()
      const changedKeys = Object.keys(body).filter((k) => k !== "reason")
      if (changedKeys.length === 0) {
        setEditing(false)
        toast("No changes to save.", { variant: "info", duration: 1600 })
        return
      }
      if (!body.reason || typeof body.reason !== "string" || (body.reason as string).length === 0) {
        setError("Add a short reason — it's recorded in the audit log.")
        return
      }
      const fresh = await updateAdminUser(user.id, body as Parameters<typeof updateAdminUser>[1])
      onUpdated({
        firstName: fresh.firstName,
        lastName: fresh.lastName,
        novaTag: fresh.novaTag,
        phoneE164: fresh.phoneE164,
        email: fresh.email,
        role: fresh.role,
        status: fresh.status,
        dob: fresh.dob,
      })
      setEditing(false)
      toast("Profile updated.", { variant: "success", duration: 1800 })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Couldn't save changes.")
      } else {
        setError("Network error — try again.")
      }
    } finally {
      setSaving(false)
    }
  }

  const sensitiveTouched =
    email.trim().toLowerCase() !== user.email ||
    role !== user.role ||
    status !== user.status

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          Personal information
        </h2>
        {!editing ? (
          <button
            type="button"
            onClick={beginEdit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Pencil className="h-3 w-3" aria-hidden /> Edit
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <X className="h-3 w-3" aria-hidden /> Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
              )}
              Save
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Kv k="First name" v={user.firstName ?? "—"} />
          <Kv k="Last name" v={user.lastName ?? "—"} />
          <Kv k="$tag" v={user.novaTag ?? "—"} mono />
          <Kv k="Phone" v={user.phoneE164 ?? "—"} mono />
          <Kv
            k="Date of birth"
            v={user.dob ? format(new Date(user.dob), "MMM d, yyyy") : "—"}
          />
          <Kv k="Email" v={user.email} mono />
          <Kv k="Role" v={user.role} />
          <Kv k="Status" v={user.status.replace("_", " ")} />
        </dl>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="First name">
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={fieldCls}
              />
            </Field>
            <Field label="Last name">
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={fieldCls}
              />
            </Field>
            <Field label="$tag">
              <input
                value={novaTag}
                onChange={(e) => setNovaTag(e.target.value)}
                placeholder="@handle"
                className={cn(fieldCls, "font-mono")}
              />
            </Field>
            <Field label="Phone (E.164)">
              <input
                value={phoneE164}
                onChange={(e) => setPhoneE164(e.target.value)}
                placeholder="+14155550100"
                className={cn(fieldCls, "font-mono")}
              />
            </Field>
            <Field label="Date of birth">
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className={fieldCls}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(fieldCls, "font-mono")}
              />
            </Field>
            <Field label="Role">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className={fieldCls}
              >
                <option value="customer">customer</option>
                <option value="admin">admin</option>
                <option value="superadmin">superadmin</option>
              </select>
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AdminUserStatus)}
                className={fieldCls}
              >
                <option value="active">active</option>
                <option value="frozen">frozen</option>
                <option value="closed">closed</option>
              </select>
            </Field>
          </div>

          <Field label="Reason (audit log)">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                sensitiveTouched
                  ? "Required — sessions will be revoked."
                  : "Why is this changing?"
              }
              className={fieldCls}
            />
          </Field>

          {sensitiveTouched && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Changing email, role, or status will revoke all of this user's
              active sessions.
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const fieldCls =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

function SessionsCard({
  sessions,
  error,
  userId,
  onChanged,
}: {
  sessions: AdminUserSession[] | null
  error: string | null
  userId: string
  onChanged: () => void
}) {
  const { toast } = useToast()
  const [busy, setBusy] = useState<null | "revoke" | "reset">(null)

  async function onRevokeAll() {
    if (busy) return
    setBusy("revoke")
    try {
      const r = await revokeAllUserSessions(userId)
      toast(
        `Signed out ${r.revoked} active session${r.revoked === 1 ? "" : "s"}.`,
        { variant: "success" },
      )
      onChanged()
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't revoke sessions.", {
        variant: "error",
      })
    } finally {
      setBusy(null)
    }
  }

  async function onResetHistory() {
    if (busy) return
    if (
      !window.confirm(
        "Reset this user's login history? This signs them out everywhere and permanently deletes all their sessions and device records.",
      )
    ) {
      return
    }
    setBusy("reset")
    try {
      const r = await resetUserLoginHistory(userId)
      toast(
        `Login history cleared — ${r.sessionsDeleted} session(s) and ${r.devicesDeleted} device(s) removed.`,
        { variant: "success" },
      )
      onChanged()
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Couldn't reset login history.",
        { variant: "error" },
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Recent logins</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRevokeAll}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {busy === "revoke" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Power className="h-3.5 w-3.5" aria-hidden />
            )}
            Revoke all
          </button>
          <button
            type="button"
            onClick={onResetHistory}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
          >
            {busy === "reset" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            )}
            Reset history
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-rose-600">{error}</p>
      ) : sessions === null ? (
        <p className="mt-3 text-sm text-slate-500">Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          This user has never signed in.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {sessions.map((s, i) => (
            <SessionRow key={s.id} session={s} highlight={i === 0} />
          ))}
        </div>
      )}
    </div>
  )
}

function SessionRow({
  session,
  highlight,
}: {
  session: AdminUserSession
  highlight: boolean
}) {
  const d = session.device
  const geo = d?.geo
  const locationLabel =
    [geo?.city, geo?.region, geo?.country].filter(Boolean).join(", ") ||
    "Unknown location"
  const isRevoked = !!session.revokedAt
  const isExpired = !isRevoked && new Date(session.expiresAt) < new Date()
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        highlight ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {geo?.countryCode && (
              <span
                aria-label={geo.country ?? geo.countryCode}
                title={locationLabel}
                className="text-base leading-none"
              >
                {flagFromCountryCode(geo.countryCode)}
              </span>
            )}
            <span className="font-semibold text-slate-900">
              {locationLabel}
            </span>
            <SessionStatusPill
              revoked={isRevoked}
              expired={isExpired}
              reason={session.revokedReason}
            />
          </div>
          <div className="mt-1 grid grid-cols-1 gap-x-4 gap-y-0.5 text-[11px] text-slate-500 sm:grid-cols-2">
            <span className="inline-flex items-center gap-1">
              <Monitor className="h-3 w-3" aria-hidden />
              {d ? `${d.os} · ${d.browser}` : "Unknown device"}
            </span>
            {d?.ip && (
              <span className="truncate font-mono">IP {d.ip}</span>
            )}
          </div>
          <div className="mt-1 text-[10px] text-slate-400">
            Signed in{" "}
            {formatDistanceToNow(new Date(session.createdAt), {
              addSuffix: true,
            })}{" "}
            · {format(new Date(session.createdAt), "MMM d, h:mm a")}
          </div>
        </div>
      </div>
    </div>
  )
}

function SessionStatusPill({
  revoked,
  expired,
  reason,
}: {
  revoked: boolean
  expired: boolean
  reason: string | null
}) {
  if (revoked) {
    return (
      <span
        title={reason ?? undefined}
        className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700"
      >
        Revoked
      </span>
    )
  }
  if (expired) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
        Expired
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
      Active
    </span>
  )
}

/** ISO 3166-1 alpha-2 → flag emoji via regional-indicator codepoints. */
function flagFromCountryCode(code: string | null | undefined): string {
  if (!code || code.length !== 2 || !/^[A-Za-z]{2}$/.test(code)) return ""
  const base = 0x1f1e6
  const A = "A".charCodeAt(0)
  return String.fromCodePoint(
    base + (code.toUpperCase().charCodeAt(0) - A),
    base + (code.toUpperCase().charCodeAt(1) - A),
  )
}

type ActionKind =
  | "activate"
  | "deactivate"
  | "password-reset"
  | "set-password"
  | "reset-history"
  | "delete"
  | "block-transfers"
  | "unblock-transfers"
  | "disable-emails"
  | "enable-emails"

function AccountActionsCard({
  user,
  onStatusChanged,
  onHistoryReset,
  onDeleted,
  onTransfersBlockChanged,
  onEmailNotificationsChanged,
  canDelete,
}: {
  user: AdminUserDetail
  onStatusChanged: (status: AdminUserStatus) => void
  onHistoryReset: () => void
  onDeleted: () => void
  onTransfersBlockChanged?: (
    transfersDisabled: boolean,
    reason: string | null,
  ) => void
  onEmailNotificationsChanged?: (
    emailNotificationsDisabled: boolean,
    reason: string | null,
  ) => void
  canDelete: boolean
}) {
  const { toast } = useToast()
  const [pending, setPending] = useState<ActionKind | null>(null)
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [verifyText, setVerifyText] = useState("")
  // "Set password" action state.
  const [newPassword, setNewPassword] = useState("")
  const [showPw, setShowPw] = useState(true)
  const [requireSetup, setRequireSetup] = useState(true)
  // "Send message" modal.
  const [msgOpen, setMsgOpen] = useState(false)

  function open(action: ActionKind) {
    setPending(action)
    setReason("")
    setVerifyText("")
    setNewPassword("")
    setShowPw(true)
    setRequireSetup(true)
    setError(null)
  }
  function close() {
    if (busy) return
    setPending(null)
  }

  const isActive = user.status === "active"
  const requiresTypeToConfirm =
    pending === "reset-history" || pending === "delete"
  const requiredConfirmText = user.email

  async function runAction() {
    if (!pending) return
    if (!reason.trim()) {
      setError("Add a short reason — it's recorded in the audit log.")
      return
    }
    if (requiresTypeToConfirm && verifyText.trim() !== requiredConfirmText) {
      setError(`Type ${requiredConfirmText} exactly to confirm.`)
      return
    }
    if (pending === "set-password" && newPassword.length < 10) {
      setError("Password must be at least 10 characters.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (pending === "activate") {
        const res = await activateAdminUser(user.id, reason.trim())
        onStatusChanged(res.status)
        toast("User activated.", { variant: "success", duration: 1800 })
      } else if (pending === "deactivate") {
        const res = await deactivateAdminUser(user.id, reason.trim())
        onStatusChanged(res.status)
        toast("User deactivated — sessions revoked.", {
          variant: "success",
          duration: 2200,
        })
      } else if (pending === "password-reset") {
        await forceUserPasswordReset(user.id, reason.trim())
        toast("Password reset email sent.", {
          variant: "success",
          duration: 2000,
        })
      } else if (pending === "set-password") {
        await setAdminUserPassword(user.id, {
          password: newPassword,
          requireSecuritySetup: requireSetup,
          reason: reason.trim(),
        })
        toast(
          requireSetup
            ? "Password set — user must change it on next sign-in."
            : "Password set.",
          { variant: "success", duration: 2200 },
        )
      } else if (pending === "reset-history") {
        const res = await resetAdminUserHistory(user.id, reason.trim())
        toast(
          `Reset done — deleted ${res.deletedTransactions} transactions, zeroed ${res.accountsZeroed} accounts.`,
          { variant: "success", duration: 2600 },
        )
        onHistoryReset()
      } else if (pending === "delete") {
        const res = await deleteAdminUser(user.id, {
          confirmation: verifyText.trim(),
          reason: reason.trim(),
        })
        toast(
          `User deleted — ${res.counts.transactions} transactions, ${res.counts.accounts} accounts, ${res.counts.sessions} sessions wiped.`,
          { variant: "success", duration: 3200 },
        )
        onDeleted()
        return
      } else if (pending === "block-transfers" || pending === "unblock-transfers") {
        const disabled = pending === "block-transfers"
        const res = await setUserTransfersDisabled(user.id, {
          disabled,
          reason: reason.trim(),
        })
        onTransfersBlockChanged?.(res.transfersDisabled, res.transfersDisabledReason)
        toast(
          disabled
            ? "Transfers blocked — customer will see a lockout modal."
            : "Transfers unblocked.",
          { variant: "success", duration: 2200 },
        )
      } else if (pending === "disable-emails" || pending === "enable-emails") {
        const disabled = pending === "disable-emails"
        const res = await setUserEmailNotificationsDisabled(user.id, {
          disabled,
          reason: reason.trim(),
        })
        onEmailNotificationsChanged?.(
          res.emailNotificationsDisabled,
          res.emailNotificationsDisabledReason,
        )
        toast(
          disabled
            ? "All emails disabled — including sign-in codes & password resets."
            : "Email notifications enabled.",
          { variant: "success", duration: 2200 },
        )
      }
      setPending(null)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Action failed.")
      } else {
        setError("Network error — try again.")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <h2 className="text-sm font-semibold text-slate-900">Account actions</h2>
      <p className="mt-1 text-xs text-slate-500">
        Destructive actions are audit-logged with the reason you provide.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <ActionButton
          onClick={() => setMsgOpen(true)}
          icon={<MessageSquare className="h-4 w-4" />}
          label="Send message"
          tone="neutral"
          hint="Notification and/or live popup"
        />
        <ActionButton
          onClick={() => open(isActive ? "deactivate" : "activate")}
          icon={isActive ? <Ban className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          label={isActive ? "Deactivate" : "Activate"}
          tone={isActive ? "danger" : "ok"}
        />
        <ActionButton
          onClick={() =>
            open(
              user.transfersDisabled ? "unblock-transfers" : "block-transfers",
            )
          }
          icon={<ShieldCheck className="h-4 w-4" />}
          label={
            user.transfersDisabled ? "Unblock transfers" : "Block transfers"
          }
          tone={user.transfersDisabled ? "ok" : "danger"}
          hint={
            user.transfersDisabled
              ? "Customer can move money again"
              : "Pause all P2P, internal, wire & ACH"
          }
        />
        <ActionButton
          onClick={() =>
            open(
              user.emailNotificationsDisabled
                ? "enable-emails"
                : "disable-emails",
            )
          }
          icon={<MailX className="h-4 w-4" />}
          label={
            user.emailNotificationsDisabled
              ? "Enable email notifications"
              : "Disable email notifications"
          }
          tone={user.emailNotificationsDisabled ? "ok" : "danger"}
          hint={
            user.emailNotificationsDisabled
              ? "Resume all notification emails"
              : "Mute all notification emails"
          }
        />
        <ActionButton
          onClick={() => open("set-password")}
          icon={<Lock className="h-4 w-4" />}
          label="Set password"
          tone="neutral"
          hint="Set a new password directly"
        />
        <ActionButton
          onClick={() => open("password-reset")}
          icon={<KeyRound className="h-4 w-4" />}
          label="Force password reset"
          tone="neutral"
          hint="Email a reset link"
        />
        <ActionButton
          onClick={() => open("reset-history")}
          icon={<Trash2 className="h-4 w-4" />}
          label="Reset history"
          tone="danger"
          hint="Wipe transactions + zero balances"
        />
        {canDelete && (
          <ActionButton
            onClick={() => open("delete")}
            icon={<UserX className="h-4 w-4" />}
            label="Delete user"
            tone="danger"
            hint="Hard-delete account + all data"
          />
        )}
      </div>

      <ConfirmModal
        open={pending !== null}
        onClose={close}
        busy={busy}
        error={error}
        title={
          pending === "activate"
            ? "Activate this account?"
            : pending === "deactivate"
              ? "Deactivate this account?"
              : pending === "password-reset"
                ? "Send password reset email?"
                : pending === "set-password"
                  ? "Set a new password?"
                  : pending === "delete"
                  ? "Permanently delete this user?"
                  : pending === "block-transfers"
                    ? "Block all transfers?"
                    : pending === "unblock-transfers"
                      ? "Unblock transfers?"
                      : pending === "disable-emails"
                        ? "Disable email notifications?"
                        : pending === "enable-emails"
                          ? "Enable email notifications?"
                          : "Reset all history?"
        }
        body={
          pending === "deactivate" ? (
            <p>
              The user will be signed out immediately and won't be able to
              sign back in until reactivated.
            </p>
          ) : pending === "password-reset" ? (
            <p>
              A reset link will be emailed to{" "}
              <span className="font-mono">{user.email}</span>. Their current
              password keeps working until they actually use the link.
            </p>
          ) : pending === "set-password" ? (
            <>
              <p>
                Set a new password for{" "}
                <span className="font-semibold">{displayNameOf(user)}</span>.
                It&apos;s hashed on save — for security, even you can&apos;t
                read back an existing password, only replace it. All of their
                sessions are revoked.
              </p>
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Share the new password with the customer over a trusted
                channel. With the toggle on, they must change it on next
                sign-in.
              </div>
            </>
          ) : pending === "reset-history" ? (
            <>
              <p>
                This deletes every transaction and override for{" "}
                <span className="font-semibold">{displayNameOf(user)}</span>{" "}
                and zeroes all of their accounts. Ledger entries (audit trail)
                are kept. This cannot be undone.
              </p>
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Type the user's email{" "}
                <span className="font-mono">{user.email}</span> below to
                confirm.
              </div>
            </>
          ) : pending === "delete" ? (
            <>
              <p>
                Permanently delete{" "}
                <span className="font-semibold">{displayNameOf(user)}</span>{" "}
                and every row that references them — accounts, cards,
                transactions, transfers, statements, KYC, documents, sessions,
                devices, biometrics, notifications, and everything else they
                own. Admin audit-log entries about this user are preserved.
                This <span className="font-semibold">cannot</span> be undone.
              </p>
              <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                Type the user's email{" "}
                <span className="font-mono">{user.email}</span> below to
                confirm. The audit log will record the snapshot, row counts,
                and your reason.
              </div>
            </>
          ) : pending === "block-transfers" ? (
            <p>
              <span className="font-semibold">{displayNameOf(user)}</span> won't
              be able to send money via P2P, internal transfers, wires, ACH, or
              goal contributions. They&apos;ll see a lockout modal asking them
              to contact their branch. The block stays in place until you
              unblock it.
            </p>
          ) : pending === "unblock-transfers" ? (
            <p>
              Clear the transfer lock for{" "}
              <span className="font-semibold">{displayNameOf(user)}</span>.
              Their money-movement flows will work normally on the next
              attempt.
            </p>
          ) : pending === "disable-emails" ? (
            <>
              <p>
                <span className="font-semibold">{displayNameOf(user)}</span>{" "}
                will stop receiving every email we send — transaction alerts,
                security alerts, support replies, marketing, and{" "}
                <span className="font-semibold">
                  sign-in codes and password-reset emails
                </span>{" "}
                — until you re-enable them.
              </p>
              <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Heads up: this also blocks sign-in codes and password resets, so
                the customer won&apos;t be able to log in or recover their
                account until you turn notifications back on.
              </div>
            </>
          ) : pending === "enable-emails" ? (
            <p>
              Resume all notification emails for{" "}
              <span className="font-semibold">{displayNameOf(user)}</span>.
              They'll start receiving transaction alerts, security alerts, and
              other notifications again immediately.
            </p>
          ) : (
            <p>
              Set this user's status to active. They'll be able to sign in
              again.
            </p>
          )
        }
        confirmLabel={
          pending === "activate"
            ? "Activate"
            : pending === "deactivate"
              ? "Deactivate"
              : pending === "password-reset"
                ? "Send email"
                : pending === "set-password"
                  ? "Set password"
                  : pending === "delete"
                    ? "Delete user"
                  : pending === "block-transfers"
                    ? "Block transfers"
                    : pending === "unblock-transfers"
                      ? "Unblock"
                      : pending === "disable-emails"
                        ? "Disable emails"
                        : pending === "enable-emails"
                          ? "Enable emails"
                          : "Reset history"
        }
        confirmTone={
          pending === "deactivate" ||
          pending === "reset-history" ||
          pending === "delete" ||
          pending === "block-transfers" ||
          pending === "disable-emails"
            ? "danger"
            : "primary"
        }
        onConfirm={() => void runAction()}
      >
        {requiresTypeToConfirm && (
          <Field label={`Type ${requiredConfirmText} to confirm`}>
            <input
              value={verifyText}
              onChange={(e) => setVerifyText(e.target.value)}
              placeholder={user.email}
              className={cn(fieldCls, "font-mono")}
            />
          </Field>
        )}
        {pending === "set-password" && (
          <>
            <Field label="New password">
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="At least 10 characters"
                  className={cn(fieldCls, "pr-10 font-mono")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </Field>
            <label className="mt-3 flex cursor-pointer items-start justify-between gap-4">
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-slate-800">
                  Require change on next sign-in
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-500">
                  User must replace it and set a transaction PIN before using
                  the app.
                </span>
              </span>
              <span className="relative mt-0.5 inline-flex shrink-0">
                <input
                  type="checkbox"
                  role="switch"
                  aria-checked={requireSetup}
                  checked={requireSetup}
                  onChange={(e) => setRequireSetup(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-slate-900" />
                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
              </span>
            </label>
          </>
        )}
        <Field label="Reason (audit log)">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this happening?"
            className={fieldCls}
          />
        </Field>
      </ConfirmModal>

      {msgOpen && (
        <SendMessageModal
          userId={user.id}
          userName={displayNameOf(user)}
          onClose={() => setMsgOpen(false)}
        />
      )}
    </div>
  )
}

function SendMessageModal({
  userId,
  userName,
  onClose,
}: {
  userId: string
  userName: string
  onClose: () => void
}) {
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [channel, setChannel] = useState<AdminMessageChannel>("both")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    reason.trim().length > 0 &&
    !busy

  async function submit() {
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      await sendUserMessage(userId, {
        title: title.trim(),
        body: body.trim(),
        channel,
        reason: reason.trim(),
      })
      toast(
        channel === "popup"
          ? "Popup sent."
          : channel === "notification"
            ? "Notification sent."
            : "Message sent.",
        { variant: "success", duration: 2000 },
      )
      onClose()
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message || "Couldn't send the message."
          : "Network error — try again.",
      )
    } finally {
      setBusy(false)
    }
  }

  const CHANNELS: { value: AdminMessageChannel; label: string; hint: string }[] =
    [
      { value: "notification", label: "Notification", hint: "Bell panel" },
      { value: "popup", label: "Popup", hint: "Live modal" },
      { value: "both", label: "Both", hint: "Panel + popup" },
    ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-sm font-semibold text-slate-900">
          Message {userName}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Send a direct message to the customer&apos;s notifications and/or as
          a real-time popup on their dashboard.
        </p>

        <div className="mt-4 space-y-3">
          <Field label="Title">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="E.g. Action needed on your account"
              className={fieldCls}
            />
          </Field>
          <Field label="Message">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Write your message…"
              className={cn(fieldCls, "resize-none")}
            />
          </Field>

          <div>
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Deliver as
            </span>
            <div className="grid grid-cols-3 gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setChannel(c.value)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-center transition",
                    channel === c.value
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span className="block text-xs font-semibold">{c.label}</span>
                  <span
                    className={cn(
                      "block text-[10px]",
                      channel === c.value ? "text-slate-300" : "text-slate-400",
                    )}
                  >
                    {c.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Field label="Reason (audit log)">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you messaging them?"
              className={fieldCls}
            />
          </Field>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!valid}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

function ActionButton({
  onClick,
  icon,
  label,
  tone,
  disabled,
  hint,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  tone: "ok" | "neutral" | "danger"
  disabled?: boolean
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition disabled:opacity-50",
        tone === "ok" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
        tone === "neutral" &&
          "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
        tone === "danger" &&
          "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
      )}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {label}
      </span>
      {hint && (
        <span className="text-[10px] font-medium text-slate-500">{hint}</span>
      )}
    </button>
  )
}

function ConfirmModal({
  open,
  onClose,
  title,
  body,
  confirmLabel,
  confirmTone,
  onConfirm,
  busy,
  error,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  body: React.ReactNode
  confirmLabel: string
  confirmTone: "primary" | "danger"
  onConfirm: () => void
  busy: boolean
  error: string | null
  children?: React.ReactNode
}) {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />
      <div className="relative w-full max-w-md rounded-t-2xl border border-slate-200 bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-start gap-3">
          {confirmTone === "danger" && (
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle className="h-4 w-4" aria-hidden />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <div className="mt-1 text-xs text-slate-600">{body}</div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {children && <div className="mt-4 space-y-2">{children}</div>}

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-60",
              confirmTone === "danger"
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-slate-900 hover:bg-slate-800",
            )}
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionStub({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center sm:p-5">
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      <p className="mt-1 text-xs text-slate-500">{body}</p>
    </div>
  )
}

// ─── Pills + helpers ─────────────────────────────────────────────────────

function RolePill({ role }: { role: Role }) {
  const map: Record<Role, string> = {
    customer: "bg-slate-100 text-slate-700",
    admin: "bg-slate-900 text-white",
    superadmin: "bg-violet-100 text-violet-700",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
        map[role],
      )}
    >
      {role}
    </span>
  )
}

function StatusPill({
  status,
}: {
  status: "active" | "frozen" | "closed"
}) {
  const map = {
    active: "bg-emerald-100 text-emerald-700",
    frozen: "bg-amber-100 text-amber-700",
    closed: "bg-rose-100 text-rose-700",
  } as const
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
        map[status],
      )}
    >
      {status.replace("_", " ")}
    </span>
  )
}

function KycPill({ record }: { record: unknown }) {
  const r = record as { status?: string } | null
  const status = r?.status ?? "none"
  const map: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    rejected: "bg-rose-100 text-rose-700",
    none: "bg-slate-100 text-slate-500",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
        map[status] ?? map.none,
      )}
    >
      <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
      KYC: {status}
    </span>
  )
}

function Kv({
  k,
  v,
  mono,
}: {
  k: string
  v: string
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-slate-500">
        {k}
      </dt>
      <dd
        className={cn(
          "mt-0.5 text-sm text-slate-900",
          mono && "font-mono text-xs",
        )}
      >
        {v}
      </dd>
    </div>
  )
}

function initialsOf(
  first: string | null,
  last: string | null,
  email: string,
): string {
  const f = (first ?? "").trim()
  const l = (last ?? "").trim()
  const fl = ((f[0] ?? "") + (l[0] ?? "")).toUpperCase()
  if (fl) return fl
  return email.slice(0, 2).toUpperCase()
}

function formatCents(centsStr: string): string {
  try {
    const n = Number(BigInt(centsStr)) / 100
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" })
  } catch {
    return "—"
  }
}
