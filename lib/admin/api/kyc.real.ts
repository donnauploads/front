/**
 * Real adapter for admin KYC review endpoints (planning doc 2.17.4–
 * 2.17.5). Backend not implemented — stubs throw so the wiring boundary
 * is observable when NEXT_PUBLIC_USE_MOCKS=false.
 */

import type { KycStatus, KycSubmission } from "@/lib/store"

const NOT_IMPL = "admin/kyc: real backend not implemented yet (WIRE-4)."

export async function listKyc(_filter?: {
  status?: KycStatus | "all"
  from?: string
  to?: string
}): Promise<KycSubmission[]> {
  throw new Error(NOT_IMPL)
}

export async function getKyc(_userId: string): Promise<KycSubmission> {
  throw new Error(NOT_IMPL)
}

export async function updateKycDecision(_args: {
  id: string
  decision: KycStatus
  reason?: string
}): Promise<KycSubmission> {
  throw new Error(NOT_IMPL)
}
