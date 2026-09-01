import * as mock from "../mocks/institutions.mock"
import * as real from "./institutions.real"
import { useMocks } from "@/lib/dev/use-mocks-flag"

export const fetchInstitutions = useMocks
  ? mock.fetchInstitutions
  : real.fetchInstitutions

// Catalog constant + helper + types are display/util concerns, not
// implementation-specific — always re-exported from the mock module.
export {
  INSTITUTIONS,
  describeAccountTypes,
  logoUrl,
} from "../mocks/institutions.mock"
export type { Institution, AccountType } from "../mocks/institutions.mock"
