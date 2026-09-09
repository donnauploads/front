"use client"

import { useEffect, useState } from "react"
import { KeyRound, Loader2, ShieldAlert, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getAdminSettings,
  updateAdminSettings,
  type AdminSettings,
} from "@/lib/admin/api/settings.real"

/**
 * Admin app settings — global controls that affect all customers:
 *   • Wire beneficiary verification (match name+account to approved list)
 *   • Login MFA (show the email-code step vs. straight to dashboard)
 */
export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [savingKey, setSavingKey] = useState<keyof AdminSettings | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getAdminSettings()
      .then((s) => {
        if (!cancelled) setSettings(s)
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load settings.")
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function toggle(key: keyof AdminSettings) {
    if (!settings || savingKey) return
    const next = !settings[key]
    setSettings({ ...settings, [key]: next }) // optimistic
    setSavingKey(key)
    setError(null)
    try {
      const s = await updateAdminSettings({ [key]: next })
      setSettings(s)
    } catch {
      setSettings((prev) => (prev ? { ...prev, [key]: !next } : prev)) // revert
      setError("Couldn't save. Try again.")
    } finally {
      setSavingKey(null)
    }
  }

  const loading = settings === null && !error

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Global controls that affect all customers.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <SettingRow
        icon={<ShieldCheck className="h-5 w-5" aria-hidden />}
        title="Wire beneficiary verification"
        loading={loading}
        on={!!settings?.requireWireBeneficiaryVerification}
        busy={savingKey === "requireWireBeneficiaryVerification"}
        onToggle={() => toggle("requireWireBeneficiaryVerification")}
        label="Require wire beneficiary verification"
        description={
          <>
            When <strong>on</strong>, an outgoing wire only goes through if the
            beneficiary name <em>and</em> account (IBAN, plus SWIFT for
            international) match an approved beneficiary in the database. When{" "}
            <strong>off</strong>, customers can wire to any name and account.
            Either way, every wire still waits in the review queue for admin
            approval before money moves.
          </>
        }
        status={
          settings == null
            ? ""
            : settings.requireWireBeneficiaryVerification
              ? "Verification is ON — unapproved beneficiaries are rejected."
              : "Verification is OFF — any beneficiary is accepted."
        }
      />

      <SettingRow
        icon={<KeyRound className="h-5 w-5" aria-hidden />}
        title="Login MFA (email code)"
        loading={loading}
        on={!!settings?.requireMfaOnLogin}
        busy={savingKey === "requireMfaOnLogin"}
        onToggle={() => toggle("requireMfaOnLogin")}
        label="Require MFA on login"
        description={
          <>
            When <strong>on</strong>, signing in on a new/untrusted device shows
            the email verification-code step before the dashboard. When{" "}
            <strong>off</strong>, correct email + password go straight to the
            dashboard with no code. This is a temporary global override — leave
            it on for normal security.
          </>
        }
        status={
          settings == null
            ? ""
            : settings.requireMfaOnLogin
              ? "MFA is ON — the login code step is shown."
              : "MFA is OFF — login skips the code step."
        }
      />

      <SettingRow
        icon={<ShieldAlert className="h-5 w-5" aria-hidden />}
        title="Apply MFA skip to admins"
        loading={loading}
        on={!!settings?.mfaSkipAppliesToAdmins}
        busy={savingKey === "mfaSkipAppliesToAdmins"}
        onToggle={() => toggle("mfaSkipAppliesToAdmins")}
        label="Apply the MFA skip to admin accounts"
        description={
          <>
            Only matters while <strong>Login MFA is off</strong>. When{" "}
            <strong>off</strong> (recommended), admin and superadmin sign-ins
            still go through the email code even though customers skip it. When{" "}
            <strong>on</strong>, staff logins skip the code too.
          </>
        }
        status={
          settings == null
            ? ""
            : settings.requireMfaOnLogin
              ? "No effect right now — Login MFA is on for everyone."
              : settings.mfaSkipAppliesToAdmins
                ? "Admins ALSO skip the code step."
                : "Admins still get the code step."
        }
      />
    </div>
  )
}

function SettingRow({
  icon,
  title,
  description,
  status,
  on,
  busy,
  loading,
  onToggle,
  label,
}: {
  icon: React.ReactNode
  title: string
  description: React.ReactNode
  status: string
  on: boolean
  busy: boolean
  loading: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-start gap-4 p-5">
        <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {loading ? (
              <Loader2
                className="h-4 w-4 animate-spin text-slate-400"
                aria-hidden
              />
            ) : (
              <Toggle on={on} busy={busy} onClick={onToggle} label={label} />
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {description}
          </p>
          {status && (
            <p className="mt-2 text-xs font-medium text-slate-400">{status}</p>
          )}
        </div>
      </div>
    </section>
  )
}

function Toggle({
  on,
  busy,
  onClick,
  label,
}: {
  on: boolean
  busy: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={busy}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors",
        on ? "bg-slate-900" : "bg-slate-300",
        busy && "opacity-60",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          on ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  )
}
