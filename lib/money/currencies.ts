/**
 * Frontend mirror of the backend FX currency metadata
 * (`backend/.../modules/fx/fx.constants.ts`). Used by the wire form to
 * parse/format amounts in the customer's send currency and to populate
 * the currency picker. The backend remains the source of truth for the
 * actual conversion rate.
 */

export type CurrencyCode =
  | "USD"
  | "BHD"
  | "SAR"
  | "AED"
  | "KWD"
  | "OMR"
  | "QAR"
  | "JOD"
  | "EUR"
  | "GBP"

/** Minor-unit exponent per currency (BHD/KWD/OMR/JOD are 3-decimal). */
export const CURRENCY_DECIMALS: Record<CurrencyCode, number> = {
  USD: 2,
  BHD: 3,
  SAR: 2,
  AED: 2,
  KWD: 3,
  OMR: 3,
  QAR: 2,
  JOD: 3,
  EUR: 2,
  GBP: 2,
}

/** Short label + symbol shown in the picker and amount field. */
export const CURRENCY_META: Record<
  CurrencyCode,
  { name: string; symbol: string }
> = {
  USD: { name: "US Dollar", symbol: "$" },
  BHD: { name: "Bahraini Dinar", symbol: "BD" },
  SAR: { name: "Saudi Riyal", symbol: "SR" },
  AED: { name: "UAE Dirham", symbol: "AED" },
  KWD: { name: "Kuwaiti Dinar", symbol: "KD" },
  OMR: { name: "Omani Rial", symbol: "OMR" },
  QAR: { name: "Qatari Riyal", symbol: "QR" },
  JOD: { name: "Jordanian Dinar", symbol: "JD" },
  EUR: { name: "Euro", symbol: "€" },
  GBP: { name: "British Pound", symbol: "£" },
}

export const SUPPORTED_CURRENCIES = Object.keys(
  CURRENCY_DECIMALS,
) as CurrencyCode[]

export function currencyDecimals(code: string): number {
  return CURRENCY_DECIMALS[code as CurrencyCode] ?? 2
}

/** Parse a typed major-unit string ("1,234.50") into integer minor units
 *  for the given currency. Returns null when the input isn't a number. */
export function toMinor(amount: string, code: CurrencyCode): bigint | null {
  const n = parseFloat(amount.replace(/,/g, ""))
  if (!Number.isFinite(n) || n < 0) return null
  return BigInt(Math.round(n * 10 ** currencyDecimals(code)))
}

/** Format integer minor units as a currency string with the right
 *  decimal places (e.g. 100500 BHD-fils → "BHD 100.500"). */
export function fmtMinor(minor: bigint | string, code: CurrencyCode): string {
  const dec = currencyDecimals(code)
  const n = Number(typeof minor === "bigint" ? minor : BigInt(minor)) / 10 ** dec
  return fmtMajor(n, code)
}

/** Format a major-unit number in the given currency. */
export function fmtMajor(n: number, code: CurrencyCode): string {
  const dec = currencyDecimals(code)
  try {
    return n.toLocaleString(code === "USD" ? "en-US" : "en", {
      style: "currency",
      currency: code,
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    })
  } catch {
    // Fallback if the runtime's Intl lacks the currency.
    return `${CURRENCY_META[code]?.symbol ?? code} ${n.toFixed(dec)}`
  }
}
