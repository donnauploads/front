/**
 * Admin bond management (role-guarded on the backend).
 *   GET   /admin/bonds?userId=        → AdminBond[]
 *   POST  /admin/bonds                → AdminBond   (create for a user)
 *   PATCH /admin/bonds/:id            → AdminBond   (maturity / lock / waive / label / rate)
 *   POST  /admin/bonds/:id/earnings   → AdminBond   (record profit or loss)
 * Raw balance corrections still reuse POST /admin/transactions
 * (createAdminTransaction) on the bond's account id.
 */
import { apiFetch } from "@/lib/api/client"
import type { Bond } from "@/lib/bonds/api/bonds.real"

export type AdminBond = Bond

export function getAdminBonds(userId: string): Promise<AdminBond[]> {
  return apiFetch<AdminBond[]>(`/admin/bonds?userId=${encodeURIComponent(userId)}`)
}

export function createAdminBond(input: {
  userId: string
  label: string
  principalCents: string
  /** Issue/start date (ISO). May be backdated. Defaults to now server-side. */
  issuedAt?: string
  maturityAt: string
  /** Fixed rate as a percentage (5.25 = 5.25%). */
  ratePct?: number
  /** Display currency (USD/BHD/EUR/CNY). Defaults to USD. */
  currency?: string
}): Promise<AdminBond> {
  return apiFetch<AdminBond>("/admin/bonds", { method: "POST", body: input })
}

export function patchAdminBond(
  id: string,
  patch: {
    issuedAt?: string
    maturityAt?: string
    lockedByAdmin?: boolean
    waivePeriod?: boolean
    label?: string
    /** Fixed rate as a percentage (5.25 = 5.25%). */
    ratePct?: number
    /** Display currency (USD/BHD/EUR/CNY). */
    currency?: string
  },
): Promise<AdminBond> {
  return apiFetch<AdminBond>(`/admin/bonds/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  })
}

/** Record a profit (positive cents) or loss (negative cents) on a bond. Posts
 *  a transaction the customer sees in the bond's activity list. */
export function recordAdminBondEarnings(
  id: string,
  input: { amountCents: string; note?: string; occurredAt?: string },
): Promise<AdminBond> {
  return apiFetch<AdminBond>(`/admin/bonds/${encodeURIComponent(id)}/earnings`, {
    method: "POST",
    body: input,
  })
}
