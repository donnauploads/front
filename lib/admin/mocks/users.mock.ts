import type { AdminUser } from "@/lib/store"

function daysAgoIso(d: number): string {
  return new Date(Date.now() - d * 86_400_000).toISOString()
}
function hoursAgoIso(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString()
}

export const demoAdminUsers: AdminUser[] = [
  { id: "u_001", name: "Maya Okafor", email: "maya.okafor@cbb.gov.bh", novaTag: "$maya", phoneE164: "+14155550199", role: "customer", status: "pending_kyc", lastSignInAt: hoursAgoIso(2), createdAt: daysAgoIso(1) },
  { id: "u_002", name: "Jamal Patel", email: "jamal.patel@cbb.gov.bh", novaTag: "$jamal", phoneE164: "+12125550144", role: "customer", status: "pending_kyc", lastSignInAt: hoursAgoIso(6), createdAt: daysAgoIso(1) },
  { id: "u_003", name: "Priya Rao", email: "priya.rao@cbb.gov.bh", novaTag: "$priya", phoneE164: "+14155550190", role: "customer", status: "pending_kyc", lastSignInAt: hoursAgoIso(8), createdAt: daysAgoIso(2) },
  { id: "u_004", name: "Theo Ward", email: "theo.ward@cbb.gov.bh", novaTag: "$theo", phoneE164: "+13125550111", role: "customer", status: "pending_kyc", lastSignInAt: hoursAgoIso(11), createdAt: daysAgoIso(3) },
  { id: "u_005", name: "Lena Kovac", email: "lena.kovac@cbb.gov.bh", novaTag: "$lena", phoneE164: "+15035550172", role: "customer", status: "pending_kyc", lastSignInAt: hoursAgoIso(20), createdAt: daysAgoIso(4) },
  { id: "u_006", name: "Alex Rivera", email: "alex@cbb.gov.bh", novaTag: "$alex-rivera", phoneE164: "+14155550117", role: "customer", status: "active", lastSignInAt: hoursAgoIso(1), createdAt: daysAgoIso(28) },
  { id: "u_007", name: "Sam Kapoor", email: "sam.k@cbb.gov.bh", novaTag: "$sam-k", phoneE164: "+14155550117", role: "customer", status: "active", lastSignInAt: hoursAgoIso(4), createdAt: daysAgoIso(60) },
  { id: "u_008", name: "Devon Smith", email: "devon@cbb.gov.bh", novaTag: "$devon", phoneE164: "+12125550155", role: "customer", status: "active", lastSignInAt: hoursAgoIso(36), createdAt: daysAgoIso(120) },
  { id: "u_009", name: "Riya Patel", email: "riya@cbb.gov.bh", novaTag: "$riya", phoneE164: "+13125550109", role: "customer", status: "active", lastSignInAt: hoursAgoIso(72), createdAt: daysAgoIso(200) },
  { id: "u_010", name: "Mateo Rojas", email: "mateo@cbb.gov.bh", novaTag: "$mateo", phoneE164: "+12125550177", role: "customer", status: "suspended", lastSignInAt: daysAgoIso(14), createdAt: daysAgoIso(180) },
  { id: "u_011", name: "Casey Lin", email: "casey.lin@cbb.gov.bh", novaTag: "$casey", phoneE164: "+16175550133", role: "admin", status: "active", lastSignInAt: hoursAgoIso(3), createdAt: daysAgoIso(420) },
  { id: "u_012", name: "Sky Bradford", email: "sky@cbb.gov.bh", novaTag: "$sky", phoneE164: "+12065550144", role: "superadmin", status: "active", lastSignInAt: hoursAgoIso(0.5), createdAt: daysAgoIso(900) },
]
