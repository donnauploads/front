# State Bank mock fixtures

This directory holds typed mock data the dashboard reads via the zustand store
in `lib/store.ts`. Each tab's content stage adds its own fixtures here.

Planned files (added per stage as needed):

- `user.ts` — current user (name, novaTag, memberSince, initials)
- `accounts.ts` — checking, savings, credit-builder, mypay balances
- `transactions.ts` — last ~60 days of mixed deposits/debits
- `deals.ts` — cashback offers
- `recurring.ts` — scheduled transfers

Keep all amounts realistic but obviously demo-grade. No PII.
