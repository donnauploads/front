/**
 * Admin app-settings endpoints (role-guarded on the backend).
 *   GET   /admin/settings          → AdminSettings
 *   PATCH /admin/settings  {…}     → AdminSettings (audit-logged)
 */
import { apiFetch } from "@/lib/api/client"

export type AdminSettings = {
  requireWireBeneficiaryVerification: boolean
  /** When true, login shows the MFA step; when false, correct credentials go
   *  straight to the dashboard. */
  requireMfaOnLogin: boolean
}

export function getAdminSettings(): Promise<AdminSettings> {
  return apiFetch<AdminSettings>("/admin/settings")
}

export function updateAdminSettings(
  patch: Partial<AdminSettings>,
): Promise<AdminSettings> {
  return apiFetch<AdminSettings>("/admin/settings", {
    method: "PATCH",
    body: patch,
  })
}
