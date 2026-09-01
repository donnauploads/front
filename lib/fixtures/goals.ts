import type { SavingsGoal } from "@/lib/store"

export const goalTemplates = [
  { id: "travel", emoji: "🌴", label: "Travel", suggested: 2500 },
  { id: "car", emoji: "🚗", label: "Car", suggested: 5000 },
  { id: "emergency", emoji: "🛟", label: "Emergency", suggested: 1000 },
  { id: "home", emoji: "🏡", label: "Home", suggested: 10000 },
  { id: "gifts", emoji: "🎁", label: "Gifts", suggested: 500 },
  { id: "other", emoji: "✨", label: "Other", suggested: 1000 },
] as const

export const demoGoals: SavingsGoal[] = [
  {
    id: "g_my_savings",
    emoji: "💰",
    name: "My Savings",
    balance: 1820.45,
    target: null,
    isDefault: true,
    contributePerWeek: 50,
  },
  {
    id: "g_emergency",
    emoji: "🛟",
    name: "Emergency fund",
    balance: 2150.0,
    target: 5000,
    isDefault: false,
    contributePerWeek: 75,
  },
  {
    id: "g_travel",
    emoji: "🌴",
    name: "Tokyo trip",
    balance: 850.95,
    target: 3000,
    isDefault: false,
    contributePerWeek: 100,
  },
  {
    id: "g_wedding",
    emoji: "💍",
    name: "Wedding",
    balance: 1000.0,
    target: 8000,
    isDefault: false,
    contributePerWeek: 50,
  },
]

// Initial autosave configuration
export const demoSplitAllocations = [
  { id: "acct_spending", label: "Spending", percent: 75, emoji: "💳" },
  { id: "g_my_savings", label: "My Savings", percent: 5, emoji: "💰" },
  { id: "g_emergency", label: "Emergency fund", percent: 10, emoji: "🛟" },
  { id: "g_travel", label: "Tokyo trip", percent: 10, emoji: "🌴" },
]
