/**
 * Mock layer for the customer accounts list. Mirrors the shape of the
 * fixture array — the same data already seeded into the store by
 * StoreHydrator. Exposes a `listAccounts()` callable so consumers can flow
 * through the api/ switch identically in real and mock modes.
 */

import type { Account } from "@/lib/store"
import { demoAccounts } from "@/lib/fixtures/accounts"

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export async function listAccounts(): Promise<Account[]> {
  await wait(200)
  return demoAccounts
}
