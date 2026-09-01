import * as mock from "../mocks/accounts.mock"
import * as real from "./accounts.real"
import { useMocks } from "@/lib/dev/use-mocks-flag"

export const listAccounts = useMocks
  ? mock.listAccounts
  : real.listAccounts
