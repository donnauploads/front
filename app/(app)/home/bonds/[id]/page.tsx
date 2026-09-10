"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Landmark, Lock } from "lucide-react"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/providers/ToastProvider"
import { WithdrawBondModal } from "@/components/bonds/WithdrawBondModal"
import { useBonds } from "@/lib/bonds/use-bonds"
import { getBondActivity, type BondActivityEntry } from "@/lib/bonds/api/bonds.real"
import { bondStatusLabel, currencySymbol, earningsPct, fmtCentsIn, fmtLongDate, fmtRate, fmtSignedCents } from "@/lib/bonds/format"
import type { DisplayCurrency } from "@/lib/currency"
import {
  listMyLinkedAccounts,
  type RealLinkedAccountDto,
} from "@/lib/move/api/link-auth.real"

/**
 * Single-bond detail: value, fixed rate, net earnings, dates, withdraw CTA,
 * and the bond's own transaction history (profit/loss entries the admin
 * records, withdrawals, and the opening deposit).
 */
export default function BondDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const bondId = params?.id ?? ""
  const { toast } = useToast()
  const { bonds, loading, refetch } = useBonds()
  const accounts = useStore((s) => s.accounts)

  const bond = useMemo(() => bonds.find((b) => b.id === bondId) ?? null, [bonds, bondId])

  const [activity, setActivity] = useState<BondActivityEntry[] | null>(null)
  const [linked, setLinked] = useState<RealLinkedAccountDto[]>([])
  const [withdrawing, setWithdrawing] = useState(false)

  const loadActivity = useCallback(() => {
    if (!bondId) return
    getBondActivity(bondId)
      .then(setActivity)
      .catch(() => setActivity((prev) => prev ?? []))
  }, [bondId])

  // Refetch the history whenever the bond itself changes (admin recorded
  // earnings, a withdrawal was approved…) — `bonds` updates on bond.changed.
  useEffect(() => {
    loadActivity()
  }, [loadActivity, bonds])

  useEffect(() => {
    listMyLinkedAccounts()
      .then((rows) => setLinked(rows.filter((r) => r.status === "connected")))
      .catch(() => setLinked([]))
  }, [])

  function onWithdrawClick() {
    if (!bond) return
    if (bond.lockedByAdmin) {
      toast("This bond is locked. Contact support.", { variant: "error" })
      return
    }
    if (!bond.withdrawable) {
      toast("This bond hasn't matured yet.", { variant: "error" })
      return
    }
    setWithdrawing(true)
  }

  return (
    <div className="space-y-5" style={{ maxWidth: 720, margin: "0 auto", padding: "8px 0 40px" }}>
      <button className="view-back" onClick={() => router.back()}>
        <ArrowLeft width={16} height={16} aria-hidden /> Back
      </button>

      {loading && !bond && <p style={{ color: "var(--ink-mute)" }}>Loading bond…</p>}
      {!loading && !bond && (
        <p style={{ color: "var(--ink-mute)" }}>We couldn&rsquo;t find that bond.</p>
      )}

      {bond && (
        <>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{bond.label}</h1>
          </div>

          <BondSummary bond={bond} onWithdraw={onWithdrawClick} />

          <div className="ra-card">
            <div className="ra-head">
              <h3>Bond activity</h3>
            </div>
            <div className="ra-colhead" role="row">
              <span>Date</span>
              <span>Description</span>
              <span className="ra-h-amt">Amount</span>
            </div>
            {activity === null ? (
              <div className="ra-empty">Loading activity…</div>
            ) : activity.length === 0 ? (
              <div className="ra-empty">No activity on this bond yet.</div>
            ) : (
              activity.map((e) => (
                <ActivityRow key={e.id} entry={e} currency={bond.currency} />
              ))
            )}
          </div>
        </>
      )}

      {bond && withdrawing && (
        <WithdrawBondModal
          bond={bond}
          accounts={accounts.filter((a) => a.type === "checking" || a.type === "savings")}
          linked={linked}
          onClose={() => setWithdrawing(false)}
          onDone={() => {
            setWithdrawing(false)
            void refetch()
          }}
          toast={toast}
        />
      )}
    </div>
  )
}

function BondSummary({
  bond,
  onWithdraw,
}: {
  bond: NonNullable<ReturnType<typeof useBonds>["bonds"][number]>
  onWithdraw: () => void
}) {
  const earnings = BigInt(bond.earningsCents)
  const pct = earningsPct(bond)
  const earningsColor =
    earnings > 0n ? "#2F855A" : earnings < 0n ? "#B23A3A" : "var(--text-strong)"
  const enabled = bond.withdrawable

  return (
    <div className="acct" style={{ display: "block" }}>
      <div className="acct-top">
        <div>
          <div className="acct-type">Current value</div>
        </div>
        <span className="acct-chip" aria-hidden>
          <Landmark width={18} height={18} />
        </span>
      </div>

      <div className="acct-bal">
        <span className="cur">{bond.currency}</span>
        {fmtCentsIn(bond.principalCents, bond.currency)}
      </div>
      <div className="acct-no" style={{ marginTop: 4 }}>
        Opened with {currencySymbol(bond.currency)}{fmtCentsIn(bond.openingPrincipalCents, bond.currency)}
      </div>

      <div style={{ display: "grid", gap: 4, margin: "10px 0 14px", fontSize: 13, color: "var(--ink-soft)" }}>
        <Row label="Fixed rate" value={fmtRate(bond.ratePct)} />
        <Row
          label="Net earnings"
          value={
            earnings === 0n
              ? `${currencySymbol(bond.currency)}0.00`
              : `${fmtSignedCents(earnings, bond.currency)}${pct !== null ? ` (${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(2)}%)` : ""}`
          }
          color={earningsColor}
        />
        <Row label="Issued" value={fmtLongDate(bond.createdAt)} />
        <Row label="Matures" value={fmtLongDate(bond.maturityAt)} />
        {bond.status !== "withdrawn" && bond.termDays > 0 && (
          <Row label="Term" value={`${bond.daysElapsed} of ${bond.termDays} days elapsed`} />
        )}
        <Row label="Status" value={bondStatusLabel(bond)} />
      </div>

      <button
        type="button"
        onClick={onWithdraw}
        aria-disabled={!enabled}
        className="lk-cta-btn primary"
        style={{
          width: "100%",
          opacity: enabled ? 1 : 0.5,
          cursor: enabled ? "pointer" : "not-allowed",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {bond.lockedByAdmin && <Lock width={15} height={15} aria-hidden />}
        Withdraw bond
      </button>
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "var(--ink-mute)" }}>{label}</span>
      <span style={{ fontWeight: 600, color: color ?? "var(--text-strong)" }}>{value}</span>
    </div>
  )
}

const KIND_LABEL: Record<BondActivityEntry["kind"], string> = {
  opening: "Opening deposit",
  profit: "Profit",
  loss: "Loss",
  deposit: "Deposit",
  withdrawal: "Withdrawal",
}

function ActivityRow({
  entry,
  currency,
}: {
  entry: BondActivityEntry
  currency: DisplayCurrency
}) {
  const amount = BigInt(entry.amountCents)
  const incoming = amount > 0n
  const d = new Date(entry.occurredAt)
  const pad = (n: number) => String(n).padStart(2, "0")
  const date = Number.isNaN(d.getTime())
    ? entry.occurredAt
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  const time = Number.isNaN(d.getTime())
    ? ""
    : `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

  return (
    <div className="ra-row" role="row">
      <div>
        <div className="ra-date">{date}</div>
        <div className="ra-time">{time}</div>
      </div>
      <div className="ra-name">
        {entry.description || KIND_LABEL[entry.kind]}
        <span
          style={{
            display: "block",
            fontSize: 11.5,
            fontWeight: 500,
            color: entry.kind === "loss" ? "#B23A3A" : entry.kind === "profit" ? "#2F855A" : "var(--ink-mute)",
          }}
        >
          {KIND_LABEL[entry.kind]}
          {entry.status === "pending" ? " · pending" : ""}
          {entry.status === "declined" ? " · declined" : ""}
          {entry.status === "reversed" ? " · reversed" : ""}
        </span>
      </div>
      <div className={cn("ra-amt", incoming && "pos")} style={!incoming ? { color: "#B23A3A" } : undefined}>
        {incoming ? "+" : "−"}
        {currencySymbol(currency)}
        {fmtCentsIn(amount, currency)}
      </div>
    </div>
  )
}
