import type { Bond } from "@/lib/bonds/api/bonds.real"
import {
  CURRENCIES,
  convertFromBase,
  currencyDecimals,
  isDisplayCurrency,
  type DisplayCurrency,
} from "@/lib/currency"

/** "1,234.56" from a cents string (absolute value). Plain USD number — no
 *  currency conversion (used where the base USD figure is wanted). */
export function fmtCents(cents: string | bigint): string {
  const n = Number(BigInt(cents))
  return (Math.abs(n) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** The symbol for a bond currency ("$", "BD", "€", "¥"), defaulting to "$". */
export function currencySymbol(code: DisplayCurrency | string): string {
  return CURRENCIES[code as DisplayCurrency]?.symbol ?? "$"
}

/** Coerce any stored value to a supported display currency (USD fallback). */
function asCurrency(code: DisplayCurrency | string): DisplayCurrency {
  return isDisplayCurrency(code) ? code : "USD"
}

/**
 * Bonds are stored dollar-based; the admin-set currency is a DISPLAY currency.
 * Convert a USD cents amount into `currency` and format the absolute value
 * (thousands separators, that currency's decimals) — the "currency equivalent".
 */
export function fmtCentsIn(
  cents: string | bigint,
  currency: DisplayCurrency | string,
): string {
  const code = asCurrency(currency)
  const usd = Number(BigInt(cents)) / 100
  const dp = currencyDecimals(code)
  return Math.abs(convertFromBase(usd, code)).toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  })
}

/** "+$120.00" / "−BD45.00" for a signed USD cents string, converted to and
 *  shown in the bond's display currency. */
export function fmtSignedCents(
  cents: string | bigint,
  currency: DisplayCurrency | string = "USD",
): string {
  const n = BigInt(cents)
  const sign = n < 0n ? "−" : "+"
  return `${sign}${currencySymbol(currency)}${fmtCentsIn(n, currency)}`
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
