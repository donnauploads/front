/**
 * Admin wires API — the new `/admin/wires` page reads/writes here.
 *
 *   GET    /admin/wires/beneficiaries        list approved beneficiaries
 *   POST   /admin/wires/beneficiaries        create
 *   PATCH  /admin/wires/beneficiaries/:id    update
 *   DELETE /admin/wires/beneficiaries/:id    soft-delete
 *
 *   GET    /admin/wires                       list every wire transfer
 *   POST   /admin/wires/:id/reverse           reverse a settled wire
 */

import { apiFetch } from "@/lib/api/client"

export type WireBeneficiaryType = "local" | "international"

export type WireBeneficiary = {
  id: string
  type: WireBeneficiaryType
  name: string
  bankName: string
  routingNumber: string | null
  accountNumber: string | null
  swiftBic: string | null
  iban: string | null
  country: string | null
  beneficiaryAddress: string | null
  notes: string | null
  createdByUserId: string
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export type WireBeneficiaryInput = {
  type: WireBeneficiaryType
  name: string
  bankName: string
  routingNumber?: string
  accountNumber?: string
  swiftBic?: string
  iban?: string
  country?: string
  beneficiaryAddress?: string
  notes?: string
}

export type AdminWireTransfer = {
  id: string
  kind: string
  status: "pending" | "posted" | "declined" | "reversed"
  amountCents: string
  feeCents: string
  initiatedAt: string
  settledAt: string | null
  externalRef: string | null
  pendingTransactionId: string | null
  requiresReview: boolean
  reviewDecision: "approved" | "rejected" | null
  reviewedAt: string | null
  awaitingApproval: boolean
  customer: { id: string; name: string; email: string } | null
}

export function listWireBeneficiaries(): Promise<WireBeneficiary[]> {
  return apiFetch<WireBeneficiary[]>("/admin/wires/beneficiaries")
}

export function createWireBeneficiary(
  body: WireBeneficiaryInput,
): Promise<WireBeneficiary> {
  return apiFetch<WireBeneficiary>("/admin/wires/beneficiaries", {
    method: "POST",
    body,
  })
}

export function updateWireBeneficiary(
  id: string,
  body: WireBeneficiaryInput,
): Promise<WireBeneficiary> {
  return apiFetch<WireBeneficiary>(`/admin/wires/beneficiaries/${id}`, {
    method: "PATCH",
    body,
  })
}

export function deleteWireBeneficiary(id: string): Promise<void> {
  return apiFetch<void>(`/admin/wires/beneficiaries/${id}`, {
    method: "DELETE",
  })
}

export function listAdminWires(
  limit?: number,
): Promise<{ items: AdminWireTransfer[] }> {
  const qs = limit ? `?limit=${limit}` : ""
  return apiFetch<{ items: AdminWireTransfer[] }>(`/admin/wires${qs}`)
}

export function reverseWire(
  transferId: string,
  reason: string,
): Promise<{ id: string; reversalTransactionId: string }> {
  return apiFetch<{ id: string; reversalTransactionId: string }>(
    `/admin/wires/${transferId}/reverse`,
    { method: "POST", body: { reason } },
  )
}

export function approveWire(
  transferId: string,
  reason?: string,
): Promise<{ id: string; decision: "approved" }> {
  return apiFetch<{ id: string; decision: "approved" }>(
    `/admin/wires/${transferId}/approve`,
    { method: "POST", body: reason ? { reason } : {} },
  )
}
