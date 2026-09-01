export type LinkedAccount = {
  id: string
  bank: string
  type: "checking" | "savings" | "debit"
  mask: string
  status: "connected" | "out_of_sync" | "needs_reauth"
  lastSynced: string
}

export type RecurringTransfer = {
  id: string
  fromId: string
  fromLabel: string
  toId: string
  toLabel: string
  amount: number
  frequency: "weekly" | "biweekly" | "monthly"
  // For weekly/biweekly: day-of-week 0–6 (Sun–Sat). For monthly: day-of-month 1–28.
  dayOf: number
  nextRun: string // ISO
  active: boolean
}

export type Employer = {
  id: string
  name: string
  logo: string // background color class for the placeholder
  short: string
  /** Primary website used for live logo lookup (https://logo.clearbit.com/{domain}). */
  domain?: string
}

export type AtmPin = {
  id: string
  name: string
  address: string
  distanceMi: number
  open24: boolean
  // Approximate position on the fake map canvas (0–100% of viewport)
  x: number
  y: number
}

export const demoLinkedAccounts: LinkedAccount[] = [
  {
    id: "la_sofi_checking",
    bank: "SoFi Checking",
    type: "checking",
    mask: "7129",
    status: "connected",
    lastSynced: "31 minutes ago",
  },
  {
    id: "la_chase_savings",
    bank: "Chase Savings",
    type: "savings",
    mask: "8842",
    status: "connected",
    lastSynced: "2 hours ago",
  },
  {
    id: "la_capital_one",
    bank: "Capital One Checking",
    type: "checking",
    mask: "1043",
    status: "needs_reauth",
    lastSynced: "Out of sync",
  },
  {
    id: "la_sofi_debit",
    bank: "SoFi Debit",
    type: "debit",
    mask: "7109",
    status: "connected",
    lastSynced: "5 minutes ago",
  },
  {
    id: "la_wells_fargo",
    bank: "Wells Fargo Checking",
    type: "checking",
    mask: "9921",
    status: "out_of_sync",
    lastSynced: "3 days ago",
  },
]

export const demoRecurring: RecurringTransfer[] = [
  {
    id: "rt_1",
    fromId: "la_sofi_checking",
    fromLabel: "SoFi Checking •• 7129",
    toId: "acct_spending",
    toLabel: "State Bank Spending",
    amount: 25,
    frequency: "biweekly",
    dayOf: 1, // Mon
    nextRun: new Date(Date.now() + 8 * 86400000).toISOString(),
    active: true,
  },
  {
    id: "rt_2",
    fromId: "acct_spending",
    fromLabel: "State Bank Spending",
    toId: "g_emergency",
    toLabel: "Emergency fund",
    amount: 75,
    frequency: "weekly",
    dayOf: 5, // Fri
    nextRun: new Date(Date.now() + 3 * 86400000).toISOString(),
    active: true,
  },
  {
    id: "rt_3",
    fromId: "acct_spending",
    fromLabel: "State Bank Spending",
    toId: "g_travel",
    toLabel: "Tokyo trip",
    amount: 200,
    frequency: "monthly",
    dayOf: 1,
    nextRun: new Date(Date.now() + 14 * 86400000).toISOString(),
    active: false,
  },
]

// Big-employer directory is its own file so this fixture stays scannable.
export { employers } from "./employers"

export const demoAtms: AtmPin[] = [
  {
    id: "atm_1",
    name: "Allpoint · Walgreens",
    address: "324 W 42nd St",
    distanceMi: 0.3,
    open24: true,
    x: 38,
    y: 42,
  },
  {
    id: "atm_2",
    name: "MoneyPass · CVS",
    address: "601 8th Ave",
    distanceMi: 0.5,
    open24: true,
    x: 55,
    y: 30,
  },
  {
    id: "atm_3",
    name: "Allpoint · Target",
    address: "112 W 34th St",
    distanceMi: 0.8,
    open24: false,
    x: 22,
    y: 65,
  },
  {
    id: "atm_4",
    name: "MoneyPass · 7-Eleven",
    address: "780 6th Ave",
    distanceMi: 1.1,
    open24: true,
    x: 70,
    y: 70,
  },
  {
    id: "atm_5",
    name: "Allpoint · Duane Reade",
    address: "1080 Park Ave",
    distanceMi: 1.6,
    open24: false,
    x: 80,
    y: 25,
  },
]

export const SB_ROUTING = "031101279"
export const SB_ACCOUNT = "8829410372"
