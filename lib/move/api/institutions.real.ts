/**
 * Real adapter for the Plaid Link institution catalog (planning doc
 * 2.9.2 / Stage 9). Backend not built — stubbed.
 */

import type { Institution } from "../mocks/institutions.mock"

export async function fetchInstitutions(): Promise<readonly Institution[]> {
  throw new Error(
    "institutions: real backend not implemented yet (WIRE-4).",
  )
}
