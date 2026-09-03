"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileText,
  Loader2,
  X,
} from "lucide-react"
import { useToast } from "@/components/providers/ToastProvider"
import { BRAND_NAME } from "@/lib/brand"
import {
  decideKyc,
  decideKycDocument,
  getKycDetail,
  type AdminDocumentStatus,
  type AdminKycDetail,
  type AdminKycDocument,
  type AdminKycStatus,
} from "@/lib/admin/api/kyc-detail.real"
import { cn } from "@/lib/utils"

/**
 * KYC review detail. Loads everything from `/admin/kyc/users/:userId`
 * (the record + every document with a short-lived presigned URL). Each
 * document has its own approve/reject buttons; the bottom action bar
 * decides the overall KYC record.
 */
export default function KycDetailPage() {
  const router = useRouter()
  const params = useParams<{ userId: string }>()
  const userId = params?.userId ?? ""
  const { toast } = useToast()

  const [detail, setDetail] = useState<AdminKycDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [decisionOpen, setDecisionOpen] = useState<null | "reject">(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [docBusyId, setDocBusyId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    if (!userId) return
    setLoading(true)
    getKycDetail(userId)
      .then((d) => {
        setDetail(d)
        setError(null)
      })
      .catch((err: Error) => {
        if (err.message?.includes("404") || /USER_NOT_FOUND/.test(err.message ?? "")) {
          setError("This user doesn't exist anymore.")
        } else {
          setError("Couldn't load the submission.")
        }
      })
      .finally(() => setLoading(false))
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function approveOverall() {
    if (!detail?.kyc || busy) return
    setBusy(true)
    try {
      await decideKyc(detail.kyc.id, "approved")
      toast("KYC approved", { variant: "success", duration: 1800 })
      setTimeout(() => router.push("/admin/kyc"), 200)
    } catch {
      toast("Couldn't approve. Try again.", { variant: "error", duration: 2400 })
    } finally {
      setBusy(false)
    }
  }

  async function rejectOverall(text: string) {
    if (!detail?.kyc || busy) return
    setBusy(true)
    try {
      await decideKyc(detail.kyc.id, "rejected", { reason: text })
      toast("KYC rejected", { variant: "info", duration: 1800 })
      setDecisionOpen(null)
      setReason("")
      setTimeout(() => router.push("/admin/kyc"), 200)
    } catch {
      toast("Couldn't reject. Try again.", { variant: "error", duration: 2400 })
    } finally {
      setBusy(false)
    }
  }

  async function decideDoc(
    doc: AdminKycDocument,
    decision: "approved" | "rejected",
  ) {
    if (docBusyId) return
    let rejectionReason: string | undefined
    if (decision === "rejected") {
      const r = window.prompt(`Reason for rejecting "${docLabel(doc)}":`)
      if (!r?.trim()) return
      rejectionReason = r.trim()
    }
    setDocBusyId(doc.id)
    try {
      await decideKycDocument(doc.id, decision, rejectionReason)
      refresh()
    } catch {
      toast("Couldn't update the document.", {
        variant: "error",
        duration: 2400,
      })
    } finally {
      setDocBusyId(null)
    }
  }

  if (loading && !detail) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/kyc"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to queue
        </Link>
        <div className="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-white">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden />
        </div>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/kyc"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to queue
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {error ?? "Submission unavailable."}
        </div>
      </div>
    )
  }

  const { user, kyc, documents } = detail
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.email
  const isDecided = kyc?.status === "approved" || kyc?.status === "rejected"

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/kyc"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to queue
        </Link>
        {kyc ? (
          <KycStatusBadge status={kyc.status} />
        ) : (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            No record
          </span>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        {/* Left — applicant snapshot + KYC record meta */}
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-xs uppercase tracking-wider text-slate-500">
              Applicant
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {displayName}
            </div>
            <div className="text-sm text-slate-500">{user.email}</div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Kv k="Phone" v={user.phoneE164 ?? "—"} mono />
              <Kv k={`${BRAND_NAME} tag`} v={user.novaTag ?? "—"} mono />
              <Kv k="User ID" v={user.id} mono full />
              <Kv
                k="Account status"
                v={user.status}
              />
              <Kv
                k="Created"
                v={format(new Date(user.createdAt), "MMM d, yyyy")}
              />
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-xs uppercase tracking-wider text-slate-500">
              KYC record
            </div>
            {kyc ? (
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <Kv
                  k="Submitted"
                  v={`${format(new Date(kyc.submittedAt), "MMM d, yyyy · h:mm a")} (${formatDistanceToNow(new Date(kyc.submittedAt), { addSuffix: true })})`}
                  full
                />
                {kyc.reviewedAt && (
                  <Kv
                    k="Reviewed"
                    v={format(new Date(kyc.reviewedAt), "MMM d, yyyy · h:mm a")}
                    full
                  />
                )}
                {kyc.rejectionReason && (
                  <Kv k="Rejection reason" v={kyc.rejectionReason} full />
                )}
                {kyc.missingFields.length > 0 && (
                  <Kv
                    k="Missing fields"
                    v={kyc.missingFields.join(", ")}
                    full
                  />
                )}
              </dl>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                No KYC record yet — the customer hasn&apos;t completed signup.
              </p>
            )}
          </div>
        </div>

        {/* Right — documents */}
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-slate-500">
                Documents
              </div>
              <span className="text-[11px] text-slate-500">
                {documents.length} on file
              </span>
            </div>
            {documents.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">
                Customer hasn&apos;t uploaded any documents yet.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {documents.map((d) => (
                  <li key={d.id} className="py-3">
                    <DocRow
                      doc={d}
                      busy={docBusyId === d.id}
                      onDecide={(decision) => decideDoc(d, decision)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Action bar */}
      {kyc && !isDecided && (
        <div className="sticky bottom-4 z-10 flex items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <button
            type="button"
            onClick={() => setDecisionOpen("reject")}
            disabled={busy}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={approveOverall}
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Working…" : "Approve KYC"}
          </button>
        </div>
      )}

      {decisionOpen === "reject" && (
        <DecisionModal
          title="Reject submission"
          confirmLabel="Reject"
          reason={reason}
          onReason={setReason}
          onClose={() => {
            setDecisionOpen(null)
            setReason("")
          }}
          onConfirm={() => rejectOverall(reason)}
          busy={busy}
        />
      )}
    </div>
  )
}

function DocRow({
  doc,
  busy,
  onDecide,
}: {
  doc: AdminKycDocument
  busy: boolean
  onDecide: (decision: "approved" | "rejected") => void
}) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const isImage = /^image\//.test(doc.contentType)
  // Backend emits a *relative* preview URL (e.g. "/storage/user/.../id.jpg")
  // when PUBLIC_BASE isn't set — that resolves against the Next.js origin
  // and 404s. Prepend the API base so the browser hits the API server
  // where the file actually lives.
  const previewSrc = resolvePreviewUrl(doc.previewUrl)
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden />
            <span className="truncate text-sm font-medium text-slate-900">
              {docLabel(doc)}
            </span>
            <DocStatusBadge status={doc.status} />
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            Uploaded{" "}
            {formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true })}
            {" · "}
            {(doc.sizeBytes / 1024).toFixed(0)} KB
            {" · "}
            {doc.contentType}
          </div>
          {doc.rejectionReason && (
            <div className="mt-0.5 text-[11px] italic text-rose-600">
              Rejected: {doc.rejectionReason}
            </div>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {previewSrc && (
            <button
              type="button"
              onClick={() => setPreviewOpen((o) => !o)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {previewOpen ? "Hide" : "View"}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDecide("approved")}
            disabled={busy || doc.status === "approved"}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check className="h-3 w-3" aria-hidden />
            Approve
          </button>
          <button
            type="button"
            onClick={() => onDecide("rejected")}
            disabled={busy || doc.status === "rejected"}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
          >
            <X className="h-3 w-3" aria-hidden />
            Reject
          </button>
        </div>
      </div>
      {previewOpen && previewSrc && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt={docLabel(doc)}
              className="max-h-96 w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 py-6 text-center text-xs text-slate-500">
              Inline preview not supported for this file type.
              <a
                href={previewSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
              >
                <ExternalLink className="h-3 w-3" aria-hidden />
                Open file
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function KycStatusBadge({ status }: { status: AdminKycStatus }) {
  const map: Record<AdminKycStatus, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
    in_review: { label: "In review", cls: "bg-sky-100 text-sky-700" },
    approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "Rejected", cls: "bg-rose-100 text-rose-700" },
  }
  const m = map[status]
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
        m.cls,
      )}
    >
      {m.label}
    </span>
  )
}

function DocStatusBadge({ status }: { status: AdminDocumentStatus }) {
  const map: Record<AdminDocumentStatus, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
  }
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize",
        map[status],
      )}
    >
      {status}
    </span>
  )
}

function docLabel(doc: AdminKycDocument): string {
  const map: Record<string, string> = {
    id_front: "ID — front",
    id_back: "ID — back",
    selfie: "Selfie",
    utility_bill: "Proof of address",
  }
  const base = map[doc.type] ?? doc.type
  return doc.subtype ? `${base} (${doc.subtype})` : base
}

function Kv({
  k,
  v,
  mono,
  full,
}: {
  k: string
  v: string
  mono?: boolean
  full?: boolean
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-[11px] uppercase tracking-wider text-slate-500">
        {k}
      </dt>
      <dd
        className={cn(
          "mt-0.5 text-sm text-slate-900",
          mono && "font-mono text-xs",
        )}
      >
        {v}
      </dd>
    </div>
  )
}

function DecisionModal({
  title,
  confirmLabel,
  reason,
  onReason,
  onClose,
  onConfirm,
  busy,
}: {
  title: string
  confirmLabel: string
  reason: string
  onReason: (v: string) => void
  onClose: () => void
  onConfirm: () => void
  busy: boolean
}) {
  const valid = reason.trim().length >= 5
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl sm:p-6">
        <div className="font-semibold text-slate-900">{title}</div>
        <p className="mt-1 text-xs text-slate-500">
          Give the applicant a short reason. They&apos;ll see it in their
          KYC history.
        </p>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => onReason(e.target.value)}
          placeholder="Reason…"
          className="mt-3 w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!valid || busy}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Absolutise a backend `previewUrl`. The filesystem storage driver emits
 * relative `/storage/<key>` paths in dev (PUBLIC_BASE unset), which need
 * to be served by the API origin, not the Next.js origin. Absolute URLs
 * (S3 presigned, prod CDN) pass through unchanged.
 */
function resolvePreviewUrl(url: string | null): string | null {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  const base = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/+$/, "")
  if (!base) return url
  // Strip a leading "/api/v1" off the API base if present — `/storage`
  // isn't under the versioned API prefix, it's mounted at the server root.
  const origin = base.replace(/\/api\/v\d+\/?$/, "")
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`
}
