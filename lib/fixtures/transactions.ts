import type { Transaction } from "@/lib/store"

// Helper — build an ISO date relative to today
function daysAgo(d: number, h = 12, m = 0): string {
  const dt = new Date()
  dt.setDate(dt.getDate() - d)
  dt.setHours(h, m, 0, 0)
  return dt.toISOString()
}

export const demoTransactions: Transaction[] = [
  {
    id: "tx_001",
    accountId: "acct_spending",
    amount: 2148.93,
    currency: "USD",
    description: "Acme Co. Payroll",
    category: "Income",
    merchant: "Acme Co.",
    status: "posted",
    date: daysAgo(0, 8, 14),
  },
  {
    id: "tx_002",
    accountId: "acct_spending",
    amount: -42.17,
    currency: "USD",
    description: "Whole Foods Market",
    category: "Groceries",
    merchant: "Whole Foods",
    status: "posted",
    date: daysAgo(0, 19, 32),
  },
  {
    id: "tx_003",
    accountId: "acct_spending",
    amount: -12.5,
    currency: "USD",
    description: "Joe & The Juice",
    category: "Dining",
    merchant: "Joe & The Juice",
    status: "pending",
    date: daysAgo(1, 9, 14),
  },
  {
    id: "tx_004",
    accountId: "acct_spending",
    amount: -98.0,
    currency: "USD",
    description: "Con Edison",
    category: "Utilities",
    merchant: "Con Edison",
    status: "posted",
    date: daysAgo(2, 11, 0),
  },
  {
    id: "tx_005",
    accountId: "acct_spending",
    amount: -16.99,
    currency: "USD",
    description: "Spotify Premium",
    category: "Subscriptions",
    merchant: "Spotify",
    status: "posted",
    date: daysAgo(3, 5, 5),
  },
  {
    id: "tx_006",
    accountId: "acct_spending",
    amount: -28.6,
    currency: "USD",
    description: "Uber Trip",
    category: "Transport",
    merchant: "Uber",
    status: "posted",
    date: daysAgo(4, 22, 41),
  },
  {
    id: "tx_007",
    accountId: "acct_spending",
    amount: 50,
    currency: "USD",
    description: "Round-Up Savings transfer in",
    category: "Transfer",
    merchant: "State Bank Savings",
    status: "posted",
    date: daysAgo(5, 6, 0),
  },
  {
    id: "tx_008",
    accountId: "acct_spending",
    amount: -156.32,
    currency: "USD",
    description: "Costco Wholesale",
    category: "Groceries",
    merchant: "Costco",
    status: "posted",
    date: daysAgo(6, 13, 12),
  },
  {
    id: "tx_009",
    accountId: "acct_spending",
    amount: -9.84,
    currency: "USD",
    description: "Blue Bottle Coffee",
    category: "Dining",
    merchant: "Blue Bottle",
    status: "posted",
    date: daysAgo(7, 7, 30),
  },
  {
    id: "tx_010",
    accountId: "acct_spending",
    amount: -1200,
    currency: "USD",
    description: "Brookfield Properties Rent",
    category: "Housing",
    merchant: "Brookfield",
    status: "posted",
    date: daysAgo(10, 9, 0),
  },
  {
    id: "tx_011",
    accountId: "acct_spending",
    amount: -64.27,
    currency: "USD",
    description: "Target",
    category: "Shopping",
    merchant: "Target",
    status: "posted",
    date: daysAgo(12, 17, 20),
  },
  {
    id: "tx_012",
    accountId: "acct_spending",
    amount: 200,
    currency: "USD",
    description: "Friend transfer — Sam K.",
    category: "Transfer",
    merchant: "Sam K.",
    status: "posted",
    date: daysAgo(14, 18, 0),
  },
]

/** Stable color per merchant for the placeholder avatar gradient. */
export function merchantGradient(name: string): string {
  const palettes = [
    "from-fuchsia-500 to-rose-500",
    "from-amber-400 to-orange-600",
    "from-sky-400 to-indigo-600",
    "from-emerald-400 to-teal-600",
    "from-lime-400 to-green-600",
    "from-violet-500 to-purple-700",
    "from-pink-400 to-rose-600",
    "from-cyan-400 to-blue-600",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return palettes[Math.abs(hash) % palettes.length]
}
