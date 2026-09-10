"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronRight, Landmark, Lock } from "lucide-react"
import { useStore } from "@/lib/store"
import { useToast } from "@/components/providers/ToastProvider"
import { WithdrawBondModal } from "@/components/bonds/WithdrawBondModal"
import { useBonds } from "@/lib/bonds/use-bonds"
import type { Bond } from "@/lib/bonds/api/bonds.real"
import { bondStatusLabel, currencySymbol, earningsPct, fmtCentsIn, fmtLongDate, fmtRate, fmtSignedCents } from "@/lib/bonds/format"
import {
  listMyLinkedAccounts,
  type RealLinkedAccountDto,
} from "@/lib/move/api/link-auth.real"

export default function BondsListPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { bonds, loading, refetch } = useBonds()
  const accounts = useStore((s) => s.accounts)
  const [linked, setLinked] = useState<RealLinkedAccountDto[]>([])
  const [target, setTarget] = useState<Bond | null>(null)

  useEffect(() => {
    listMyLinkedAccounts()
      .then((rows) => setLinked(rows.filter((r) => r.status === "connected")))
      .catch(() => setLinked([]))
  }, [])

  function onWithdrawClick(b: Bond) {
    if (b.lockedByAdmin) {
      toast("This bond is locked. Contact support.", { variant: "error" })
      return
    }
    if (!b.withdrawable) {
      toast("This bond hasn't matured yet.", { variant: "error" })
      return
    }
    setTarget(b)
  }

  return (
    <div className="space-y-5" style={{ maxWidth: 720, margin: "0 auto", padding: "8px 0 40px" }}>
      <button className="view-back" onClick={() => router.back()}>
        <ArrowLeft width={16} height={16} aria-hidden /> Back
      </button>

      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Bonds</h1>
      </div>

      {loading && <p style={{ color: "var(--ink-mute)" }}>Loading bonds…</p>}
      {!loading && bonds.length === 0 && (
        <p style={{ color: "var(--ink-mute)" }}>You don&rsquo;t have any bonds yet.</p>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        {bonds.map((b) => (
          <BondCard key={b.id} bond={b} onWithdraw={() => onWithdrawClick(b)} />
        ))}
      </div>

      {target && (
        <WithdrawBondModal
          bond={target}
          accounts={accounts.filter((a) => a.type === "checking" || a.type === "savings")}
          linked={linked}
          onClose={() => setTarget(null)}
          onDone={() => {
            setTarget(null)
            void refetch()
          }}
          toast={toast}
        />
      )}
    </div>
  )
}

function BondCard({ bond, onWithdraw }: { bond: Bond; onWithdraw: () => void }) {
  const enabled = bond.withdrawable
  const earnings = BigInt(bond.earningsCents)
  const pct = earningsPct(bond)
  const earningsColor =
    earnings > 0n ? "#2F855A" : earnings < 0n ? "#B23A3A" : "var(--text-strong)"

  return (
    <div className="acct" style={{ display: "block" }}>
      {/* Header + figures link through to the bond's detail page. */}
      <Link
        href={`/home/bonds/${encodeURIComponent(bond.id)}`}
        style={{ textDecoration: "none", color: "inherit", display: "block" }}
        aria-label={`${bond.label} details`}
      >
        <div className="acct-top">
          <div>
            <div className="acct-type">{bond.label}</div>
          </div>
          <span className="acct-chip" aria-hidden>
            <Landmark width={18} height={18} />
          </span>
        </div>

        <div
          className="acct-bal"
          style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}
        >
          <span>
            <span className="cur">{bond.currency}</span>
            {fmtCentsIn(bond.principalCents, bond.currency)}
          </span>
          {pct !== null && pct !== 0 && (
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: pct > 0 ? "#2F855A" : "#B23A3A",
                whiteSpace: "nowrap",
              }}
            >
              {pct > 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
            </span>
          )}
        </div>

        <div style={{ display: "grid", gap: 4, margin: "10px 0 14px", fontSize: 13, color: "var(--ink-soft)" }}>
          <Row label="Rate" value={`${fmtRate(bond.ratePct)} fixed`} />
          <Row
            label="Earnings"
            value={earnings === 0n ? `${currencySymbol(bond.currency)}0.00` : fmtSignedCents(earnings, bond.currency)}
            color={earningsColor}
          />
          <Row label="Issued" value={fmtLongDate(bond.createdAt)} />
          <Row label="Matures" value={fmtLongDate(bond.maturityAt)} />
          {bond.status !== "withdrawn" && bond.termDays > 0 && (
            <Row
              label="Term"
              value={`${bond.daysRemaining.toLocaleString()} day${bond.daysRemaining === 1 ? "" : "s"} remaining`}
            />
          )}
          <Row label="Status" value={bondStatusLabel(bond)} />
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginTop: 4,
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--gold, #c9a24a)",
            }}
          >
            View activity <ChevronRight width={14} height={14} aria-hidden />
          </div>
        </div>
      </Link>

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
