/**
 * Customer documents — statements, tax forms, policies.
 *
 *   GET  /statements                 → StatementListItem[]
 *   GET  /statements/:id/download    → { url }
 *   POST /statements/custom          → PDF (application/pdf)
 *   GET  /tax-forms                  → TaxFormListItem[]
 *   GET  /tax-forms/:id/download     → { url }
 *   GET  /policies                   → PolicyListItem[]
 *
 * Backend lives at backend/apps/api/src/modules/statements, /tax-forms,
 * /policy-docs.
 */

import { apiFetch } from "@/lib/api/client"

/**
 * Returns the URL prefix used for binary downloads. Prefers
 * `NEXT_PUBLIC_API_DIRECT_BASE` so we hit the backend cross-origin
 * and skip the Vercel rewrite — which would otherwise impose a 10s
 * serverless-function timeout and a 4.5 MB response cap on PDFs.
 *
 * Tolerates either form of the direct env var:
 *   `https://api.example.com`            → appends `/api/v1`
 *   `https://api.example.com/api/v1`     → used as-is
 *
 * Falls back to the relative `NEXT_PUBLIC_API_BASE` (the proxy) when
 * no direct base is configured — works for local dev where the rewrite
 * has no timeout / size cap.
 */
function directBase(): string {
  const proxy = (process.env.NEXT_PUBLIC_API_BASE ?? "/api/v1").replace(/\/$/, "")
  const direct = process.env.NEXT_PUBLIC_API_DIRECT_BASE?.trim().replace(/\/$/, "")
  if (!direct) return proxy
  // If the direct env already ends with the proxy path (e.g. /api/v1),
  // use as-is. Otherwise append the proxy path so endpoints resolve.
  if (proxy && direct.endsWith(proxy)) return direct
  return `${direct}${proxy}`
}
import { getAccessToken } from "@/lib/api/token-store"
import { ApiError, NetworkError } from "@/lib/api/errors"

export type StatementListItem = {
  id: string
  accountId: string
  accountLabel: string
  periodStart: string
  periodEnd: string
  sizeBytes: number
  generatedAt: string
}

export type TaxFormListItem = {
  id: string
  formType: string
  taxYear: number
  sizeBytes: number
  generatedAt: string
}

export type PolicyListItem = {
  slug: string
  title: string
  version: string
  effectiveAt: string
}

export function listStatements(): Promise<StatementListItem[]> {
  return apiFetch<StatementListItem[]>("/statements")
}

export function getStatementUrl(id: string): Promise<{ url: string }> {
  return apiFetch<{ url: string }>(`/statements/${id}/download`)
}

export function listTaxForms(): Promise<TaxFormListItem[]> {
  return apiFetch<TaxFormListItem[]>("/tax-forms")
}

export function getTaxFormUrl(id: string): Promise<{ url: string }> {
  return apiFetch<{ url: string }>(`/tax-forms/${id}/download`)
}

export function listPolicies(): Promise<PolicyListItem[]> {
  return apiFetch<PolicyListItem[]>("/policies")
}

/**
 * Download the latest version of a policy as a branded PDF. The
 * endpoint is public (matches the rest of /policies/*), so we can use a
 * direct fetch without a bearer token.
 */
export async function downloadPolicyPdf(
  slug: string,
): Promise<{ blob: Blob; filename: string }> {
  // Prefer the DIRECT (cross-origin) backend URL for binary downloads.
  // Vercel's serverless rewrite has a 10s timeout + 4.5MB response cap
  // on Hobby — PDFs blow past one or both. Direct hits Railway with no
  // proxy hop. Backend CORS must list the deployed Vercel origins.
  const BASE = directBase()
  let res: Response
  try {
    res = await fetch(`${BASE}/policies/${encodeURIComponent(slug)}/pdf`, {
      credentials: "include",
      headers: { "ngrok-skip-browser-warning": "true" },
    })
  } catch (e) {
    throw new NetworkError(e)
  }
  if (!res.ok) {
    const text = await res.text()
    let payload: { code?: string; message?: string } | null = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = null
    }
    throw new ApiError(
      payload?.code ?? `HTTP_${res.status}`,
      payload?.message ?? (text || res.statusText),
      undefined,
      res.status,
    )
  }
  const blob = await res.blob()
  const disposition = res.headers.get("Content-Disposition") ?? ""
  const match = /filename="?([^";]+)"?/i.exec(disposition)
  const filename = match?.[1] ?? `State Bank-${slug}.pdf`
  return { blob, filename }
}

/**
 * Download a statement for a custom date range. The server streams the
 * PDF back directly so the user gets the file even though no `Statement`
 * row exists for the period.
 */
export async function downloadCustomStatement(input: {
  accountId: string
  periodStart: string
  periodEnd: string
}): Promise<{ blob: Blob; filename: string }> {
  // Prefer the DIRECT (cross-origin) backend URL for binary downloads.
  // Vercel's serverless rewrite has a 10s timeout + 4.5MB response cap
  // on Hobby — PDFs blow past one or both. Direct hits Railway with no
  // proxy hop. Backend CORS must list the deployed Vercel origins.
  const BASE = directBase()
  const headers = new Headers({ "Content-Type": "application/json" })
  const token = getAccessToken()
  if (token) headers.set("Authorization", `Bearer ${token}`)
  headers.set("ngrok-skip-browser-warning", "true")

  let res: Response
  try {
    res = await fetch(`${BASE}/statements/custom`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(input),
    })
  } catch (e) {
    throw new NetworkError(e)
  }

  if (!res.ok) {
    const text = await res.text()
    let payload: { code?: string; message?: string } | null = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = null
    }
    throw new ApiError(
      payload?.code ?? `HTTP_${res.status}`,
      payload?.message ?? (text || res.statusText),
      undefined,
      res.status,
    )
  }

  const blob = await res.blob()
  const disposition = res.headers.get("Content-Disposition") ?? ""
  const match = /filename="?([^";]+)"?/i.exec(disposition)
  const filename = match?.[1] ?? `State Bank-Statement-${input.periodStart}_to_${input.periodEnd}.pdf`
  return { blob, filename }
}

/**
 * Resolve a presigned URL (relative or absolute) into a full URL the
 * browser can fetch. The filesystem storage driver returns
 * `/storage/<key>` — a relative path that resolves to whatever origin
 * served the page. Combine with the API origin so a click works in dev,
 * tunnels, and prod alike.
 */
export function resolveStorageUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  // Prefer the DIRECT (cross-origin) backend URL for binary downloads.
  // Vercel's serverless rewrite has a 10s timeout + 4.5MB response cap
  // on Hobby — PDFs blow past one or both. Direct hits Railway with no
  // proxy hop. Backend CORS must list the deployed Vercel origins.
  const BASE = directBase()
  // BASE like "/api/v1" — strip path to get origin-only prefix, since
  // /storage is mounted at the root of the API host, not under /api/v1.
  try {
    const u = new URL(BASE, typeof window !== "undefined" ? window.location.origin : "http://localhost")
    return `${u.origin}${url}`
  } catch {
    return url
  }
}

/**
 * Trigger a browser download for a presigned URL. Used by the
 * Statements / Tax forms list rows — fetch the URL the API returned,
 * grab the blob, and click an `<a download>` so the file lands in the
 * Downloads folder with the right name instead of opening inline.
 */
export async function downloadFromUrl(url: string, suggestedName: string): Promise<void> {
  const full = resolveStorageUrl(url)
  // NO `credentials: "include"` — storage files are served by static
  // middleware with `Access-Control-Allow-Origin: *`, and browsers
  // REJECT responses that combine `*` with credentialed requests
  // (even when the server returns 200). The fetch errors with
  // "TypeError: Failed to fetch" despite the 200 OK on the wire.
  // Storage URLs are unguessable hashes — no cookies needed.
  const res = await fetch(full, {
    headers: { "ngrok-skip-browser-warning": "true" },
  })
  if (!res.ok) throw new ApiError(`HTTP_${res.status}`, res.statusText, undefined, res.status)
  const blob = await res.blob()
  triggerBlobDownload(blob, suggestedName)
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
