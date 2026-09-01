export type Deal = {
  id: string
  merchant: string
  short: string // initials for the avatar
  category: string
  cashbackPct: number
  expires: string // human readable
  body: string
  terms: string
  gradient: string
}

export const demoDeals: Deal[] = [
  {
    id: "d_starbucks",
    merchant: "Starbucks",
    short: "SB",
    category: "Dining",
    cashbackPct: 5,
    expires: "30 days",
    body: "Earn 5% cash back on any Starbucks purchase, including in-store and the app.",
    terms: "Max $10 cash back per month. Excludes gift card reloads.",
    gradient: "from-emerald-700 to-emerald-900",
  },
  {
    id: "d_uber",
    merchant: "Uber",
    short: "U",
    category: "Transport",
    cashbackPct: 10,
    expires: "14 days",
    body: "10% back on Uber rides and Uber Eats. Auto-applied at checkout.",
    terms: "Max $25 per month. Excludes Uber One subscriptions.",
    gradient: "from-zinc-800 to-zinc-950",
  },
  {
    id: "d_doordash",
    merchant: "DoorDash",
    short: "DD",
    category: "Dining",
    cashbackPct: 8,
    expires: "20 days",
    body: "8% back on every DoorDash order over $15.",
    terms: "Max $20 per month. Subscription fees excluded.",
    gradient: "from-red-600 to-rose-800",
  },
  {
    id: "d_target",
    merchant: "Target",
    short: "TG",
    category: "Shopping",
    cashbackPct: 4,
    expires: "45 days",
    body: "4% cash back at Target.com and in-store with your State Bank card.",
    terms: "Stacks with RedCard discount. Max $15/mo.",
    gradient: "from-red-700 to-red-900",
  },
  {
    id: "d_costco",
    merchant: "Costco",
    short: "CO",
    category: "Groceries",
    cashbackPct: 3,
    expires: "60 days",
    body: "3% back on Costco Wholesale purchases. Gas excluded.",
    terms: "Max $30 per month.",
    gradient: "from-sky-700 to-sky-950",
  },
  {
    id: "d_spotify",
    merchant: "Spotify",
    short: "SP",
    category: "Subscriptions",
    cashbackPct: 100,
    expires: "1 month",
    body: "Get one month of Spotify Premium on us when you pay with State Bank.",
    terms: "New subscribers only. Cancel anytime.",
    gradient: "from-green-600 to-emerald-800",
  },
  {
    id: "d_whole_foods",
    merchant: "Whole Foods",
    short: "WF",
    category: "Groceries",
    cashbackPct: 5,
    expires: "30 days",
    body: "5% back on groceries at Whole Foods, in-store or via Amazon Fresh.",
    terms: "Max $20 per month.",
    gradient: "from-emerald-800 to-green-950",
  },
  {
    id: "d_lyft",
    merchant: "Lyft",
    short: "LY",
    category: "Transport",
    cashbackPct: 6,
    expires: "14 days",
    body: "6% back on Lyft rides Monday through Friday.",
    terms: "Max $15/month. Weekday rides only.",
    gradient: "from-pink-600 to-fuchsia-800",
  },
  {
    id: "d_apple",
    merchant: "Apple",
    short: "AP",
    category: "Shopping",
    cashbackPct: 3,
    expires: "90 days",
    body: "3% back on Apple Store and apple.com purchases.",
    terms: "Max $50 per quarter. Excludes gift cards.",
    gradient: "from-zinc-700 to-zinc-900",
  },
]
