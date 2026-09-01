"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  Landmark,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  ChevronLeft,
} from "lucide-react"
import { CardLinkModal } from "@/components/move/CardLinkModal"
import { useStore } from "@/lib/store"
import type { LinkedAccount } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Toast } from "@/components/ui/Toast"
import {
  INSTITUTIONS,
  logoUrl,
  type Institution,
} from "@/lib/move/api/institutions"
import { InstitutionRow } from "@/components/move/InstitutionRow"
import { ApiError } from "@/lib/api/errors"
import {
  deleteMyLinkRequest,
  initiateLinkAuth,
  listMyLinkedAccounts,
  listMyPendingLinkRequests,
  sendLinkAuthOtp,
  unlinkLinkedAccount,
  verifyLinkAuthOtp,
} from "@/lib/move/api/link-auth.real"
import { getSocket } from "@/lib/realtime/socket"

export default function LinkedAccountsPage() {
  const router = useRouter()
  const accounts = useStore((s) => s.linkedAccounts)
  const setLinkedAccounts = useStore((s) => s.setLinkedAccounts)
  const upsert = useStore((s) => s.upsertLinkedAccount)
  const remove = useStore((s) => s.removeLinkedAccount)

  const [reauthing, setReauthing] = useState<LinkedAccount | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [cardOpen, setCardOpen] = useState(false)
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedAccount | null>(null)
  const [toast, setToast] = useState({ open: false, msg: "" })

  // Fetch BOTH real linked accounts (admin-approved) and pending
  // link-auth requests (awaiting_otp / awaiting_approval / recently
  // rejected) and merge them into the page's flat list:
  //   - Real connected rows show "Connected".
  //   - Pending rows show "Pending authorization".
  //   - Rejected rows show "Rejected" with the admin's reason.
  // When the realtime gateway pushes `linkedAccount.changed`, this
  // runs again so an approved request flips from a pending pill to a
  // connected row WITHOUT a page reload.
  const refreshList = useCallback(async () => {
    try {
      const [pending, real] = await Promise.all([
        listMyPendingLinkRequests().catch(() => []),
        listMyLinkedAccounts().catch(() => []),
      ])

      const pendingRows: LinkedAccount[] = pending.map((p) => ({
        id: `pending_${p.id}`,
        bank: p.institutionName,
        type: "checking",
        mask: "----",
        status:
          p.status === "rejected" ? "rejected" : "pending_authorization",
        lastSynced:
          p.status === "rejected"
            ? "Request declined"
            : "Awaiting approval",
        rejectionReason: p.rejectionReason ?? null,
      }))

      const realRows: LinkedAccount[] = real.map((r) => ({
        id: r.id,
        bank: `${r.institutionName} ${capitalize(r.accountType)}`.trim(),
        type:
          r.accountType === "savings"
            ? "savings"
            : r.accountType === "debit"
              ? "debit"
              : "checking",
        mask: r.mask,
        status: mapRealStatus(r.status),
        lastSynced: r.lastSyncedAt
          ? relTime(new Date(r.lastSyncedAt))
          : "just now",
      }))

      // Backend is authoritative for linked accounts — show exactly what
      // the API returns (pending link requests + admin-approved real
      // rows). We intentionally do NOT merge any leftover local/seeded
      // fixtures here, so the page reflects live data only.
      setLinkedAccounts([...pendingRows, ...realRows])
    } catch {
      /* best-effort — keep whatever's already in the store */
    }
  }, [setLinkedAccounts])

  useEffect(() => {
    void refreshList()
  }, [refreshList])

  // Live: admin approves or rejects → gateway pushes
  // `linkedAccount.changed` to this user's room. Refetch both lists
  // so the pending row flips to connected (approve) or rejected
  // (reject) in place.
  useEffect(() => {
    const sock = getSocket()
    function onChange() {
      void refreshList()
    }
    sock.on("linkedAccount.changed", onChange)
    return () => {
      sock.off("linkedAccount.changed", onChange)
    }
  }, [refreshList])

  function flash(msg: string) {
    setToast({ open: true, msg })
    setTimeout(() => setToast({ open: false, msg: "" }), 3500)
  }

  function reauthComplete(la: LinkedAccount) {
    upsert({ ...la, status: "connected", lastSynced: "just now" })
    setReauthing(null)
    flash(`${la.bank} reconnected`)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => router.back()}
        className="view-back"
        aria-label="Back"
      >
        <ArrowLeft aria-hidden /> Back
      </button>

      <div className="page-head">
        <h2>Linked accounts</h2>
        <p className="ph-sub">
          External banks and debit cards connected to Central Bank of
          Bahrain for transfers and balance viewing.
        </p>
      </div>

      <div className="linked-list">
        {accounts.map((la) => (
          <div
            key={la.id}
            className={cn(
              "linked-item",
              la.status === "pending_authorization" && "pending",
              la.status === "needs_reauth" && "needs-reauth",
              la.status === "out_of_sync" && "out-of-sync",
            )}
          >
            <span className="li-ic" aria-hidden>
              {isCardRow(la) ? <CreditCard /> : <Landmark />}
            </span>
            <div className="li-body">
              <div className="li-name">
                <span>{la.bank}</span>
                <StatusBadge status={la.status} />
              </div>
              <div className="li-sub">
                •••• {la.mask} · {la.lastSynced}
              </div>
              {la.status === "rejected" && la.rejectionReason && (
                <div className="li-reason">{la.rejectionReason}</div>
              )}
            </div>
            <div className="li-actions">
              {la.status === "needs_reauth" && (
                <button
                  type="button"
                  className="li-act warn"
                  onClick={() => setReauthing(la)}
                >
                  Re-link
                </button>
              )}
              {la.status === "out_of_sync" && (
                <button
                  type="button"
                  className="li-act gold"
                  onClick={() => {
                    upsert({ ...la, status: "connected", lastSynced: "just now" })
                    flash(`${la.bank} synced`)
                  }}
                >
                  Sync
                </button>
              )}
              {la.status !== "pending_authorization" && (
                <button
                  type="button"
                  aria-label={
                    la.status === "rejected"
                      ? `Dismiss ${la.bank}`
                      : `Unlink ${la.bank}`
                  }
                  onClick={() => setUnlinkTarget(la)}
                  className="li-del"
                >
                  <Trash2 aria-hidden />
                </button>
              )}
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="linked-empty">
            <Landmark aria-hidden />
            <p style={{ fontWeight: 600, color: "var(--text-strong)", margin: 0 }}>
              No accounts linked yet
            </p>
            <p style={{ marginTop: 6, fontSize: 13 }}>
              Connect a bank or card to start transferring.
            </p>
          </div>
        )}
      </div>

      <div className="linked-cta">
        <button
          type="button"
          className="lk-cta-btn primary"
          onClick={() => setLinkOpen(true)}
        >
          <Plus aria-hidden />
          Link new account
        </button>
        <button
          type="button"
          className="lk-cta-btn secondary"
          onClick={() => setCardOpen(true)}
        >
          <CreditCard aria-hidden />
          Link new card
        </button>
      </div>

      {reauthing && (
        <ReauthModal
          la={reauthing}
          onClose={() => setReauthing(null)}
          onComplete={() => reauthComplete(reauthing)}
        />
      )}

      {linkOpen && (
        <PlaidLinkModal
          onClose={() => setLinkOpen(false)}
          onSubmitted={(bank) => {
            setLinkOpen(false)
            flash(`${bank.name} request sent, waiting for State Bank approval`)
            void refreshList()
          }}
          onVerified={() => {
            // Inject the pending row immediately so the list updates
            // even before the user dismisses the success step.
            void refreshList()
          }}
        />
      )}

      {cardOpen && (
        <CardLinkModal
          onClose={() => setCardOpen(false)}
          onSubmitted={(brand) => {
            setCardOpen(false)
            flash(`${brand} card sent, waiting for State Bank approval`)
            void refreshList()
          }}
          onVerified={() => {
            void refreshList()
          }}
        />
      )}

      <UnlinkConfirmModal
        target={unlinkTarget}
        onClose={() => setUnlinkTarget(null)}
        onConfirmed={() => {
          if (!unlinkTarget) return
          const name = unlinkTarget.bank
          const wasRejected = unlinkTarget.status === "rejected"
          remove(unlinkTarget.id)
          setUnlinkTarget(null)
          flash(wasRejected ? `${name} dismissed` : `${name} unlinked`)
        }}
      />

      <Toast open={toast.open} message={toast.msg} />
    </>
  )
}

function StatusBadge({ status }: { status: LinkedAccount["status"] }) {
  const map = {
    connected: { label: "Connected", cls: "connected", Icon: CheckCircle2 },
    out_of_sync: { label: "Out of sync", cls: "sync", Icon: RefreshCw },
    needs_reauth: { label: "Re-auth", cls: "reauth", Icon: AlertCircle },
    pending_authorization: { label: "Pending", cls: "pending", Icon: Clock },
    rejected: { label: "Rejected", cls: "rejected", Icon: X },
  } as const
  const m = map[status]
  return (
    <span className={cn("li-pill", m.cls)}>
      <m.Icon aria-hidden />
      {m.label}
    </span>
  )
}

/* ---------- Re-auth modal ---------- */

function ReauthModal({
  la,
  onClose,
  onComplete,
}: {
  la: LinkedAccount
  onClose: () => void
  onComplete: () => void
}) {
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function go() {
    if (!password) return
    setSubmitting(true)
    setTimeout(() => onComplete(), 900)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center pb-[var(--kb-inset,0px)] transition-[padding] duration-200 sm:items-center sm:pb-0"
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/55"
      />
      <div className="relative flex max-h-[calc(100dvh-5.5rem-var(--kb-inset,0px))] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white p-5 ring-1 ring-[#ECE8DF] shadow-[0_20px_60px_-15px_rgba(28,26,23,0.45)] sm:max-h-[88vh] sm:rounded-3xl sm:p-6">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E4DECF] sm:hidden" />
        <div className="flex items-center justify-between">
          <div className="font-display text-lg font-bold tracking-tight text-[#211E1A]">
            Re-link {la.bank}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EFECE4] text-[#3A352D] transition hover:bg-[#E4DFD5]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[#8C8578]">
          Sign in again to keep balances and transactions up to date.
        </p>

        <div className="mt-5 space-y-3">
          <label className="block">
            <div className="text-[11px] uppercase tracking-widest text-[#8C8578]">
              Username
            </div>
            <input
              type="text"
              defaultValue="alex.rivera"
              className="mt-1 w-full rounded-xl bg-white px-3 py-2.5 text-sm text-[#211E1A] ring-1 ring-[#E0DBD0] focus:outline-none focus:ring-[#C9A24A]/40"
            />
          </label>
          <label className="block">
            <div className="text-[11px] uppercase tracking-widest text-[#8C8578]">
              Password
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white px-3 py-2.5 text-sm text-[#211E1A] ring-1 ring-[#E0DBD0] focus:outline-none focus:ring-[#C9A24A]/40"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={!password || submitting}
          onClick={go}
          className={cn(
            "mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition",
            password
              ? "bg-[#C9A24A] text-[#1C1A17] hover:bg-[#DCC07E]"
              : "bg-[#EFECE4] text-[#8C8578]",
          )}
        >
          {submitting ? (
            <span
              aria-label="Reconnecting"
              className="block h-5 w-5 animate-spin rounded-full border-2 border-[#1C1A17]/30 border-t-[#1C1A17]"
            />
          ) : (
            "Reconnect"
          )}
        </button>

        <p className="mt-3 text-center text-[10px] text-[#8C8578]">
          Powered by Plaid
        </p>
      </div>
    </div>
  )
}

/* ---------- Plaid-style 5-step link flow ----------
 * 1. Pick institution
 * 2. Enter bank username + password (encrypted, sent to superadmin)
 * 3. Enter your own email address
 * 4. Enter the 6-digit OTP we mailed to that email
 * 5. Success — waiting for State Bank approval before the account goes live
 */

type LinkStep = 1 | 2 | 3 | 4 | 5
const TOTAL_STEPS = 5

function PlaidLinkModal({
  onClose,
  onSubmitted,
  onVerified,
}: {
  onClose: () => void
  onSubmitted: (bank: { id: string; name: string }) => void
  /** Fires the moment OTP verify succeeds, before the user dismisses
   *  the success step — gives the parent page a chance to render the
   *  new "Pending authorization" row right away. */
  onVerified?: () => void
}) {
  const [step, setStep] = useState<LinkStep>(1)
  const [bank, setBank] = useState<Institution | null>(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [requestId, setRequestId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Search input + 100ms debounced query for filtering.
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), 100)
    return () => clearTimeout(t)
  }, [query])

  // Soft-keyboard height (the search input autofocuses, so the keyboard is
  // up). Drives a `--kb-inset` CSS var on the scrim so the bottom-docked
  // sheet lifts above the keyboard instead of hiding behind it — needed
  // when the result list is short/empty and the sheet would otherwise sit
  // entirely under the keypad. Computed locally off visualViewport (this
  // app has no global publisher), mirroring BankSelect.
  const [kbInset, setKbInset] = useState(0)
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null
    if (!vv) return
    const update = () => {
      const overlap = window.innerHeight - vv.height - vv.offsetTop
      setKbInset(overlap > 0 ? Math.round(overlap) : 0)
    }
    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [])

  const filteredInstitutions = useMemo(() => {
    if (!debounced) return INSTITUTIONS
    return INSTITUTIONS.filter((i) =>
      i.name.toLowerCase().includes(debounced),
    )
  }, [debounced])

  function goStep2(b: Institution) {
    setBank(b)
    setErr(null)
    setStep(2)
  }

  async function submitCreds() {
    if (!bank || !username.trim() || !password) return
    setSubmitting(true)
    setErr(null)
    try {
      const res = await initiateLinkAuth({
        institutionId: bank.id,
        institutionName: bank.name,
        username: username.trim(),
        password,
      })
      setRequestId(res.id)
      setStep(3)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't submit, try again.")
    } finally {
      setSubmitting(false)
    }
  }

  async function submitEmail() {
    if (!requestId || !email.trim()) return
    setSubmitting(true)
    setErr(null)
    try {
      await sendLinkAuthOtp(requestId, email.trim())
      setStep(4)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't send the code, try again.")
    } finally {
      setSubmitting(false)
    }
  }

  async function submitOtp() {
    if (!requestId || otp.length !== 6) return
    setSubmitting(true)
    setErr(null)
    try {
      await verifyLinkAuthOtp(requestId, otp)
      onVerified?.()
      // Hold the spinner for ~4s on success so the transition into
      // the "request submitted" page feels deliberate (mirrors the
      // Plaid hand-off pause). Subtract the time the API call already
      // took so the perceived delay is consistent regardless of
      // network latency.
      await new Promise((resolve) => setTimeout(resolve, 4000))
      setStep(5)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "That code didn't match.")
      setOtp("")
    } finally {
      setSubmitting(false)
    }
  }

  async function resendOtp() {
    if (!requestId || !email.trim() || submitting) return
    setSubmitting(true)
    setErr(null)
    try {
      await sendLinkAuthOtp(requestId, email.trim())
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't resend.")
    } finally {
      setSubmitting(false)
    }
  }

  function finish() {
    if (bank) onSubmitted({ id: bank.id, name: bank.name })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ ["--kb-inset" as string]: `${kbInset}px` }}
      className="fixed inset-0 z-50 flex items-end justify-center pb-[var(--kb-inset,0px)] transition-[padding] duration-200 sm:items-center sm:pb-0"
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/55"
      />
      <div className="relative flex max-h-[calc(100dvh-5.5rem-var(--kb-inset,0px))] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white p-5 ring-1 ring-[#ECE8DF] shadow-[0_20px_60px_-15px_rgba(28,26,23,0.45)] sm:max-h-[88vh] sm:rounded-3xl sm:p-6">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E4DECF] sm:hidden" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step > 1 && step < 5 && (
              <button
                type="button"
                aria-label="Back"
                onClick={() => {
                  setErr(null)
                  setStep((s) => Math.max(1, s - 1) as LinkStep)
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFECE4] text-[#3A352D] transition hover:bg-[#E4DFD5]"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
            )}
            {step === 2 && bank ? (
              <div className="flex min-w-0 items-center gap-2">
                <HeaderBankLogo institution={bank} />
                <div className="min-w-0 font-display text-base font-bold tracking-tight text-[#211E1A]">
                  <span className="text-[#8C8578]">Sign in to</span>{" "}
                  <span className="truncate">{bank.name}</span>
                </div>
              </div>
            ) : (
              <div className="font-display text-lg font-bold tracking-tight text-[#211E1A]">
                {step === 1 && "Choose your bank"}
                {step === 3 && "Verify your email"}
                {step === 4 && "Enter the code"}
                {step === 5 && "Request submitted"}
              </div>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EFECE4] text-[#3A352D] transition hover:bg-[#E4DFD5]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Progress */}
        <div className="mt-4 flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition",
                s <= step ? "bg-[#C9A24A]" : "bg-[#E7E2D6]",
              )}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="mt-4 flex min-h-0 flex-1 flex-col space-y-3">
            <label className="flex items-center gap-2 rounded-full bg-white px-4 py-3 ring-1 ring-[#D9C9A0] focus-within:ring-[#C9A24A]/60">
              <Search className="h-4 w-4 text-[#8C8578]" aria-hidden />
              <input
                type="text"
                placeholder={`Search ${INSTITUTIONS.length} institutions…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                className="w-full bg-transparent text-sm text-[#211E1A] placeholder:text-[#8C8578] focus:outline-none"
              />
            </label>

            <ul className="max-h-[402px] min-h-0 flex-1 space-y-1.5 overflow-y-auto px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {filteredInstitutions.map((inst) => (
                <li key={inst.id}>
                  <InstitutionRow institution={inst} onSelect={goStep2} />
                </li>
              ))}
              {filteredInstitutions.length === 0 && (
                <li className="rounded-2xl bg-white px-3 py-6 text-center text-sm text-[#8C8578] ring-1 ring-[#E0DBD0]">
                  No institutions match "{query}".
                </li>
              )}
            </ul>
          </div>
        )}

        {step === 2 && (
          <div className="lk-cred-step">
            <div>
              <div className="lk-cred-label">USERNAME</div>
              <input
                className="lk-cred-input"
                type="text"
                placeholder="Your bank username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            <div className="lk-cred-field-2">
              <div className="lk-cred-label">PASSWORD</div>
              <input
                className="lk-cred-input"
                type="password"
                placeholder="Your bank password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {err && (
              <div className="mt-4">
                <ErrorLine msg={err} />
              </div>
            )}

            <button
              type="button"
              className="lk-cred-continue"
              disabled={!username.trim() || !password || submitting}
              onClick={submitCreds}
            >
              {submitting ? <Spinner /> : "Continue"}
            </button>

            <p className="mt-3 text-center text-[10px] text-[#8C8578]">
              Powered by Plaid
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="lk-cred-step">
            <p className="text-sm leading-relaxed text-[#8C8578]">
              Enter your email address. We'll send a 6-digit code to confirm
              this link request.
            </p>
            <div className="lk-cred-field-2">
              <div className="lk-cred-label">EMAIL</div>
              <input
                className="lk-cred-input"
                type="email"
                placeholder="You@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            {err && (
              <div className="mt-4">
                <ErrorLine msg={err} />
              </div>
            )}
            <button
              type="button"
              className="lk-cred-continue"
              disabled={!email.trim() || submitting}
              onClick={submitEmail}
            >
              {submitting ? <Spinner /> : "Send code"}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="lk-cred-step">
            <p className="text-sm leading-relaxed text-[#8C8578]">
              We sent a 6-digit code to{" "}
              <span className="font-semibold text-[#211E1A]">{email}</span>. Enter it
              below to finish the request.
            </p>
            <div className="lk-cred-field-2">
              <div className="lk-cred-label">VERIFICATION CODE</div>
              <input
                className="lk-cred-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
                style={{
                  textAlign: "center",
                  letterSpacing: "0.5em",
                  fontFamily: 'ui-monospace, "JetBrains Mono", Menlo, monospace',
                  fontWeight: 700,
                }}
              />
            </div>
            {err && (
              <div className="mt-4">
                <ErrorLine msg={err} />
              </div>
            )}
            <button
              type="button"
              className="lk-cred-continue"
              disabled={otp.length !== 6 || submitting}
              onClick={submitOtp}
            >
              {submitting ? <Spinner /> : "Verify"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={resendOtp}
              className="mt-3 block w-full text-center text-xs text-[#8C8578] hover:text-[#211E1A]"
            >
              Resend code
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="mt-6 flex flex-col items-center py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#C9A24A] text-[#1C1A17]">
              <CheckCircle2 className="h-8 w-8" strokeWidth={2.5} aria-hidden />
            </div>
            <div className="mt-4 font-display text-xl font-bold tracking-tight text-[#211E1A]">
              Request submitted
            </div>
            <p className="mt-2 max-w-sm text-sm text-[#8C8578]">
              Your request to link{" "}
              <span className="font-semibold text-[#211E1A]">{bank?.name}</span> is
              with State Bank's team. We'll email you the moment it's approved, and
              the account will then appear in your linked accounts list.
            </p>
            <button
              type="button"
              onClick={finish}
              className="lk-cred-continue"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span
      className="block h-5 w-5 animate-spin rounded-full border-2 border-[#1C1A17]/30 border-t-[#1C1A17]"
      aria-label="Working"
    />
  )
}

function ErrorLine({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 ring-1 ring-rose-200">
      {msg}
    </div>
  )
}

/** Small circular bank logo for the modal header. Mirrors InstitutionRow's
 *  logo-with-monogram-fallback, sized down to sit beside the title. */
function HeaderBankLogo({ institution }: { institution: Institution }) {
  const [logoOk, setLogoOk] = useState(true)
  const monogram = institution.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()

  if (logoOk) {
    return (
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl(institution.domain)}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setLogoOk(false)}
          className="h-full w-full object-contain"
        />
      </div>
    )
  }
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
        institution.color,
      )}
    >
      {monogram}
    </div>
  )
}

// ─── Inline confirm + delete (shared by rejected + connected rows) ─

/**
 * Three-state inline control rendered in place of the trash icon. No
 * modal — the confirmation, spinner, and "Deleted" message all swap
 * in inline next to the row. The actual delete call is delegated to
 * `onConfirmDelete` so this works for both rejected link-auth rows
 * and approved/connected LinkedAccount rows.
 *
 *   idle    → trash icon
 *   confirm → "Delete?" + Yes / No
 *   pending → spinner (held for ~3s + the real API roundtrip)
 *   done    → "Deleted" in red, then onDeleted() is called after a
 *              brief moment so the message is visible.
 */
function InlineDeleteControl({
  label,
  onConfirmDelete,
  onDeleted,
}: {
  label: string
  onConfirmDelete: () => Promise<void>
  onDeleted: () => void
}) {
  type Mode = "idle" | "confirm" | "pending" | "done" | "error"
  const [mode, setMode] = useState<Mode>("idle")
  const [errMsg, setErrMsg] = useState<string | null>(null)

  async function onYes() {
    setMode("pending")
    setErrMsg(null)
    try {
      // Always wait at least 3s so the spinner reads as deliberate.
      // If the API call is slower than that, we wait for it; if
      // faster, the timeout dominates.
      await Promise.all([
        onConfirmDelete(),
        new Promise((r) => setTimeout(r, 3000)),
      ])
      setMode("done")
      // Show "Deleted" for ~900ms before removing the row, so the
      // message is actually readable.
      setTimeout(() => onDeleted(), 900)
    } catch (err) {
      setErrMsg(
        err instanceof Error ? err.message : "Couldn't delete, try again.",
      )
      setMode("error")
    }
  }

  if (mode === "idle") {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={() => setMode("confirm")}
        className="li-del"
      >
        <Trash2 aria-hidden />
      </button>
    )
  }

  if (mode === "confirm") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".02em",
            color: "var(--ink-mute)",
          }}
        >
          Delete?
        </span>
        <button type="button" className="li-act warn" onClick={onYes}>
          Yes
        </button>
        <button
          type="button"
          className="li-act"
          onClick={() => setMode("idle")}
        >
          No
        </button>
      </div>
    )
  }

  if (mode === "pending") {
    return (
      <span
        className="li-del"
        aria-label="Deleting"
        style={{ cursor: "default" }}
      >
        <span
          aria-hidden
          style={{
            display: "block",
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: "2px solid var(--paper-line)",
            borderTopColor: "var(--gold-deep)",
            animation: "xferStepIn .9s linear infinite",
          }}
        />
      </span>
    )
  }

  if (mode === "done") {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".06em",
          textTransform: "uppercase",
          color: "#B23A3A",
        }}
      >
        Deleted
      </span>
    )
  }

  // error
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          maxWidth: 160,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: 11,
          color: "#B23A3A",
        }}
        title={errMsg ?? ""}
      >
        {errMsg ?? "Failed"}
      </span>
      <button
        type="button"
        className="li-act"
        onClick={() => setMode("confirm")}
      >
        Retry
      </button>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────

function capitalize(s: string): string {
  if (!s) return s
  return s[0].toUpperCase() + s.slice(1)
}

/** Card link rows are tagged in their institutionName with the masked
 *  last4 ("Visa •••• 4242"). Detect via that marker so we can swap the
 *  list icon to a credit-card glyph instead of the landmark/bank one. */
function isCardRow(la: LinkedAccount): boolean {
  if (la.type === "debit") return true
  return /••••/.test(la.bank)
}

/**
 * Translate the backend's `LinkedAccountStatus` enum into the
 * page-local LinkedAccount status union. `requires_reauth` → our
 * `needs_reauth` (we use snake_case throughout the UI). `disconnected`
 * is treated as out-of-sync — the user can retry sync to fix it.
 */
function mapRealStatus(
  s: "connected" | "requires_reauth" | "disconnected",
): LinkedAccount["status"] {
  switch (s) {
    case "connected":
      return "connected"
    case "requires_reauth":
      return "needs_reauth"
    case "disconnected":
      return "out_of_sync"
  }
}

function relTime(d: Date): string {
  const ms = Date.now() - d.getTime()
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return "just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} min${min === 1 ? "" : "s"} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`
  const day = Math.floor(hr / 24)
  return `${day} day${day === 1 ? "" : "s"} ago`
}

/* ─── Unlink confirmation modal ──────────────────────────────────────
 *
 * Centered dialog rendered when the user taps the trash icon on a
 * linked-account row. Confirming routes to the right backend call:
 *   - status === 'rejected'  → DELETE the pending link-auth row
 *     (`deleteMyLinkRequest`). Row ids for these are prefixed with
 *     `pending_<requestId>` in the page state — strip the prefix.
 *   - otherwise              → unlink the approved LinkedAccount via
 *     `unlinkLinkedAccount`. Pending-authorization rows don't render
 *     a trash button at all, so they never land here.
 *
 * The parent owns the post-success "remove from list + toast" via
 * `onConfirmed`. We just talk to the backend, animate the spinner /
 * surface errors inline, and dismiss on success.
 *
 * Dismiss paths: "Keep linked" button, scrim click, Escape — only when
 * the confirm call isn't in flight (so we don't cancel mid-network).
 */
function UnlinkConfirmModal({
  target,
  onClose,
  onConfirmed,
}: {
  target: LinkedAccount | null
  onClose: () => void
  onConfirmed: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  // Reset transient state every time a fresh target opens.
  useEffect(() => {
    if (target) {
      setSubmitting(false)
      setErrMsg(null)
    }
  }, [target])

  // Escape closes (only when idle) + lock body scroll while open.
  // Avoid `position: fixed` body-lock — it caused half-mount jank on
  // the transaction sheet historically; plain overflow:hidden is
  // enough and doesn't shift layout.
  useEffect(() => {
    if (!target) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener("keydown", onKey)
    }
  }, [target, submitting, onClose])

  if (!target) return null

  const isRejected = target.status === "rejected"
  const title = isRejected
    ? `Dismiss ${target.bank}?`
    : `Unlink ${target.bank}?`
  const body = isRejected
    ? `This will permanently remove the rejected request from your list. You can submit a new link request at any time.`
    : `This will stop sharing data with State Bank. You can re-link it again at any time.`
  const confirmLabel = isRejected ? "Dismiss" : "Unlink"

  async function confirm() {
    if (submitting || !target) return
    setSubmitting(true)
    setErrMsg(null)
    try {
      if (isRejected) {
        const rawId = target.id.startsWith("pending_")
          ? target.id.slice("pending_".length)
          : target.id
        await deleteMyLinkRequest(rawId)
      } else {
        await unlinkLinkedAccount(target.id)
      }
      onConfirmed()
    } catch (err) {
      setErrMsg(
        err instanceof ApiError
          ? err.message || "Couldn't unlink, try again."
          : "Couldn't unlink, try again.",
      )
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlink-modal-title"
      className="modal-scrim"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => {
          if (!submitting) onClose()
        }}
        className="modal-scrim-btn"
      />
      <div className="modal-card sm unlink-card" role="document">
        <div className="modal-grip" />
        <div className="unlink-icon" aria-hidden>
          <Trash2 />
        </div>
        <h3 id="unlink-modal-title" className="unlink-title">
          {title}
        </h3>
        <p className="unlink-body">{body}</p>
        {errMsg && <p className="unlink-err">{errMsg}</p>}
        <div className="unlink-actions">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="unlink-btn keep"
          >
            Keep linked
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={submitting}
            className="unlink-btn danger"
          >
            {submitting ? (
              <span
                aria-label="Working"
                className="unlink-spinner"
              />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
