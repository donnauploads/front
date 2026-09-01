/**
 * Display-currency support for the customer dashboard.
 *
 * Account balances and transaction amounts are stored in the app's BASE
 * currency (USD). The user can pick a *display* currency from the topbar
 * account menu; we convert base → display at render time using the static
 * rates below (demo rates — swap for a live FX feed later). The chosen
 * currency lives in the persisted store (`displayCurrency`), so it's
 * per-user and sticks across reloads.
 */

export type DisplayCurrency = "USD" | "BHD" | "EUR" | "CNY"

export type CurrencyDef = {
  code: DisplayCurrency
  label: string
  symbol: string
  /** 1 USD = `rate` units of this currency. */
  rate: number
  decimals: number
}

export const BASE_CURRENCY: DisplayCurrency = "USD"

export const CURRENCIES: Record<DisplayCurrency, CurrencyDef> = {
  USD: { code: "USD", label: "US Dollar", symbol: "$", rate: 1, decimals: 2 },
  BHD: { code: "BHD", label: "Bahraini Dinar", symbol: "BD", rate: 0.376, decimals: 2 },
  EUR: { code: "EUR", label: "Euro", symbol: "€", rate: 0.92, decimals: 2 },
  CNY: { code: "CNY", label: "Chinese Yuan", symbol: "¥", rate: 7.2, decimals: 2 },
}

export const CURRENCY_OPTIONS: CurrencyDef[] = Object.values(CURRENCIES)

/**
 * Live "units per 1 USD" rates loaded at runtime from the backend FX feed
 * (`GET /fx/rates` → open.er-api.com, cached + peg-fallback server-side). When
 * present these OVERRIDE the static `rate` fallbacks above, so display values
 * match the live rate the wire flow settles at — one source of truth across
 * the platform. Empty until `setLiveDisplayRates` runs on app boot; the static
 * rates (Gulf pegs are exact, EUR/CNY approximate) cover that brief window and
 * any offline/feed-down case.
 */
let liveRatesPerUsd: Partial<Record<DisplayCurrency, number>> = {}

/** Feed live per-USD rates in (called once on boot from SessionBootstrap).
 *  Only known display currencies with a positive rate are kept. */
export function setLiveDisplayRates(perUsd: Record<string, number>): void {
  const next: Partial<Record<DisplayCurrency, number>> = {}
  for (const code of Object.keys(CURRENCIES) as DisplayCurrency[]) {
    const v = perUsd[code]
    if (typeof v === "number" && v > 0) next[code] = v
  }
  liveRatesPerUsd = next
}

/** The effective rate for `code`: live if loaded, else the static fallback. */
function rateOf(code: DisplayCurrency): number {
  return liveRatesPerUsd[code] ?? CURRENCIES[code]?.rate ?? 1
}

export function isDisplayCurrency(v: unknown): v is DisplayCurrency {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(CURRENCIES, v)
}

/** Convert an amount stored in the base currency (USD) into `code`. */
export function convertFromBase(amountBase: number, code: DisplayCurrency): number {
  return amountBase * rateOf(code)
}

/** Convert an amount entered in `code` back into the base currency (USD).
 *  Used by money-move flows where the user types in their display currency
 *  but the ledger (balances, transfers) is stored in USD. */
export function convertToBase(amountDisplay: number, code: DisplayCurrency): number {
  return amountDisplay / rateOf(code)
}

export function currencyDecimals(code: DisplayCurrency): number {
  return CURRENCIES[code]?.decimals ?? 2
}

/**
 * Convert a base (USD) amount to `code` and format it as a currency string
 * (Intl `style: "currency"` → "$1,234.00", "BHD 1,234.00", "€1,234.00", …),
 * using this app's per-currency decimal count.
 */
export function formatMoney(amountBase: number, code: DisplayCurrency): string {
  const dp = currencyDecimals(code)
  return convertFromBase(amountBase, code).toLocaleString("en-US", {
    style: "currency",
    currency: code,
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  })
}
