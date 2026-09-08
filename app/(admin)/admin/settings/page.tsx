"use client"

import { useEffect, useState } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getAdminSettings,
  updateAdminSettings,
} from "@/lib/admin/api/settings.real"

/**
 * Admin app settings. Currently a single global control: whether outgoing
 * wires must have their beneficiary name + account matched against the
 * admin-approved beneficiary list.
 */
export default function AdminSettingsPage() {
  const [requireWire, setRequireWire] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getAdminSettings()
      .then((s) => {
        if (!cancelled) setRequireWire(s.requireWireBeneficiaryVerification)
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load settings.")
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function toggleWire() {
    if (requireWire === null || saving) return
    const next = !requireWire
    setRequireWire(next) // optimistic
    setSaving(true)
    setError(null)
    try {
      const s = await updateAdminSettings({
        requireWireBeneficiaryVerification: next,
      })
      setRequireWire(s.requireWireBeneficiaryVerification)
    } catch {
      setRequireWire(!next) // revert
      setError("Couldn't save. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const loading = requireWire === null && !error

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

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-start gap-4 p-5">
          <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Wire beneficiary verification
              </h2>
              {loading ? (
                <Loader2
                  className="h-4 w-4 animate-spin text-slate-400"
                  aria-hidden
                />
              ) : (
                <Toggle
                  on={!!requireWire}
                  busy={saving}
                  onClick={toggleWire}
                  label="Require wire beneficiary verification"
                />
              )}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              When <strong>on</strong>, an outgoing wire only goes through if the
              beneficiary name <em>and</em> account (IBAN, plus SWIFT for
              international) match an approved beneficiary in the database. When{" "}
              <strong>off</strong>, customers can wire to any name and account.
              Either way, every wire still waits in the review queue for admin
              approval before money moves.
            </p>
            <p className="mt-2 text-xs font-medium text-slate-400">
              {requireWire === null
                ? ""
                : requireWire
                  ? "Verification is ON — unapproved beneficiaries are rejected."
                  : "Verification is OFF — any beneficiary is accepted."}
            </p>
          </div>
        </div>
      </section>
    </div>
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
