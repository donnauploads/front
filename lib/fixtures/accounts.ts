import type { Account, User } from "@/lib/store"

export const demoUser: User = {
  name: "Alex Rivera",
  novaTag: "$alex-rivera",
  memberSince: "2024",
  initials: "AR",
  avatarUrl: null,
}

export const demoAccounts: Account[] = [
  {
    id: "acct_spending",
    type: "checking",
    label: "Spending",
    balance: 2346.91,
    currency: "USD",
  },
  {
    id: "acct_credit_builder",
    type: "credit_builder",
    label: "Credit Builder",
    balance: 0,
    currency: "USD",
  },
  {
    id: "acct_savings",
    type: "savings",
    label: "Savings",
    balance: 5821.4,
    currency: "USD",
    apy: 1.0,
  },
]
