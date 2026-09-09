import type { Bond } from "@/lib/bonds/api/bonds.real"

/** "1,234.56" from a cents string (absolute value). */
export function fmtCents(cents: string | bigint): string {
  const n = Number(BigInt(cents))
  return (Math.abs(n) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** "+$120.00" / "−$45.00" for a signed cents string. */
export function fmtSignedCents(cents: string | bigint): string {
  const n = BigInt(cents)
  const sign = n < 0n ? "−" : "+"
  return `${sign}$${fmtCents(n)}`
}

/** "9th August, 2026" */
export function fmtLongDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const day = d.getDate()
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th"
  const month = d.toLocaleDateString("en-GB", { month: "long" })
  return `${day}${suffix} ${month}, ${d.getFullYear()}`
}

/** "5.25%" */
export function fmtRate(pct: number): string {
  const s = Number.isInteger(pct) ? String(pct) : pct.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")
  return `${s}%`
}

/**
 * Customer-facing status label. Deliberately not a countdown — the Term row
 * carries days remaining.
 */
export function bondStatusLabel(b: Bond): string {
  if (b.status === "withdrawn") return "Withdrawn"
  if (b.lockedByAdmin) return "Closed"
  if (b.matured) return "Matured — ready to withdraw"
  if (b.waivePeriod) return "Early withdrawal open"
  return "Locked in"
}

/** Net earnings as a fraction of the opening principal, or null if unknown. */
export function earningsPct(b: Bond): number | null {
  const opening = BigInt(b.openingPrincipalCents)
  if (opening <= 0n) return null
  return (Number(BigInt(b.earningsCents)) / Number(opening)) * 100
}
