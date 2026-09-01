/**
 * FX rates for the customer dashboard's display-currency conversion. Hits the
 * backend's live feed (`GET /fx/rates` → open.er-api.com, server-cached with a
 * pegged fallback) so balances are shown at the same rate the wire flow
 * settles at. Loaded once on boot; see `setLiveDisplayRates` in lib/currency.
 */

import { apiFetch } from "@/lib/api/client"

export type FxRatesResponse = {
  base: string
  /** Units of each currency per 1 USD. */
  rates: Record<string, number>
  /** ISO timestamp of the underlying rate table. */
  asOf: string
  source: "live" | "peg"
}

/** Live "units per 1 USD" table for every currency the backend supports. */
export function fetchFxRatesPerUsd(): Promise<FxRatesResponse> {
  return apiFetch<FxRatesResponse>("/fx/rates")
}
