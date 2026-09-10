"use client"

import Link from "next/link"
import { Landmark } from "lucide-react"
import { useBonds } from "@/lib/bonds/use-bonds"
import { fmtSignedCents } from "@/lib/bonds/format"
import { convertFromBase, currencyDecimals, type DisplayCurrency } from "@/lib/currency"

/**
 * Aggregate "Bonds" card shown on the accounts + home pages. Clicking it opens
 * the bonds detail view. Hidden entirely when the customer has no bonds.
 */
export function BondsBox() {
  const { bonds, loading } = useBonds()
  // Hide only during the very first load (avoids a flash); once loaded the
  // card always shows — empty gets a "No bonds yet" state so it's a stable
  // entry point.
  if (loading) return null

  const empty = bonds.length === 0
  const n = bonds.length
  const countLabel = empty ? "No bonds yet" : `${n} bond${n > 1 ? "s" : ""}`

  // Bonds are stored dollar-based, so we can sum principals in USD directly.
  // The aggregate is shown in the bonds' shared display currency when they all
  // match; otherwise fall back to USD (the base) to avoid a misleading mix.
  const uniform = bonds.every((b) => b.currency === bonds[0]?.currency)
  const display: DisplayCurrency = uniform && bonds[0] ? bonds[0].currency : "USD"
  const totalUsdCents = bonds.reduce((a, b) => a + BigInt(b.principalCents), 0n)
  const bal = fmt(convertFromBase(Number(totalUsdCents) / 100, display), currencyDecimals(display))

  // Net earnings + % change against opening principal (USD is a valid common
  // base across all bonds), shown converted to the display currency.
  const earningsCents = bonds.reduce((a, b) => a + BigInt(b.earningsCents), 0n)
  const openingCents = bonds.reduce((a, b) => a + BigInt(b.openingPrincipalCents), 0n)
  const pct = openingCents > 0n ? (Number(earningsCents) / Number(openingCents)) * 100 : null
  const earningsLabel =
    earningsCents === 0n
      ? null
      : `${fmtSignedCents(earningsCents, display)} earned${pct !== null ? ` (${pct > 0 ? "▲" : "▼"} ${Math.abs(pct).toFixed(2)}%)` : ""}`
  const earningsColor = earningsCents > 0n ? "#2F855A" : earningsCents < 0n ? "#B23A3A" : undefined

  return (
    <Link
      href="/home/bonds"
      className="acct"
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div className="acct-top">
        <div>
          <div className="acct-type">Bonds</div>
          <div className="acct-no">···· ···· ····</div>
        </div>
        <span className="acct-chip" aria-hidden>
          <Landmark width={18} height={18} />
        </span>
      </div>
      <div className="acct-bal">
        <span className="cur">{display}</span>
        {bal.whole}
        {bal.dec}
      </div>
      <div className="acct-meta">
        {earningsLabel && (
          <>
            <span style={{ color: earningsColor, fontWeight: 600 }}>{earningsLabel}</span>
            <br />
          </>
        )}
        {countLabel}
      </div>
      <div className="acct-actions">
        <span>View bonds</span>
        <span>Details →</span>
      </div>
    </Link>
  )
}

function fmt(n: number, decimals = 2): { whole: string; dec: string } {
  const s = Math.abs(n).toFixed(decimals)
  const [w, d] = s.split(".")
  return { whole: Number(w).toLocaleString("en-US"), dec: d ? `.${d}` : "" }
}
