/**
 * lib/mock-data.ts — the single barrel of demo fixtures.
 *
 * Existing fixtures live in /lib/fixtures/* and are richer than this barrel
 * (extra fields for goals, recurring transfers, etc). This file:
 *   1. Re-exports those fixtures so consumers can `import` from one place.
 *   2. Adds a spec-aligned `currentUser` shape with `hasDirectDeposit`.
 *   3. Pads the transaction history out to ~30 entries across ~60 days.
 *   4. Exposes a SETTLEMENT_DELAY_MS constant for the real-time toast.
 */

import { demoUser, demoAccounts } from "./fixtures/accounts"
import { demoTransactions, merchantGradient } from "./fixtures/transactions"
import { demoGoals, demoSplitAllocations, goalTemplates } from "./fixtures/goals"
import {
  demoLinkedAccounts,
  demoRecurring,
  demoAtms,
  SB_ROUTING,
  SB_ACCOUNT,
} from "./fixtures/move"
import { employers } from "./fixtures/employers"
import { demoNotifications, carouselSlides } from "./fixtures/notifications"
import { demoDeals } from "./fixtures/deals"
import type { Transaction } from "./store"

/* ─────────── Constants you tune for the demo ─────────── */

/** Time between an instant transfer hitting the feed and the settlement toast. */
export const SETTLEMENT_DELAY_MS = 30_000

/* ─────────── Spec-aligned `currentUser` ─────────── */

export const currentUser = {
  name: demoUser.name,
  email: "alex@cbb.gov.bh",
  handle: demoUser.novaTag,
  avatar: demoUser.initials,
  hasDirectDeposit: false,
}

/* ─────────── Extended transaction history ─────────── */

function daysAgo(d: number, h = 12, m = 0): string {
  const dt = new Date()
  dt.setDate(dt.getDate() - d)
  dt.setHours(h, m, 0, 0)
  return dt.toISOString()
}

const extraTransactions: Transaction[] = [
  { id: "tx_013", accountId: "acct_spending", amount: -3.85, currency: "USD", description: "Starbucks", category: "Dining", merchant: "Starbucks", status: "posted", date: daysAgo(15, 8, 12) },
  { id: "tx_014", accountId: "acct_spending", amount: -67.43, currency: "USD", description: "Amazon", category: "Shopping", merchant: "Amazon", status: "posted", date: daysAgo(16, 21, 4) },
  { id: "tx_015", accountId: "acct_spending", amount: 2148.93, currency: "USD", description: "Acme Co. Payroll", category: "Income", merchant: "Acme Co.", status: "posted", date: daysAgo(17, 8, 14) },
  { id: "tx_016", accountId: "acct_spending", amount: -22.5, currency: "USD", description: "Uber Trip", category: "Transport", merchant: "Uber", status: "posted", date: daysAgo(19, 23, 47) },
  { id: "tx_017", accountId: "acct_spending", amount: -14.2, currency: "USD", description: "DoorDash", category: "Dining", merchant: "DoorDash", status: "posted", date: daysAgo(22, 20, 18) },
  { id: "tx_018", accountId: "acct_spending", amount: -42.1, currency: "USD", description: "Whole Foods Market", category: "Groceries", merchant: "Whole Foods", status: "posted", date: daysAgo(24, 11, 0) },
  { id: "tx_019", accountId: "acct_spending", amount: -89.99, currency: "USD", description: "Verizon Wireless", category: "Utilities", merchant: "Verizon", status: "posted", date: daysAgo(27, 9, 0) },
  { id: "tx_020", accountId: "acct_spending", amount: -16.99, currency: "USD", description: "Spotify Premium", category: "Subscriptions", merchant: "Spotify", status: "posted", date: daysAgo(28, 5, 5) },
  { id: "tx_021", accountId: "acct_spending", amount: -8.4, currency: "USD", description: "Joe & The Juice", category: "Dining", merchant: "Joe & The Juice", status: "posted", date: daysAgo(30, 8, 30) },
  { id: "tx_022", accountId: "acct_spending", amount: 2148.93, currency: "USD", description: "Acme Co. Payroll", category: "Income", merchant: "Acme Co.", status: "posted", date: daysAgo(31, 8, 14) },
  { id: "tx_023", accountId: "acct_spending", amount: -1200, currency: "USD", description: "Brookfield Properties Rent", category: "Housing", merchant: "Brookfield", status: "posted", date: daysAgo(40, 9, 0) },
  { id: "tx_024", accountId: "acct_spending", amount: -34.6, currency: "USD", description: "Amazon", category: "Shopping", merchant: "Amazon", status: "posted", date: daysAgo(42, 17, 21) },
  { id: "tx_025", accountId: "acct_spending", amount: -52.4, currency: "USD", description: "Costco Wholesale", category: "Groceries", merchant: "Costco", status: "posted", date: daysAgo(46, 13, 12) },
  { id: "tx_026", accountId: "acct_spending", amount: -19.95, currency: "USD", description: "Lyft Trip", category: "Transport", merchant: "Lyft", status: "posted", date: daysAgo(48, 22, 11) },
  { id: "tx_027", accountId: "acct_spending", amount: 2148.93, currency: "USD", description: "Acme Co. Payroll", category: "Income", merchant: "Acme Co.", status: "posted", date: daysAgo(45, 8, 14) },
  { id: "tx_028", accountId: "acct_spending", amount: -4.5, currency: "USD", description: "Blue Bottle Coffee", category: "Dining", merchant: "Blue Bottle", status: "posted", date: daysAgo(52, 7, 55) },
  { id: "tx_029", accountId: "acct_spending", amount: -129.0, currency: "USD", description: "Apple Store", category: "Shopping", merchant: "Apple", status: "posted", date: daysAgo(55, 14, 22) },
  { id: "tx_030", accountId: "acct_spending", amount: -210.75, currency: "USD", description: "Target", category: "Shopping", merchant: "Target", status: "posted", date: daysAgo(58, 18, 5) },
]

export const transactions: Transaction[] = [
  ...demoTransactions,
  ...extraTransactions,
]

/* ─────────── Aligned `accounts` w/ mock numbers + status ─────────── */

export const accounts = demoAccounts.map((a) => ({
  ...a,
  status: "active" as const,
  mockAccountNumber: SB_ACCOUNT,
  mockRoutingNumber: SB_ROUTING,
}))

/* ─────────── Spec-aligned barrel ─────────── */

export {
  // Goals
  demoGoals as savingsGoals,
  demoSplitAllocations,
  goalTemplates,

  // Linked + recurring
  demoLinkedAccounts as linkedAccounts,
  demoRecurring as recurringTransfers,

  // ATMs / employers / numbers
  demoAtms as atmPins,
  employers,
  SB_ROUTING,
  SB_ACCOUNT,

  // Notifications / carousel
  demoNotifications as notifications,
  carouselSlides,

  // Deals
  demoDeals as deals,

  // helpers
  merchantGradient,
}
