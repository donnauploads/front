/**
 * Real-world bank routing numbers + SWIFT/BIC codes, keyed by the
 * `Institution.id` from `frontend/lib/move/mocks/institutions.mock.ts`.
 *
 * Used on the wire transfer page to:
 *   - Auto-fill SWIFT / country when an international bank is picked.
 *   - Inline-validate the user's typed routing or SWIFT against the
 *     expected value for the picked bank, so they catch mismatches
 *     before they hit the backend.
 *
 * Coverage is intentionally partial — major US/UK/EU institutions
 * where the routing/SWIFT is publicly published. Banks without an
 * entry skip the per-bank check (they still go through the existing
 * `verifyBeneficiary` server check, which has a more complete list).
 *
 * Sources: institution websites' published wire instructions. Some
 * large banks have multiple ABAs by region — we list the most common
 * "wire" routing (these often differ from the per-state direct deposit
 * ABAs); the backend verify is the source of truth.
 */

export type BankCodes = {
  /** ABA routing number for incoming wires (9 digits). US/CA only. */
  routingNumber?: string
  /** SWIFT / BIC code (8 or 11 chars). International + many US banks. */
  swiftBic?: string
}

export const BANK_CODES: Record<string, BankCodes> = {
  // ── United States ───────────────────────────────────────────────
  chase: { routingNumber: "021000021", swiftBic: "CHASUS33" },
  bofa: { routingNumber: "026009593", swiftBic: "BOFAUS3N" },
  wells: { routingNumber: "121000248", swiftBic: "WFBIUS6S" },
  citi: { routingNumber: "021000089", swiftBic: "CITIUS33" },
  usbank: { routingNumber: "091000022", swiftBic: "USBKUS44IMT" },
  pnc: { routingNumber: "043000096", swiftBic: "PNCCUS33" },
  td: { routingNumber: "031101266", swiftBic: "NRTHUS33" },
  capone: { routingNumber: "051405515", swiftBic: "HIBKUS44" },
  ally: { routingNumber: "124003116", swiftBic: "ALLYUS31" },
  sofi: { routingNumber: "031101334", swiftBic: "SFBIUS6S" },
  schwab: { routingNumber: "121202211", swiftBic: "CSCHUS6S" },
  "charles-schwab": { routingNumber: "121202211", swiftBic: "CSCHUS6S" },
  fidelity: { routingNumber: "101205681", swiftBic: "POBOUS66" },
  navyfederal: { routingNumber: "256074974" },
  usaa: { routingNumber: "314074269" },
  marcus: { routingNumber: "124085024" },
  discover: { routingNumber: "031100649" },
  amex: { routingNumber: "124085066", swiftBic: "AEIBUS33" },
  chime: { routingNumber: "031101279" },
  varo: { routingNumber: "211370545" },
  current: { routingNumber: "041215663" },
  mercury: { routingNumber: "021214891" },
  synchrony: { routingNumber: "021213591" },
  citizens: { routingNumber: "011500120", swiftBic: "CTZIUS33" },
  fifththird: { routingNumber: "042000314", swiftBic: "FTBCUS3C" },
  keybank: { routingNumber: "041001039", swiftBic: "KEYBUS33" },
  regions: { routingNumber: "062000019", swiftBic: "UPNBUS44" },
  huntington: { routingNumber: "044000024", swiftBic: "HUNTUS33" },
  "bbt-truist": { routingNumber: "053101121", swiftBic: "BRBTUS33" },
  firstrepublic: { routingNumber: "321081669" },

  // ── United Kingdom ─────────────────────────────────────────────
  barclays: { swiftBic: "BARCGB22" },
  hsbc: { swiftBic: "MIDLGB22" },
  lloyds: { swiftBic: "LOYDGB2L" },
  natwest: { swiftBic: "NWBKGB2L" },

  // ── Europe ──────────────────────────────────────────────────────
  // (Selectively — add more as needed; backend verify covers the rest.)
}

/** Lookup by institution id. Returns null if we don't have codes
 *  on file (caller should fall back to the backend verify only). */
export function bankCodesFor(institutionId: string): BankCodes | null {
  return BANK_CODES[institutionId] ?? null
}
