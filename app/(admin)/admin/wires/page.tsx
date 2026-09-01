"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  Check,
  Globe,
  Landmark,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react"
import {
  approveWire,
  createWireBeneficiary,
  deleteWireBeneficiary,
  listAdminWires,
  listWireBeneficiaries,
  reverseWire,
  updateWireBeneficiary,
  type AdminWireTransfer,
  type WireBeneficiary,
  type WireBeneficiaryInput,
  type WireBeneficiaryType,
} from "@/lib/admin/api/wires.real"
import { cn } from "@/lib/utils"
import {
  BankSelect,
  findInstitutionByName,
} from "@/components/move/BankSelect"
import { logoUrl } from "@/lib/move/api/institutions"
import { bankCodesFor } from "@/lib/move/bank-codes"

type Tab = "beneficiaries" | "wires"

/**
 * Admin wires page. Two tabs:
 *  - Beneficiaries: CRUD on the list of admin-approved wire destinations.
 *    Customer wires are rejected unless their routing+account (local) or
 *    SWIFT+IBAN (international) matches a row here.
 *  - Wires: every wire transfer initiated by a customer. Includes reverse.
 */
export default function AdminWiresPage() {
  const [tab, setTab] = useState<Tab>("beneficiaries")

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Wires
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage approved beneficiaries and review customer wire activity.
        </p>
      </div>

      <div className="flex rounded-lg bg-white p-1 ring-1 ring-slate-200">
        <TabButton
          active={tab === "beneficiaries"}
          onClick={() => setTab("beneficiaries")}
          label="Beneficiaries"
        />
        <TabButton
          active={tab === "wires"}
          onClick={() => setTab("wires")}
          label="Wires"
        />
      </div>

      {tab === "beneficiaries" ? <BeneficiariesPanel /> : <WiresPanel />}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:text-slate-900",
      )}
    >
      {label}
    </button>
  )
}

// ─── Beneficiaries panel ────────────────────────────────────────────────

function BeneficiariesPanel() {
  const [rows, setRows] = useState<WireBeneficiary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<WireBeneficiary | "new" | null>(null)

  const refresh = useCallback(() => {
    listWireBeneficiaries()
      .then((r) => {
        setRows(r)
        setError(null)
      })
      .catch(() => setError("Couldn't load beneficiaries."))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function remove(row: WireBeneficiary) {
    if (
      !window.confirm(
        `Remove ${row.name} (${row.bankName})? Customer wires to this beneficiary will stop being accepted.`,
      )
    )
      return
    try {
      await deleteWireBeneficiary(row.id)
      refresh()
    } catch {
      setError("Couldn't delete beneficiary.")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {rows === null
            ? "Loading…"
            : `${rows.length} approved beneficiar${rows.length === 1 ? "y" : "ies"}.`}
        </p>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add beneficiary
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {rows !== null && rows.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            No beneficiaries yet. Add one to allow customer wires.
          </p>
        )}
        {rows !== null && rows.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-start gap-3 p-4 sm:flex-nowrap sm:items-center"
              >
                <BankLogo
                  bankName={row.bankName}
                  fallbackType={row.type}
                />
                {/* Domain-typed icon kept beside the name pill for at-a-glance
                    local-vs-international scanning even when the bank logo
                    fills the avatar slot. */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900">
                      {row.name}
                    </span>
                    <TypePill type={row.type} />
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {row.bankName}
                  </div>
                  <div className="mt-1 truncate font-mono text-[11px] text-slate-500">
                    {row.type === "local"
                      ? `IBAN ${row.iban}`
                      : `${row.swiftBic} · ${row.iban}${row.country ? ` · ${row.country}` : ""}`}
                  </div>
                  {row.notes && (
                    <div className="mt-1 truncate text-[11px] italic text-slate-400">
                      {row.notes}
                    </div>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(row)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(row)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <BeneficiaryEditor
          existing={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function TypePill({ type }: { type: WireBeneficiaryType }) {
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
        type === "local"
          ? "bg-blue-100 text-blue-700"
          : "bg-violet-100 text-violet-700",
      )}
    >
      {type === "local" ? "Local" : "Intl"}
    </span>
  )
}

function BeneficiaryEditor({
  existing,
  onClose,
  onSaved,
}: {
  existing: WireBeneficiary | null
  onClose: () => void
  onSaved: () => void
}) {
  const [type, setType] = useState<WireBeneficiaryType>(existing?.type ?? "local")
  const [name, setName] = useState(existing?.name ?? "")
  const [bankName, setBankName] = useState(existing?.bankName ?? "")
  const [swiftBic, setSwiftBic] = useState(existing?.swiftBic ?? "")
  const [iban, setIban] = useState(existing?.iban ?? "")
  const [country, setCountry] = useState(existing?.country ?? "")
  const [beneficiaryAddress, setBeneficiaryAddress] = useState(
    existing?.beneficiaryAddress ?? "",
  )
  const [notes, setNotes] = useState(existing?.notes ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-fill the bank's canonical routing / SWIFT / country codes
  // whenever the picked bank changes (and on mount, when editing an
  // existing beneficiary whose bank was already set). Type flips too
  // so a US bank can't be saved as international and vice versa.
  //
  // Whenever the bank has a known canonical routing/SWIFT, the form
  // is FORCED to use it — even on mount when editing a legacy row
  // whose admin-entered routing doesn't match the real-world value.
  // This guarantees the same bank always has the same routing across
  // every beneficiary, which is what the customer's verifyBeneficiary
  // check needs to pass. The admin can still type a different routing
  // for non-catalogued banks (no entry in BANK_CODES).
  useEffect(() => {
    const inst = findInstitutionByName(bankName)
    if (!inst) return
    const codes = bankCodesFor(inst.id)
    // Bahrain banks are domestic (local, keyed by IBAN); everything else
    // is an international SWIFT/IBAN wire.
    if (inst.country === "BH" && type !== "local") setType("local")
    else if (inst.country !== "BH" && type !== "international") {
      setType("international")
    }
    if (codes?.swiftBic) {
      if (swiftBic.trim().toUpperCase() !== codes.swiftBic) {
        setSwiftBic(codes.swiftBic)
      }
    }
    if (inst.country && country.trim() !== inst.country) {
      setCountry(inst.country)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankName])

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const body: WireBeneficiaryInput = {
        type,
        name: name.trim(),
        bankName: bankName.trim(),
        ...(type === "local"
          ? {
              iban: iban.trim().toUpperCase().replace(/\s+/g, ""),
            }
          : {
              swiftBic: swiftBic.trim().toUpperCase(),
              iban: iban.trim().toUpperCase().replace(/\s+/g, ""),
              country: country.trim(),
              beneficiaryAddress: beneficiaryAddress.trim() || undefined,
            }),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }
      if (existing) {
        await updateWireBeneficiary(existing.id, body)
      } else {
        await createWireBeneficiary(body)
      }
      onSaved()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.replace(/^Error: /, "")
          : "Couldn't save beneficiary.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            {existing ? "Edit beneficiary" : "Add beneficiary"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("local")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition",
                type === "local"
                  ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              <Landmark className="h-3.5 w-3.5" aria-hidden /> Local (BH)
            </button>
            <button
              type="button"
              onClick={() => setType("international")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition",
                type === "international"
                  ? "bg-violet-100 text-violet-700 ring-1 ring-violet-200"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              <Globe className="h-3.5 w-3.5" aria-hidden /> International
            </button>
          </div>

          <Field label="Beneficiary name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Bank name">
            {/* useEffect above auto-fills routing / SWIFT / country
                / type from the bank's canonical codes whenever this
                changes (and on mount when editing). */}
            <BankSelect
              value={bankName}
              onChange={setBankName}
              variant="admin"
            />
          </Field>

          {type === "local" ? (
            <Field label="IBAN (Bahrain)">
              <input
                value={iban}
                onChange={(e) =>
                  setIban(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 22),
                  )
                }
                placeholder="BH67BMAG00001299123456"
                className={cn(inputCls, "font-mono uppercase")}
              />
            </Field>
          ) : (
            <>
              <Field label="SWIFT / BIC">
                <input
                  value={swiftBic}
                  onChange={(e) =>
                    setSwiftBic(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "")
                        .slice(0, 11),
                    )
                  }
                  className={cn(inputCls, "font-mono uppercase")}
                />
              </Field>
              <Field label="IBAN">
                <input
                  value={iban}
                  onChange={(e) =>
                    setIban(e.target.value.toUpperCase().replace(/\s+/g, ""))
                  }
                  className={cn(inputCls, "font-mono uppercase")}
                />
              </Field>
              <Field label="Beneficiary country">
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Beneficiary address (optional)">
                <textarea
                  rows={2}
                  value={beneficiaryAddress}
                  onChange={(e) => setBeneficiaryAddress(e.target.value)}
                  className={cn(inputCls, "h-auto py-2")}
                />
              </Field>
            </>
          )}

          <Field label="Notes (admin only, optional)">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputCls}
            />
          </Field>

          {error && (
            <p className="text-xs text-rose-600">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !name.trim() || !bankName.trim()}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Saving…" : existing ? "Save changes" : "Add beneficiary"}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-semibold text-slate-600">{label}</div>
      {children}
    </label>
  )
}

// ─── Wires panel ────────────────────────────────────────────────────────

function WiresPanel() {
  const [rows, setRows] = useState<AdminWireTransfer[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reversing, setReversing] = useState<AdminWireTransfer | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    listAdminWires(200)
      .then((r) => {
        setRows(r.items)
        setError(null)
      })
      .catch(() => setError("Couldn't load wire transfers."))
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 15_000)
    return () => clearInterval(id)
  }, [refresh])

  async function doReverse(row: AdminWireTransfer, reason: string) {
    if (busyId) return
    setBusyId(row.id)
    try {
      await reverseWire(row.id, reason)
      setReversing(null)
      refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.replace(/^Error: /, "")
          : "Couldn't reverse wire.",
      )
    } finally {
      setBusyId(null)
    }
  }

  async function doApprove(row: AdminWireTransfer) {
    if (busyId) return
    if (
      !window.confirm(
        `Approve this wire and release ${(Number(row.amountCents) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} to ${row.customer?.name ?? "the recipient bank"}? The customer's history will mark it posted.`,
      )
    )
      return
    setBusyId(row.id)
    try {
      await approveWire(row.id)
      refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.replace(/^Error: /, "")
          : "Couldn't approve wire.",
      )
    } finally {
      setBusyId(null)
    }
  }

  const grouped = useMemo(() => rows ?? [], [rows])

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        {rows === null
          ? "Loading…"
          : `${rows.length} wire transfer${rows.length === 1 ? "" : "s"} on record.`}
      </p>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {rows !== null && rows.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            No wires yet.
          </p>
        )}
        {rows !== null && rows.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {grouped.map((row) => (
              <li key={row.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {row.customer?.name ?? "Unknown"}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {row.customer?.email}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                      $
                      {(Number(row.amountCents) / 100).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <div className="flex items-center gap-1">
                      {row.awaitingApproval && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Needs approval
                        </span>
                      )}
                      <StatusPill status={row.status} />
                    </div>
                  </div>
                </div>
                {row.externalRef && (
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                    {row.externalRef}
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span>
                    {formatDistanceToNow(new Date(row.initiatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    {row.awaitingApproval && (
                      <button
                        type="button"
                        onClick={() => doApprove(row)}
                        disabled={busyId === row.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden />
                        {busyId === row.id ? "Approving…" : "Approve"}
                      </button>
                    )}
                    {row.status !== "reversed" && row.kind === "wire_out" && (
                      <button
                        type="button"
                        onClick={() => setReversing(row)}
                        disabled={busyId === row.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                        Reverse
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {reversing && (
        <ReverseModal
          row={reversing}
          busy={busyId === reversing.id}
          onCancel={() => setReversing(null)}
          onSubmit={(reason) => doReverse(reversing, reason)}
        />
      )}
    </div>
  )
}

function StatusPill({
  status,
}: {
  status: AdminWireTransfer["status"]
}) {
  const map: Record<AdminWireTransfer["status"], { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
    posted: { label: "Posted", cls: "bg-emerald-100 text-emerald-700" },
    declined: { label: "Declined", cls: "bg-rose-100 text-rose-700" },
    reversed: { label: "Reversed", cls: "bg-slate-200 text-slate-600" },
  }
  const m = map[status]
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
        m.cls,
      )}
    >
      {m.label}
    </span>
  )
}

function ReverseModal({
  row,
  busy,
  onCancel,
  onSubmit,
}: {
  row: AdminWireTransfer
  busy: boolean
  onCancel: () => void
  onSubmit: (reason: string) => void
}) {
  const [reason, setReason] = useState("")
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">
          Reverse this wire?
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          $
          {(Number(row.amountCents) / 100).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          will be credited back to {row.customer?.name ?? "the sender"} and a
          reversal row will appear in their feed.
        </p>
        <label className="mt-4 block text-xs font-semibold text-slate-700">
          Reason (required)
        </label>
        <textarea
          autoFocus
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="E.g. compliance hold, customer request, duplicate"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-rose-400 focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(reason)}
            disabled={busy || !reason.trim()}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {busy ? "Reversing…" : "Reverse + credit back"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── BankLogo ────────────────────────────────────────────────────
 *
 * Round avatar used in the beneficiaries list. Looks the bank name up
 * in the INSTITUTIONS catalog (case-insensitive partial match) and
 * renders its Clearbit logo on a white disc. If the bank name doesn't
 * resolve, falls back to the original blue (local) / violet
 * (international) glyph so legacy free-text rows still render.
 */
function BankLogo({
  bankName,
  fallbackType,
}: {
  bankName: string
  fallbackType: WireBeneficiaryType
}) {
  const inst = findInstitutionByName(bankName)
  const [logoOk, setLogoOk] = useState(!!inst)

  if (inst && logoOk) {
    return (
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl(inst.domain)}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setLogoOk(false)}
          className="h-full w-full object-contain"
        />
      </span>
    )
  }

  return (
    <span
      className={cn(
        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
        fallbackType === "local"
          ? "bg-blue-100 text-blue-700"
          : "bg-violet-100 text-violet-700",
      )}
    >
      {fallbackType === "local" ? (
        <Landmark className="h-5 w-5" aria-hidden />
      ) : (
        <Globe className="h-5 w-5" aria-hidden />
      )}
    </span>
  )
}
