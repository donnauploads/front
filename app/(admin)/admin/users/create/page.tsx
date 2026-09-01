"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Copy, Eye, EyeOff, Loader2, RefreshCw } from "lucide-react"
import { useToast } from "@/components/providers/ToastProvider"
import { useIsAtLeast } from "@/components/admin/RoleGate"
import { ApiError } from "@/lib/api/errors"
import {
  createAdminUser,
  type AdminUserStatus,
} from "@/lib/admin/api/users.real"
import type { Role } from "@/lib/store"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Strong, readable temporary password (no ambiguous chars). */
function generateTempPassword(len = 14): string {
  const sets = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*?"
  const out: string[] = []
  const buf = new Uint32Array(len)
  crypto.getRandomValues(buf)
  for (let i = 0; i < len; i++) out.push(sets[buf[i]! % sets.length]!)
  return out.join("")
}

export default function CreateUserPage() {
  const router = useRouter()
  const { toast } = useToast()
  const canAssignRoles = useIsAtLeast("superadmin")

  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [novaTag, setNovaTag] = useState("")
  const [role, setRole] = useState<Role>("customer")
  const [status, setStatus] = useState<AdminUserStatus>("active")
  const [password, setPassword] = useState(() => generateTempPassword())
  const [showPw, setShowPw] = useState(true)
  const [requireSetup, setRequireSetup] = useState(true)
  const [reason, setReason] = useState("")

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const emailOk = EMAIL_RE.test(email.trim())
  const pwOk = password.length >= 10
  const reasonOk = reason.trim().length > 0
  const canSubmit = useMemo(
    () => emailOk && pwOk && reasonOk && !busy,
    [emailOk, pwOk, reasonOk, busy],
  )

  function copyPassword() {
    navigator.clipboard?.writeText(password).catch(() => {})
    toast("Temporary password copied.", { variant: "info", duration: 1800 })
  }

  async function submit() {
    if (!canSubmit) return
    setBusy(true)
    setErr(null)
    try {
      const created = await createAdminUser({
        email: email.trim(),
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phoneE164: phone.trim() || undefined,
        novaTag: novaTag.trim() || undefined,
        role: canAssignRoles ? role : "customer",
        status,
        requireSecuritySetup: requireSetup,
        reason: reason.trim(),
      })
      toast("User created.", { variant: "success" })
      router.push(`/admin/users/${created.id}`)
    } catch (e) {
      setErr(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't create the user.",
      )
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Users
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Create user
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Set a temporary password and hand it to the customer. With
          security setup on, they must change it and set a transaction PIN
          on first sign-in.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email" required className="sm:col-span-2">
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Name@example.com"
              className={inputCls(!email || emailOk)}
            />
            {email && !emailOk && (
              <FieldHint error>Enter a valid email address.</FieldHint>
            )}
          </Field>

          <Field label="First name">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputCls(true)}
            />
          </Field>
          <Field label="Last name">
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputCls(true)}
            />
          </Field>

          <Field label="Phone (E.164)">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+14155550123"
              className={inputCls(true)}
            />
          </Field>
          <Field label="$tag">
            <input
              value={novaTag}
              onChange={(e) => setNovaTag(e.target.value)}
              placeholder="$alex"
              className={inputCls(true)}
            />
          </Field>

          <Field label="Role">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              disabled={!canAssignRoles}
              className={inputCls(true)}
            >
              <option value="customer">Customer</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
            {!canAssignRoles && (
              <FieldHint>Only superadmins can assign elevated roles.</FieldHint>
            )}
          </Field>
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AdminUserStatus)}
              className={inputCls(true)}
            >
              <option value="active">Active</option>
              <option value="frozen">Frozen</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
        </div>

        {/* Temporary password */}
        <Field label="Temporary password" required>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls(pwOk, "pr-10 font-mono")}
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
            <button
              type="button"
              onClick={() => setPassword(generateTempPassword())}
              title="Generate a new one"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Generate
            </button>
            <button
              type="button"
              onClick={copyPassword}
              title="Copy"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Copy
            </button>
          </div>
          {!pwOk && (
            <FieldHint error>At least 10 characters.</FieldHint>
          )}
        </Field>

        {/* Require security setup toggle */}
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-800">
              Require security setup on first sign-in
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Forces the user to replace this temporary password and create a
              transaction PIN before they can use the app.
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

        {/* Audit reason */}
        <Field label="Reason (audit log)" required>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="E.g. Onboarding new branch customer"
            className={inputCls(!reason || reasonOk)}
          />
        </Field>

        {err && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {err}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <Link
            href="/admin/users"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Create user
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Small presentational helpers ────────────────────────────────────────

function inputCls(ok: boolean, extra = ""): string {
  return [
    "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition",
    ok
      ? "border-slate-200 focus:border-slate-400"
      : "border-rose-300 focus:border-rose-400",
    extra,
  ].join(" ")
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  )
}

function FieldHint({
  error,
  children,
}: {
  error?: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={`mt-1 block text-[11px] ${
        error ? "text-rose-600" : "text-slate-500"
      }`}
    >
      {children}
    </span>
  )
}
