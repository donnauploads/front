import * as mock from "../mocks/transactions.mock"
import * as real from "./transactions.real"
import { useMocks } from "@/lib/dev/use-mocks-flag"

// Endpoints — swap.
export const patchTransaction = useMocks
  ? mock.patchTransaction
  : real.patchTransaction
export const deleteOverride = useMocks
  ? mock.deleteOverride
  : real.deleteOverride
export const bulkShift = useMocks ? mock.bulkShift : real.bulkShift

// Seed data — always from mock; that's the source for first-mount hydration.
export const demoAdminTxns = mock.demoAdminTxns

// Pure helpers + types — implementation-agnostic.
export {
  applyOverride,
  effectiveBalance,
  suggestOffset,
} from "../mocks/transactions.mock"
export type {
  EffectiveTx,
  PatchTxRequest,
  PatchTxResponse,
  BulkShiftRequest,
} from "../mocks/transactions.mock"
