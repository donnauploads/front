import * as mock from "../mocks/transactions.mock"
import * as real from "./transactions.real"
import { useMocks } from "@/lib/dev/use-mocks-flag"

export const listTransactions = useMocks
  ? mock.listTransactions
  : real.listTransactions

export type {
  ListTransactionsArgs,
  TransactionListPage,
} from "../mocks/transactions.mock"
