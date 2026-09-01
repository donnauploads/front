/**
 * Admin KYC detail + decisions — separate file from kyc.real.ts to keep
 * the legacy mock-shape adapters there for the mocks-mode demo, while
 * the wired admin pages use these proper endpoints:
 *
 *   GET    /admin/kyc/users/:userId              → AdminKycDetail
 *   POST   /admin/kyc/:kycRecordId/decision      → approve / reject
 *   POST   /admin/kyc/documents/:docId/decision  → per-document
 */

import { apiFetch } from "@/lib/api/client"

export type AdminKycStatus = "pending" | "in_review" | "approved" | "rejected"
export type AdminDocumentStatus = "pending" | "approved" | "rejected"
export type AdminDocumentType =
  | "id_front"
  | "id_back"
  | "selfie"
  | "utility_bill"

export type AdminKycDocument = {
  id: string
  type: AdminDocumentType
  subtype: string | null
  status: AdminDocumentStatus
  contentType: string
  sizeBytes: number
  uploadedAt: string
  reviewedAt: string | null
  rejectionReason: string | null
  previewUrl: string | null
}

export type AdminKycDetail = {
  user: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    phoneE164: string | null
    novaTag: string | null
    status: string
    createdAt: string
  }
  kyc: {
    id: string
    status: AdminKycStatus
    submittedAt: string
    reviewedAt: string | null
    reviewedByUserId: string | null
    rejectionReason: string | null
    missingFields: string[]
  } | null
  documents: AdminKycDocument[]
}

export function getKycDetail(userId: string): Promise<AdminKycDetail> {
  return apiFetch<AdminKycDetail>(`/admin/kyc/users/${userId}`)
}

export function decideKyc(
  kycRecordId: string,
  decision: "approved" | "rejected",
  opts?: { reason?: string; missingFields?: string[] },
): Promise<{ id: string; status: AdminKycStatus }> {
  return apiFetch(`/admin/kyc/${kycRecordId}/decision`, {
    method: "POST",
    body: {
      decision,
      ...(opts?.reason ? { reason: opts.reason } : {}),
      ...(opts?.missingFields ? { missingFields: opts.missingFields } : {}),
    },
  })
}

export function decideKycDocument(
  documentId: string,
  decision: "approved" | "rejected",
  reason?: string,
): Promise<{ id: string; status: AdminDocumentStatus }> {
  return apiFetch(`/admin/kyc/documents/${documentId}/decision`, {
    method: "POST",
    body: {
      decision,
      ...(reason ? { reason } : {}),
    },
  })
}
