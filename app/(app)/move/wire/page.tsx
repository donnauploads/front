"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Globe,
  Landmark,
  Loader2,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { cn, formatNumericInput, unformatNumericInput } from "@/lib/utils"
import { formatMoney } from "@/lib/currency"
import { AuthorizeTransfer } from "@/components/security/AuthorizeTransfer"
import {
  TransfersBlockedModal,
  isTransfersBlockedError,
} from "@/components/security/TransfersBlockedModal"
import {
  initiateTransfer,
  quoteTransfer,
  verifyBeneficiary,
  type QuoteResult,
} from "@/lib/transfers/api/transfers.real"
import { listAccounts } from "@/lib/accounts/api/accounts"
import {
  BankSelect,
  findInstitutionByName,
} from "@/components/move/BankSelect"
import { bankCodesFor } from "@/lib/move/bank-codes"
import {
  SUPPORTED_CURRENCIES,
  CURRENCY_META,
  fmtMinor,
  toMinor,
  type CurrencyCode,
} from "@/lib/money/currencies"

type WireMode = "domestic" | "international"

/** Bahrain IBAN: "BH" + 2 check digits + 4-letter bank code + 14
 *  alphanumeric = 22 chars. Domestic (local) wires are keyed by this. */
const BH_IBAN_RE = /^BH\d{2}[A-Z]{4}[0-9A-Z]{14}$/
const normalizeIban = (v: string) =>
  v.trim().toUpperCase().replace(/\s+/g, "")

/**
 * Wire transfer flow. Two tabs:
 *  - Domestic:   Bahrain IBAN, beneficiary at a local (BH) bank.
 *  - International: SWIFT/BIC + IBAN, country, beneficiary address.
 *
 * Both hit `POST /transfers` with `kind: "wire_out"` after PIN/biometric
 * elevation. Beneficiary details are packed into `externalRef` so the
 * admin review queue can see them. EVERY wire is held for admin approval
 * regardless of amount (backend transfers.service), so it lands in the
 * review queue rather than settling automatically.
 */
export default function WireTransferPage() {
  const router = useRouter()
  const accounts = useStore((s) => s.accounts)
  const transfersLocked = useStore((s) => s.transfersLocked)
  const currency = useStore((s) => s.displayCurrency)
  const setAccounts = useStore((s) => s.setAccounts)
  const [mode, setMode] = useState<WireMode>("domestic")

  // Source account — default to the first checking we find. Skip
  // any stale mock-id entries (e.g. "acct_spending") so the form
  // never picks a non-UUID id that the backend would reject.
  const [fromAccountId, setFromAccountId] = useState<string>("")
  useEffect(() => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const realAccounts = accounts.filter((a) => uuid.test(a.id))
    const currentValid =
      fromAccountId && realAccounts.some((a) => a.id === fromAccountId)
    if (!currentValid && realAccounts.length) {
      const checking =
        realAccounts.find((a) => a.type === "checking") ?? realAccounts[0]
      if (checking) setFromAccountId(checking.id)
    }
  }, [accounts, fromAccountId])
  useEffect(() => {
    // Make sure we have fresh balances for the dropdown.
    listAccounts()
      .then((a) => setAccounts(a))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Form
  const [amount, setAmount] = useState("")
  const [beneficiaryName, setBeneficiaryName] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [routingOrSwift, setRoutingOrSwift] = useState("")
  const [iban, setIban] = useState("")
  const [country, setCountry] = useState("")
  const [beneficiaryAddress, setBeneficiaryAddress] = useState("")
  const [note, setNote] = useState("")
  // International wires can be denominated in the beneficiary's currency.
  // Domestic is always BHD. The account/ledger settles in USD; the backend
  // FX service converts the send amount → USD.
  const [intlCurrency, setIntlCurrency] = useState<CurrencyCode>("USD")
  const sendCurrency: CurrencyCode = mode === "domestic" ? "BHD" : intlCurrency

  // Resolve the picked bank → look up its known routing/SWIFT codes
  // (US/UK majors; partial). Drives the auto-fill effects below and
  // the inline mismatch warnings the form surfaces beside the
  // routing/SWIFT field.
  const pickedInstitution = useMemo(
    () => findInstitutionByName(bankName),
    [bankName],
  )
  const pickedCodes = useMemo(
    () => (pickedInstitution ? bankCodesFor(pickedInstitution.id) : null),
    [pickedInstitution],
  )

  // International auto-fill: when the user picks a bank we know the
  // country for, prefill the Country field only. The SWIFT/BIC is left
  // blank so the customer always enters it manually. Doesn't clobber a
  // country the user already typed.
  useEffect(() => {
    if (mode !== "international" || !pickedInstitution) return
    if (!country.trim() && pickedInstitution.country) {
      setCountry(pickedInstitution.country)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedInstitution, mode])

  // Domestic auto-fill: prefill the ABA routing number if we know it
  // for the picked bank. Same "don't clobber typed input" rule.
  useEffect(() => {
    if (mode !== "domestic" || !pickedCodes?.routingNumber) return
    if (!routingOrSwift.trim()) setRoutingOrSwift(pickedCodes.routingNumber)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedCodes, mode])

  // Inline mismatch — only fires when (a) the user has typed enough,
  // (b) we have an expected value for the picked bank. Not a hard
  // block (the backend verifyBeneficiary is the source of truth), but
  // catches typos before they hit the wire.
  const bankCodeMismatch: string | null = useMemo(() => {
    // First — country vs mode. ABA routing numbers only exist for US
    // banks; SWIFT for international. Even when we don't have routing
    // codes on file for the picked bank, the country mismatch alone
    // should disqualify ("ABN AMRO" — NL — picked under Domestic).
    if (pickedInstitution) {
      if (mode === "domestic" && pickedInstitution.country !== "BH") {
        return `${pickedInstitution.name} is a ${pickedInstitution.country} bank, switch to International for SWIFT/IBAN.`
      }
      if (mode === "international" && pickedInstitution.country === "BH") {
        return `${pickedInstitution.name} is a Bahrain bank, switch to Domestic for the IBAN.`
      }
    }
    // Beyond the country/mode check above, we no longer require the SWIFT/BIC
    // to match a hard-coded per-bank code — the customer types any valid SWIFT
    // manually. Format is validated separately, and the live beneficiary check
    // (against the approved-beneficiary list) confirms the real account on
    // submit. Domestic wires are validated by IBAN format + that same check.
    return null
  }, [mode, pickedInstitution])

  // Quote — the amount the customer types is in `sendCurrency`; convert it
  // to that currency's minor units for the backend.
  const sendAmountMinor = useMemo(() => {
    const m = toMinor(unformatNumericInput(amount), sendCurrency)
    return m == null || m <= 0n ? null : m.toString()
  }, [amount, sendCurrency])

  const [quote, setQuote] = useState<QuoteResult | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  useEffect(() => {
    if (!sendAmountMinor || !fromAccountId) {
      setQuote(null)
      return
    }
    let cancelled = false
    setQuoteLoading(true)
    quoteTransfer({
      kind: "wire_out",
      // Backend derives the USD settlement from sendCurrency+sendAmountMinor;
      // amountCents is unused for FX wires.
      amountCents: "0",
      sendCurrency,
      sendAmountMinor,
      instant: false,
      fromAccountId,
      // Drives the per-mode flat fee on the backend: $3.50 domestic vs
      // $4.60 international. Re-quotes when the user flips tabs.
      wireScope: mode === "domestic" ? "domestic" : "international",
    })
      .then((q) => {
        if (!cancelled) setQuote(q)
      })
      .catch(() => {
        if (!cancelled) setQuote(null)
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sendAmountMinor, sendCurrency, fromAccountId, mode])

  // USD settlement amount (what actually debits the USD account). Comes
  // from the backend quote; for a USD send it equals the typed amount.
  const settleCents = useMemo(() => {
    if (quote?.settleCents) return quote.settleCents
    if (sendCurrency === "USD") return sendAmountMinor
    return null
  }, [quote?.settleCents, sendCurrency, sendAmountMinor])

  // ── Live beneficiary verification ────────────────────────────────────
  // As the customer types the routing + account (or SWIFT + IBAN), we
  // check the numbers against the approved-beneficiary list at the named
  // bank. The number boxes show a spinner → check (valid) / × (invalid).
  const [acctCheck, setAcctCheck] = useState<CheckState>("idle")

  // When a bank-code/country mismatch is detected, force the verified-
  // input adornment into the "invalid" state so the green tick can't
  // contradict the red warning text beneath the field.
  const effectiveCheck: CheckState = bankCodeMismatch ? "invalid" : acctCheck

  // Has the customer entered enough to attempt a lookup? The numbers
  // must be complete AND the BANK NAME must be present — the backend
  // resolves the approved-beneficiary list per bank, so checking
  // numbers without a bank just guarantees a no-match. Beneficiary
  // name is no longer a substitute.
  const checkReady = useMemo(() => {
    if (!bankName.trim()) return false
    if (mode === "domestic") {
      return BH_IBAN_RE.test(normalizeIban(iban))
    }
    return (
      /^[A-Z]{6}[A-Z0-9]{2,5}$/.test(routingOrSwift.trim().toUpperCase()) &&
      iban.trim().length > 0
    )
  }, [mode, bankName, routingOrSwift, iban])

  useEffect(() => {
    if (!checkReady) {
      setAcctCheck("idle")
      return
    }
    // International wires accept any beneficiary the customer enters — no
    // approved-list lookup, and no "Account valid" green confirmation (there's
    // nothing to verify against). Stay neutral; the submit gate skips the
    // beneficiary check for this mode.
    if (mode === "international") {
      setAcctCheck("idle")
      return
    }
    let cancelled = false
    setAcctCheck("checking")
    // Debounce so we don't fire on every keystroke.
    const t = setTimeout(() => {
      verifyBeneficiary(
        mode === "domestic"
          ? {
              type: "local",
              bankName: bankName.trim(),
              beneficiaryName: beneficiaryName.trim(),
              iban: normalizeIban(iban),
            }
          : {
              type: "international",
              bankName: bankName.trim(),
              beneficiaryName: beneficiaryName.trim(),
              swiftBic: routingOrSwift.trim().toUpperCase(),
              iban: iban.trim().toUpperCase().replace(/\s+/g, ""),
            },
      )
        .then((r) => {
          if (cancelled) return
          setAcctCheck(r.valid ? "valid" : "invalid")
          // When the routing+account match an approved beneficiary
          // and the customer hasn't typed a name yet, auto-fill the
          // beneficiary name from the admin's record. Saves a step
          // and confirms they're paying the right person.
          if (r.valid && r.beneficiaryName && !beneficiaryName.trim()) {
            setBeneficiaryName(r.beneficiaryName)
          }
        })
        .catch(() => {
          if (!cancelled) setAcctCheck("invalid")
        })
    }, 500)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [checkReady, mode, bankName, beneficiaryName, routingOrSwift, accountNumber, iban])

  // Validation
  const fromAccount = accounts.find((a) => a.id === fromAccountId)
  // Backend rejects fromAccountId that isn't a real UUID. The store
  // can briefly hold mock ids (e.g. "acct_spending") before the
  // real-account refetch lands — gate on the UUID format so the
  // user never submits with a stale id.
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const fromAccountReady = !!fromAccountId && UUID_RE.test(fromAccountId)
  const reasons = useMemo(() => {
    const r: string[] = []
    if (!fromAccountId) r.push("Choose a source account.")
    else if (!fromAccountReady) r.push("Loading your accounts, one moment…")
    if (!beneficiaryName.trim()) r.push("Beneficiary name is required.")
    if (!bankName.trim()) r.push("Bank name is required.")
    if (mode === "domestic") {
      if (!BH_IBAN_RE.test(normalizeIban(iban))) {
        r.push("Enter a valid Bahrain IBAN (BH followed by 20 characters).")
      }
    } else {
      if (!/^[A-Z]{6}[A-Z0-9]{2,5}$/.test(routingOrSwift.trim().toUpperCase())) {
        r.push("SWIFT/BIC must be 8 or 11 characters (e.g. CHASUS33).")
      }
      if (!iban.trim()) r.push("IBAN is required.")
      if (!country.trim()) r.push("Beneficiary country is required.")
    }
    // Block submit until the live beneficiary check passes — DOMESTIC only;
    // this prevents the backend 422 (BENEFICIARY_NOT_FOUND) from firing.
    // International wires accept any beneficiary, so there's nothing to verify.
    if (mode === "domestic") {
      if (acctCheck === "checking") r.push("Verifying account details…")
      if (acctCheck === "invalid") {
        r.push("This IBAN isn't a valid beneficiary at this bank.")
      }
      if (acctCheck === "idle" && (iban || accountNumber)) {
        r.push("Confirm the account details to continue.")
      }
    }
    if (sendAmountMinor === null) r.push("Enter a valid amount.")
    // Wait for the quote so the fee (and, for cross-currency wires, the
    // converted USD settlement) is known before we balance-check or submit.
    else if (quoteLoading || !quote || !settleCents) {
      r.push(
        sendCurrency === "USD" ? "Calculating fee…" : "Getting the exchange rate…",
      )
    }
    if (quote && !quote.valid) r.push(quote.reason ?? "Quote invalid.")
    if (fromAccount && settleCents) {
      const total = BigInt(settleCents) + BigInt(quote?.feeCents ?? "0")
      if (BigInt(Math.round(fromAccount.balance * 100)) < total) {
        r.push("Amount above balance.")
      }
    }
    // Block submit on a country/mode mismatch (e.g. a non-Bahrain bank picked
    // under Domestic). SWIFT/BIC values are no longer matched to a per-bank
    // code — any valid SWIFT is accepted.
    if (bankCodeMismatch) r.push(bankCodeMismatch)
    return r
  }, [
    fromAccountId,
    fromAccountReady,
    beneficiaryName,
    bankName,
    mode,
    routingOrSwift,
    accountNumber,
    iban,
    country,
    sendAmountMinor,
    sendCurrency,
    settleCents,
    quoteLoading,
    quote,
    fromAccount,
    acctCheck,
    bankCodeMismatch,
  ])
  const canSubmit = reasons.length === 0 && !!sendAmountMinor && !!settleCents

  // Submit
  const [authOpen, setAuthOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [stage, setStage] = useState<"form" | "review" | "success">("form")
  const [error, setError] = useState<string | null>(null)
  const [blockedOpen, setBlockedOpen] = useState(false)
  const [submittedTransferId, setSubmittedTransferId] = useState<string | null>(null)

  // The headline amount is the SEND amount in the send currency.
  const amountLabel = useMemo(() => {
    if (!sendAmountMinor) return ""
    return fmtMinor(sendAmountMinor, sendCurrency)
  }, [sendAmountMinor, sendCurrency])

  // USD-settlement breakdown shown alongside the FX rate.
  const settleLabel = settleCents ? fmtMinor(settleCents, "USD") : ""
  const feeLabel = quote ? fmtMinor(quote.feeCents, "USD") : ""
  const totalLabel =
    settleCents && quote
      ? fmtMinor((BigInt(settleCents) + BigInt(quote.feeCents)).toString(), "USD")
      : ""

  // Does the USD total (converted amount + fee) exceed the source
  // account's balance? Drives the inline "amount above balance" error.
  const balanceCents = fromAccount
    ? BigInt(Math.round(fromAccount.balance * 100))
    : null
  const exceedsBalance =
    !!settleCents &&
    balanceCents != null &&
    balanceCents < BigInt(settleCents) + BigInt(quote?.feeCents ?? "0")
  const balanceLabel =
    balanceCents != null ? fmtMinor(balanceCents.toString(), "USD") : ""

  /**
   * Returns the wire promise so AuthorizeTransfer drives its own
   * "Processing… → Success" sheet (≥4s spinner + checkmark) before
   * dismissing. The page's own `stage === "success"` receipt still
   * renders after the sheet closes. Throw on failure so the sheet
   * surfaces the error inline.
   */
  async function runWire(elevationToken: string) {
    if (!settleCents || !sendAmountMinor || !fromAccountId) return
    setSubmitting(true)
    setError(null)
    try {
      const externalRef = buildExternalRef({
        mode,
        beneficiaryName,
        bankName,
        accountNumber,
        routingOrSwift: routingOrSwift.trim().toUpperCase(),
        iban,
        country,
        beneficiaryAddress,
      })
      const result = await initiateTransfer({
        fromAccountId,
        kind: "wire_out",
        // USD settlement (the backend re-derives it from send + rate).
        amountCents: settleCents,
        sendCurrency,
        sendAmountMinor,
        instant: false,
        note: note.trim() || undefined,
        externalRef,
        wireDetails:
          mode === "domestic"
            ? {
                type: "local",
                beneficiaryName,
                bankName,
                iban: normalizeIban(iban),
              }
            : {
                type: "international",
                beneficiaryName,
                bankName,
                swiftBic: routingOrSwift.trim().toUpperCase(),
                iban: iban.trim().toUpperCase().replace(/\s+/g, ""),
                country: country.trim(),
              },
        elevationToken,
      })
      setSubmittedTransferId(result.transferId)
      // Stash the beneficiary + FX details so the receipt page can render
      // them without a backend round-trip (the Transfer row doesn't persist
      // beneficiary fields as columns yet). Prefer the FX snapshot the
      // backend actually applied at submit; fall back to the quote's.
      try {
        sessionStorage.setItem(
          `wire:receipt:${result.transferId}`,
          JSON.stringify({
            mode,
            beneficiaryName,
            bankName,
            accountNumber,
            routingOrSwift: routingOrSwift.trim().toUpperCase(),
            iban,
            country,
            beneficiaryAddress,
            note: note.trim() || null,
            amountCents: settleCents,
            feeCents: result.feeCents,
            sendCurrency,
            sendAmountMinor,
            fx: result.fx ?? quote?.fx ?? null,
            initiatedAt: new Date().toISOString(),
          }),
        )
      } catch {
        // sessionStorage can throw in private-browsing modes; the
        // receipt page will fall back to backend-only data.
      }
      // NOTE: don't `setStage("success")` here — both AuthorizeTransfer
      // mounts on this page are rendered INSIDE stage-conditional JSX
      // blocks. Flipping stage now would unmount the modal mid-spinner
      // and the 4s "Processing…" animation would be cut short. Instead
      // we stash `submittedTransferId` and let the AuthorizeTransfer's
      // `onCancel` callback (fired after its full 4s + 1.4s sequence)
      // transition the page stage.
      void listAccounts()
        .then((a) => setAccounts(a))
        .catch(() => {})
    } catch (err) {
      // Translate the backend's stable error codes into friendly copy.
      const raw =
        err instanceof Error
          ? err.message
          : "Wire couldn't be submitted. Try again."
      if (isTransfersBlockedError(err)) {
        setBlockedOpen(true)
        // Reject so the PIN sheet drops back to entry (not a false
        // "success"), but with an empty message — the TransfersBlockedModal
        // shown above already explains it, so no inline red warning renders.
        throw new Error("")
      }
      const friendly =
        /BENEFICIARY_NOT_FOUND/.test(raw)
          ? "We couldn't match these wire details to an approved beneficiary. Double-check the IBAN (and SWIFT/BIC for international), or ask support to add this beneficiary."
          : /WIRE_DETAILS_(INCOMPLETE|REQUIRED)/.test(raw)
          ? "Some required wire fields are missing. Fill out every required field and try again."
          : raw
      setError(friendly)
      // Rethrow so AuthorizeTransfer's promise-mode flow shows the
      // failure inline in the PIN sheet rather than silently dismissing.
      throw new Error(friendly)
    } finally {
      setSubmitting(false)
    }
  }

  if (stage === "review") {
    const isIntl = mode === "international"
    return (
      <>
        <button
          type="button"
          onClick={() => setStage("form")}
          className="view-back"
          aria-label="Back"
        >
          <ArrowLeft aria-hidden /> Back
        </button>

        <div className="page-head">
          <h2>Review wire</h2>
          <p className="ph-sub">
            One last look before we move the money. Tap Send to confirm with
            your PIN.
          </p>
        </div>

        {/* Hero */}
        <div className="rcpt-card" style={{ marginTop: 18, textAlign: "center", padding: 20 }}>
          <div className="rc-title" style={{ marginBottom: 6 }}>Amount</div>
          <div className="goal-amt" style={{ fontSize: 40 }}>{amountLabel}</div>
          <div className="rcpt-dir" style={{ marginTop: 6 }}>
            {isIntl ? (
              <>
                <Globe aria-hidden />
                International wire · SWIFT/IBAN
              </>
            ) : (
              <>
                <Landmark aria-hidden />
                Domestic wire · IBAN
              </>
            )}
          </div>
        </div>

        {/* From / To */}
        <div className="rcpt-grid" style={{ marginTop: 12 }}>
          <ReviewCard title="Send from">
            <ReviewRow k="Account" v={fromAccount?.label ?? "Checking"} />
            {fromAccount && (
              <ReviewRow
                k="Available"
                v={formatMoney(fromAccount.balance, currency)}
                mono
              />
            )}
          </ReviewCard>
          <ReviewCard title="Send to">
            <ReviewRow k="Beneficiary" v={beneficiaryName} />
            <ReviewRow k="Bank" v={bankName} />
            {isIntl ? (
              <>
                <ReviewRow
                  k="SWIFT/BIC"
                  v={routingOrSwift.trim().toUpperCase()}
                  mono
                />
                <ReviewRow
                  k="IBAN"
                  v={iban.trim().toUpperCase().replace(/\s+/g, "")}
                  mono
                />
                {country && <ReviewRow k="Country" v={country} />}
                {beneficiaryAddress && (
                  <ReviewRow k="Address" v={beneficiaryAddress} />
                )}
              </>
            ) : (
              <ReviewRow k="IBAN" v={normalizeIban(iban)} mono />
            )}
          </ReviewCard>
        </div>

        {/* Amounts */}
        <ReviewCard title="Amounts" className="mt-3">
          <ReviewRow k="Wire amount" v={amountLabel} mono />
          {quote?.fx && (
            <>
              <ReviewRow
                k="Exchange rate"
                v={`1 ${quote.fx.sendCurrency} = ${quote.fx.rate.toFixed(4)} USD`}
              />
              <ReviewRow k="Converted (USD)" v={settleLabel} mono />
            </>
          )}
          <ReviewRow k="Wire fee" v={feeLabel} mono />
          <ReviewRow
            k="ETA"
            v={quote?.etaText ?? (isIntl ? "1–3 business days" : "Same day")}
          />
          <div style={{ marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
            <ReviewRow k="Total debited (USD)" v={totalLabel} mono emphasize />
          </div>
        </ReviewCard>

        {note.trim() && (
          <ReviewCard title="Memo / reference" className="mt-3">
            <p style={{ fontSize: 12.5, color: "var(--ink-warm)" }}>{note.trim()}</p>
          </ReviewCard>
        )}

        {/* Actions */}
        <button
          type="button"
          onClick={() => {
            if (transfersLocked) {
              setBlockedOpen(true)
              return
            }
            setAuthOpen(true)
          }}
          className="lk-cta-btn primary"
          style={{ marginTop: 20 }}
        >
          <ShieldCheck width={18} height={18} aria-hidden />
          Send
        </button>
        <button
          type="button"
          onClick={() => setStage("form")}
          className="lk-cta-btn secondary"
          style={{ marginTop: 10 }}
        >
          Edit
        </button>

        <p style={{ marginTop: 12, textAlign: "center", fontSize: 10.5, color: "var(--ink-mute)" }}>
          You&apos;ll be asked to confirm with your PIN before the wire is
          released.
        </p>

        <AuthorizeTransfer
          open={authOpen}
          amountLabel={amountLabel}
          processingLabel="Sending wire…"
          processingSubLabel={`To ${beneficiaryName || "beneficiary"}`}
          successLabel="Wire submitted"
          successSubLabel="Pending approval — we'll send it once a reviewer approves"
          onCancel={() => {
            setAuthOpen(false)
            // Fires both for user-initiated cancel AND for
            // AuthorizeTransfer's post-success auto-dismiss. The
            // `submittedTransferId` discriminates: present → success
            // path, transition stage; null → real cancel, stay on form.
            if (submittedTransferId) setStage("success")
          }}
          onAuthorized={runWire}
        />
        <TransfersBlockedModal
          open={blockedOpen}
          onClose={() => setBlockedOpen(false)}
        />
      </>
    )
  }

  if (stage === "success") {
    return (
      <div
        style={{
          maxWidth: 440,
          margin: "0 auto",
          // Fill the visible content area (viewport − topbar − content
          // padding) and centre the success card vertically on the page.
          minHeight: "calc(100dvh - 144px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div className="modal-status">
          <div className="modal-disc success">
            <Check strokeWidth={3} aria-hidden />
          </div>
          <div className="ms-title" style={{ fontSize: 22 }}>Wire submitted</div>
          <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
            {submittedTransferId && (
              <button
                type="button"
                onClick={() =>
                  router.push(`/move/wire/receipt/${submittedTransferId}`)
                }
                className="lk-cta-btn primary"
              >
                Show receipt
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push("/home")}
              className="lk-cta-btn secondary"
            >
              Back to home
            </button>
            <Link
              href="/move/wire"
              onClick={() => {
                setStage("form")
                setSubmittedTransferId(null)
                setAmount("")
                setBeneficiaryName("")
                setBankName("")
                setAccountNumber("")
                setRoutingOrSwift("")
                setIban("")
                setCountry("")
                setBeneficiaryAddress("")
                setNote("")
              }}
              style={{ textAlign: "center", fontSize: 13.5, fontWeight: 600, color: "var(--ink-mute)", padding: "8px 0" }}
            >
              Send another wire
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="wire-form" style={{ display: "contents" }}>
      <button
        type="button"
        onClick={() => router.back()}
        className="view-back"
        aria-label="Back"
      >
        <ArrowLeft aria-hidden /> Back
      </button>

      <div className="page-head">
        <h2>Wire transfer</h2>
        <p className="ph-sub">
          Send money straight to another bank account. Domestic wires settle
          same-day; international wires usually land in 1–3 business days.
        </p>
      </div>

      {/* Mode switcher */}
      <div className="card-controls wire-modes" style={{ marginTop: 18 }}>
        <ModeButton
          active={mode === "domestic"}
          onClick={() => {
            setMode("domestic")
            // Different bank universe + identifier per mode — drop the
            // prior pick + codes so nothing leaks across the switch.
            setBankName("")
            setRoutingOrSwift("")
            setAccountNumber("")
            setIban("")
          }}
          Icon={Landmark}
          label="Domestic (BH)"
          sub="Bahrain banks"
        />
        <ModeButton
          active={mode === "international"}
          onClick={() => {
            setMode("international")
            setBankName("")
            setRoutingOrSwift("")
            setAccountNumber("")
            setIban("")
          }}
          Icon={Globe}
          label="International"
          sub="SWIFT / IBAN"
        />
      </div>

      {/* From */}
      <Section title="Send from">
        <AccountPicker
          accounts={accounts}
          value={fromAccountId}
          onChange={setFromAccountId}
        />
      </Section>

      {/* Beneficiary */}
      <Section title="Beneficiary">
        <Field label="Full name">
          <input
            value={beneficiaryName}
            onChange={(e) => setBeneficiaryName(e.target.value)}
            placeholder="Enter Beneficiary's Full Name"
            className={fieldCls}
          />
        </Field>
        <Field label="Bank name">
          <BankSelect
            value={bankName}
            onChange={setBankName}
            country={mode === "domestic" ? "BH" : undefined}
            placeholder={
              mode === "domestic" ? "Choose a bank…" : "Choose an international bank…"
            }
          />
        </Field>
        {mode === "domestic" ? (
          <>
            <Field label="IBAN">
              <VerifiedInput
                value={iban}
                onChange={(e) =>
                  setIban(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 22),
                  )
                }
                placeholder="Enter the Beneficiary's IBAN"
                className="mono-num uppercase"
                check={effectiveCheck}
              />
            </Field>
            {bankCodeMismatch && (
              <p style={{ padding: "0 4px", fontSize: 11.5, color: "#B23A3A" }}>
                {bankCodeMismatch}
              </p>
            )}
            {acctCheck === "invalid" && (
              <p style={{ padding: "0 4px", fontSize: 11.5, color: "#B23A3A" }}>
                We couldn&apos;t verify this IBAN. Check the IBAN and the bank
                or beneficiary name.
              </p>
            )}
            {acctCheck === "valid" && !bankCodeMismatch && (
              <p style={{ padding: "0 4px", fontSize: 11.5, color: "#2F8A5B" }}>
                Account valid.
              </p>
            )}
          </>
        ) : (
          <>
            <Field label="SWIFT / BIC">
              <VerifiedInput
                value={routingOrSwift}
                onChange={(e) =>
                  setRoutingOrSwift(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11),
                  )
                }
                placeholder="Enter the Bank's SWIFT / BIC"
                className="mono-num uppercase"
                check={effectiveCheck}
              />
            </Field>
            <Field label="IBAN / Account number">
              <VerifiedInput
                value={iban}
                onChange={(e) =>
                  setIban(e.target.value.toUpperCase().replace(/\s+/g, ""))
                }
                placeholder="Enter the IBAN or Account Number"
                className="mono-num uppercase"
                check={effectiveCheck}
              />
            </Field>
            {bankCodeMismatch && (
              <p style={{ padding: "0 4px", fontSize: 11.5, color: "#B23A3A" }}>
                {bankCodeMismatch}
              </p>
            )}
            {acctCheck === "invalid" && (
              <p style={{ padding: "0 4px", fontSize: 11.5, color: "#B23A3A" }}>
                We couldn&apos;t verify this account. Check the SWIFT/IBAN and
                the bank or beneficiary name.
              </p>
            )}
            {acctCheck === "valid" && !bankCodeMismatch && (
              <p style={{ padding: "0 4px", fontSize: 11.5, color: "#2F8A5B" }}>
                Account valid.
              </p>
            )}
            <Field label="Beneficiary country">
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Enter the Beneficiary's Country"
                className={fieldCls}
              />
            </Field>
            <Field label="Beneficiary address (optional)">
              <textarea
                rows={2}
                value={beneficiaryAddress}
                onChange={(e) => setBeneficiaryAddress(e.target.value)}
                placeholder="Enter the Beneficiary's Address"
                className={cn(fieldCls, "resize-none")}
                // .docs-input is a fixed 46px single-line control (padding:0
                // 12px, vertically-centered). Override for a multi-line box so
                // the text/placeholder sits top-left with even padding.
                style={{ height: "auto", minHeight: 64, padding: "11px 14px", lineHeight: 1.45 }}
              />
            </Field>
          </>
        )}
      </Section>

      {/* Amount */}
      <Section title="Amount">
        <div className="amt-group" style={{ height: 46, flex: "none" }}>
          {mode === "domestic" ? (
            <span className="amt-cur" style={{ fontSize: 16 }}>BD</span>
          ) : (
            <CurrencySelect value={intlCurrency} onChange={setIntlCurrency} />
          )}
          <input
            inputMode="decimal"
            placeholder="Enter the Amount"
            value={amount}
            onChange={(e) => setAmount(formatNumericInput(e.target.value))}
            style={{ fontSize: 16 }}
          />
        </div>
        {mode === "international" && (
          <p style={{ padding: "6px 4px 0", fontSize: 11.5, color: "var(--ink-mute)" }}>
            Send in the beneficiary&apos;s currency, we convert and debit your
            account in USD at the live rate.
          </p>
        )}
        {exceedsBalance && (
          <p
            style={{
              padding: "6px 4px 0",
              fontSize: 11.5,
              fontWeight: 600,
              color: "#B23A3A",
            }}
          >
            Amount above balance, {fromAccount?.label ?? "this account"} has{" "}
            {balanceLabel} available, but this wire needs {totalLabel}.
          </p>
        )}
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Enter a Memo or Reference (optional)"
          maxLength={120}
          className="docs-input"
          style={{ cursor: "text" }}
        />

        {/* Quote */}
        <div className="modal-inset">
          {quoteLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-mute)" }}>
              <Loader2 width={14} height={14} className="animate-spin" aria-hidden />
              Calculating fee…
            </div>
          ) : quote && !quote.valid ? (
            <div
              style={{
                fontSize: 12.5,
                color: "var(--danger, #b42318)",
                fontWeight: 600,
              }}
            >
              {quote.reason ?? "This amount is outside the allowed range."}
            </div>
          ) : quote ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {quote.fx && (
                <>
                  <Row
                    k="Exchange rate"
                    v={`1 ${quote.fx.sendCurrency} = ${quote.fx.rate.toFixed(4)} USD`}
                  />
                  <Row k="Converted (USD)" v={settleLabel} />
                </>
              )}
              <Row k="Wire fee" v={feeLabel} />
              <Row k="Estimated arrival" v={quote.etaText} />
              {settleCents && (
                <Row k="Total debit (USD)" v={totalLabel} emphasize />
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: "var(--ink-mute)" }}>
              Enter an amount to see the fee and ETA.
            </div>
          )}
        </div>
      </Section>

      {error && (
        <div className="card-error" style={{ marginTop: 16, marginBottom: 0 }}>
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={!canSubmit || submitting}
        onClick={() => setStage("review")}
        className="lk-cta-btn primary"
        style={{ marginTop: 20 }}
      >
        {submitting ? (
          <>
            <Loader2 width={18} height={18} className="animate-spin" aria-hidden /> Sending…
          </>
        ) : (
          <>
            <ShieldCheck width={18} height={18} aria-hidden />
            Review &amp; send
          </>
        )}
      </button>

      {/* Tell the customer WHY the button is disabled — otherwise a valid-
          looking form (e.g. an amount that exceeds the balance after FX
          conversion) reads as a dead button. */}
      {!canSubmit && !submitting && reasons.length > 0 && (
        <p
          style={{
            marginTop: 8,
            fontSize: 12,
            lineHeight: 1.4,
            textAlign: "center",
            color: "var(--ink-mute)",
          }}
        >
          {reasons[0]}
        </p>
      )}

      <AuthorizeTransfer
        open={authOpen}
        amountLabel={amountLabel}
        processingLabel="Sending wire…"
        processingSubLabel={`To ${beneficiaryName || "beneficiary"}`}
        successLabel="Wire submitted"
        successSubLabel="Pending approval — we'll send it once a reviewer approves"
        onCancel={() => {
          setAuthOpen(false)
          if (submittedTransferId) setStage("success")
        }}
        onAuthorized={runWire}
      />
      <TransfersBlockedModal
        open={blockedOpen}
        onClose={() => setBlockedOpen(false)}
      />
    </div>
  )
}

const fieldCls = "docs-input"

type CheckState = "idle" | "checking" | "valid" | "invalid"

/**
 * Text input with a live-verification adornment on the right edge: a
 * spinner while the DB check runs, a green check when the entered numbers
 * match an approved beneficiary, or a red × when they don't. The input
 * border also tints green/red to reinforce the state.
 */
function VerifiedInput({
  check,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { check: CheckState }) {
  return (
    <div className="vinput">
      <input
        {...props}
        className={cn(
          "docs-input",
          // Tint the input border + focus-ring to match each state so
          // the field itself signals what's happening, not just the
          // adornment on the right.
          check === "checking" && "checking",
          check === "valid" && "ok",
          check === "invalid" && "bad",
          className,
        )}
        style={{ cursor: "text" }}
      />
      <span className="vadorn">
        {check === "checking" && (
          <span className="vspin" aria-label="Verifying" />
        )}
        {check === "valid" && (
          <span className="vbadge ok" aria-label="Valid">
            <Check strokeWidth={3} aria-hidden />
          </span>
        )}
        {check === "invalid" && (
          <span className="vbadge bad" aria-label="Invalid">
            <X strokeWidth={3} aria-hidden />
          </span>
        )}
      </span>
    </div>
  )
}

/**
 * Custom account picker — replaces the native <select> with a styled
 * popover so the dropdown matches the rest of the dark theme. Click
 * outside or Esc to dismiss. Renders the account label, type, and
 * current balance for each row.
 */
function AccountPicker({
  accounts,
  value,
  onChange,
}: {
  accounts: Array<{
    id: string
    type: string
    label: string
    balance: number
  }>
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const currency = useStore((s) => s.displayCurrency)
  const selected = accounts.find((a) => a.id === value) ?? accounts[0]

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn("wire-trigger", open && "open")}
      >
        <span className="wire-ic">
          <Wallet aria-hidden />
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14, fontWeight: 600, color: "var(--text-strong)" }}>
            {selected?.label ?? "Choose account"}
          </span>
          <span style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-mute)" }}>
            {selected ? `${selected.type} · available` : ""}
          </span>
        </span>
        <span style={{ display: "flex", flexShrink: 0, flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 15, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "var(--text-strong)" }}>
            {formatMoney(selected?.balance ?? 0, currency)}
          </span>
          <ChevronDown
            width={16}
            height={16}
            style={{
              color: open ? "var(--text-strong)" : "var(--ink-mute)",
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform .2s",
            }}
            aria-hidden
          />
        </span>
      </button>

      {open && (
        <ul role="listbox" className="wire-pop">
          {accounts.map((a) => {
            const active = a.id === value
            return (
              <li key={a.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(a.id)
                    setOpen(false)
                  }}
                  className={cn("wire-opt", active && "active")}
                >
                  <span className="wire-ic sm">
                    <Wallet aria-hidden />
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14, fontWeight: 600, color: "var(--text-strong)" }}>
                      {a.label}
                    </span>
                    <span style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-mute)" }}>
                      {a.type}
                    </span>
                  </span>
                  <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 14, fontVariantNumeric: "tabular-nums", color: "var(--ink-soft)" }}>
                    {formatMoney(a.balance, currency)}
                  </span>
                  {active && (
                    <Check width={16} height={16} style={{ flexShrink: 0, color: "var(--gold-deep)" }} aria-hidden />
                  )}
                </button>
              </li>
            )
          })}
          {accounts.length === 0 && (
            <li style={{ padding: "16px 12px", textAlign: "center", fontSize: 12, color: "var(--ink-mute)" }}>
              No accounts available.
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

/** Clean custom send-currency dropdown (replaces the native <select>):
 *  styled trigger + popover list capped to ~5 rows with internal scroll. */
function CurrencySelect({
  value,
  onChange,
}: {
  value: CurrencyCode
  onChange: (c: CurrencyCode) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div className="ccy-select" ref={ref}>
      <button
        type="button"
        className="ccy-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Send currency"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{value}</span>
        <ChevronDown
          width={15}
          height={15}
          className="ccy-chev"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
          aria-hidden
        />
      </button>
      {open && (
        <ul className="ccy-pop" role="listbox" aria-label="Send currency">
          {SUPPORTED_CURRENCIES.map((c) => {
            const meta = CURRENCY_META[c]
            const active = c === value
            return (
              <li key={c}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn("ccy-opt", active && "active")}
                  onClick={() => {
                    onChange(c)
                    setOpen(false)
                  }}
                >
                  <span className="ccy-opt-sym">{meta.symbol}</span>
                  <span className="ccy-opt-code">{c}</span>
                  <span className="ccy-opt-name">{meta.name}</span>
                  {active && (
                    <Check width={15} height={15} className="ccy-opt-check" aria-hidden />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section style={{ marginTop: 22 }}>
      <div className="pf-group" style={{ margin: "0 0 10px" }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {children}
      </div>
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label style={{ display: "block" }}>
      <div className="modal-label">{label}</div>
      {children}
    </label>
  )
}

function ModeButton({
  active,
  onClick,
  Icon,
  label,
  sub,
}: {
  active: boolean
  onClick: () => void
  Icon: typeof Landmark
  label: string
  sub: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("cc-btn", active && "active")}
    >
      <span className="wire-mode-ic" aria-hidden>
        <Icon />
      </span>
      <div className="cc-main">
        <div>{label}</div>
        <div className="cc-sub">{sub}</div>
      </div>
    </button>
  )
}

function Row({
  k,
  v,
  emphasize,
}: {
  k: string
  v: string
  emphasize?: boolean
}) {
  return (
    <div className="rcpt-row">
      <span className="rk">{k}</span>
      <span className={cn("rv mono", emphasize && "em")}>{v}</span>
    </div>
  )
}

function ReviewCard({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("rcpt-card", className)}>
      <div className="rc-title">{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {children}
      </div>
    </div>
  )
}

function ReviewRow({
  k,
  v,
  mono,
  emphasize,
}: {
  k: string
  v: string
  mono?: boolean
  emphasize?: boolean
}) {
  return (
    <div className="rcpt-row">
      <span className="rk">{k}</span>
      <span className={cn("rv", mono && "mono", emphasize && "em")}>{v}</span>
    </div>
  )
}

/**
 * Pack the wire details into a single `externalRef` string. The admin
 * review queue surfaces this verbatim so reviewers can see the
 * beneficiary, account, routing/SWIFT, and IBAN without a separate
 * lookup.
 */
function buildExternalRef(input: {
  mode: WireMode
  beneficiaryName: string
  bankName: string
  accountNumber?: string
  routingOrSwift: string
  iban?: string
  country?: string
  beneficiaryAddress?: string
}): string {
  const parts: string[] = [
    `kind=${input.mode}`,
    `to=${input.beneficiaryName}`,
    `bank=${input.bankName}`,
  ]
  if (input.mode === "domestic") {
    if (input.iban) parts.push(`iban=${input.iban}`)
  } else {
    parts.push(`swift=${input.routingOrSwift}`)
    if (input.iban) parts.push(`iban=${input.iban}`)
    if (input.country) parts.push(`country=${input.country}`)
    if (input.beneficiaryAddress) parts.push(`address=${input.beneficiaryAddress}`)
  }
  // class-validator caps externalRef at 120 chars; keep it well under.
  return parts.join(" | ").slice(0, 120)
}
