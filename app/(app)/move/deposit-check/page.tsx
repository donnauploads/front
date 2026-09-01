"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  ImagePlus,
  Loader2,
  RotateCcw,
} from "lucide-react"
import { formatNumericInput, unformatNumericInput } from "@/lib/utils"
import { convertToBase, formatMoney } from "@/lib/currency"
import { ApiError } from "@/lib/api/errors"
import { submitCheckDeposit } from "@/lib/check-deposits/api/check-deposits.real"
import { AuthorizeTransfer } from "@/components/security/AuthorizeTransfer"
import { TransfersBlockedModal } from "@/components/security/TransfersBlockedModal"
import { CameraCaptureModal } from "@/components/camera/CameraCaptureModal"
import { useStore } from "@/lib/store"

type Step = "amount" | "front" | "back" | "review" | "sending" | "success"

export default function DepositCheckPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("amount")
  const [amount, setAmount] = useState("")
  const [front, setFront] = useState<CapturedImage | null>(null)
  const [back, setBack] = useState<CapturedImage | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{ id: string } | null>(null)
  const [pinOpen, setPinOpen] = useState(false)
  const transfersLocked = useStore((s) => s.transfersLocked)
  const currency = useStore((s) => s.displayCurrency)
  const [blockedOpen, setBlockedOpen] = useState(false)

  const stepIndex = ["amount", "front", "back", "review", "sending", "success"].indexOf(step)
  // The user types in their DISPLAY currency; `amountNum` is therefore in
  // display units. `amountBase` is the USD-ledger value the backend stores.
  const amountNum = parseFloat(unformatNumericInput(amount) || "0")
  const amountBase = amountNum > 0 ? convertToBase(amountNum, currency) : 0

  function onSubmitClick() {
    if (!front || !back || amountNum <= 0 || submitting) return
    if (transfersLocked) {
      setBlockedOpen(true)
      return
    }
    setError(null)
    setPinOpen(true)
  }

  async function runUpload() {
    if (!front || !back || amountNum <= 0) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await submitCheckDeposit({
        amountDollars: amountBase,
        // The exact figure the user entered, in their display currency, so the
        // admin-decision emails show what they actually selected.
        displayAmountCents: Math.round(amountNum * 100),
        displayCurrency: currency,
        front: front.blob,
        back: back.blob,
      })
      setConfirmation({ id: result.id })
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Couldn't submit your deposit."
      setError(msg)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  const formattedAmount = amountNum.toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <>
      <button
        type="button"
        onClick={() => (step === "amount" ? router.back() : setStep(prev(step)))}
        className="view-back"
        aria-label="Back"
      >
        <ArrowLeft aria-hidden /> Back
      </button>

      <div className="page-head">
        <h2>Deposit a check</h2>
      </div>

      {/* Step progress — 4 equal pill segments, active in muted gold,
          inactive in pale warm gray (matches the new design spec). */}
      <div
        style={{
          marginTop: 16,
          display: "flex",
          gap: 8,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 6,
              flex: 1,
              borderRadius: 999,
              background: i <= stepIndex ? "#C0A053" : "#DCD6C9",
              transition: "background .2s ease",
            }}
          />
        ))}
      </div>

      {step === "amount" && (
        <div
          style={{
            marginTop: 28,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Eyebrow label */}
          <label
            htmlFor="dep-amount"
            style={{
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "#6E6E6E",
            }}
          >
            Amount on the check
          </label>

          {/* Hero amount card — display-currency prefix + big amount input */}
          <div
            style={{
              borderRadius: 14,
              background: "#F7F5F0",
              border: "1px solid #E2DCCF",
              padding: "12px 16px",
              display: "flex",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#7A756B",
                lineHeight: 1,
              }}
            >
              {currency}
            </span>
            <input
              id="dep-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(formatNumericInput(e.target.value))}
              placeholder="0"
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 36,
                fontWeight: 800,
                color: "#2A2722",
                lineHeight: 1,
                fontFamily: "inherit",
                border: 0,
                background: "transparent",
                outline: "none",
                padding: 0,
                width: "100%",
              }}
            />
          </div>

          <div
            style={{
              fontSize: 13.5,
              color: "#8A857B",
              fontWeight: 400,
            }}
          >
            Maximum {formatMoney(500000, currency)} per mobile deposit.
          </div>

          {/* Continue button */}
          <button
            type="button"
            disabled={!(amountNum > 0)}
            onClick={() => setStep("front")}
            style={{
              marginTop: 6,
              width: "100%",
              height: 60,
              borderRadius: 14,
              background: "#C0A053",
              color: "#2A2722",
              fontSize: 18,
              fontWeight: 700,
              border: 0,
              cursor: amountNum > 0 ? "pointer" : "not-allowed",
              opacity: amountNum > 0 ? 1 : 0.5,
              transition: "background .15s ease, opacity .15s ease",
            }}
            onMouseDown={(e) => {
              if (amountNum > 0) e.currentTarget.style.background = "#B2914A"
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.background = "#C0A053"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#C0A053"
            }}
          >
            Continue
          </button>
        </div>
      )}

      {(step === "front" || step === "back") && (
        <CaptureStep
          side={step}
          image={step === "front" ? front : back}
          onCapture={(img) => {
            if (step === "front") {
              if (front?.previewUrl) URL.revokeObjectURL(front.previewUrl)
              setFront(img)
            } else {
              if (back?.previewUrl) URL.revokeObjectURL(back.previewUrl)
              setBack(img)
            }
          }}
          onRetake={() => {
            if (step === "front") {
              if (front?.previewUrl) URL.revokeObjectURL(front.previewUrl)
              setFront(null)
            } else {
              if (back?.previewUrl) URL.revokeObjectURL(back.previewUrl)
              setBack(null)
            }
          }}
          onNext={() => setStep(step === "front" ? "back" : "review")}
        />
      )}

      {step === "sending" && (
        <div
          style={{
            marginTop: 48,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <span
            aria-label="Sending check for review"
            className="animate-spin"
            style={{
              display: "block",
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "3px solid var(--gold-soft)",
              borderTopColor: "var(--gold-deep)",
            }}
          />
          <div
            style={{
              marginTop: 20,
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-strong)",
            }}
          >
            Sending for review…
          </div>
          <p
            style={{
              marginTop: 4,
              maxWidth: 320,
              fontSize: 14,
              color: "var(--ink-mute)",
            }}
          >
            Uploading both sides of the check and queuing it for our team.
          </p>
        </div>
      )}

      {step === "review" && (
        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <Thumb label="Front" image={front} />
            <Thumb label="Back" image={back} />
          </div>
          <div className="panel">
            <div className="panel-body">
              <Line k="Amount" v={formattedAmount} />
              <Line k="Deposit to" v="Your checking account" />
              <Line k="Status after submit" v="Pending admin review" />
              <Line k="Availability" v="Typically within 1 business day" />
            </div>
          </div>
          {error && (
            <div className="card-error" role="alert">
              {error}
            </div>
          )}
          <button
            type="button"
            disabled={submitting || !front || !back}
            onClick={onSubmitClick}
            className="lk-cta-btn primary"
            style={{
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? "wait" : "pointer",
            }}
          >
            {submitting && (
              <Loader2 className="animate-spin" width={16} height={16} aria-hidden />
            )}
            {submitting ? "Sending for review…" : "Submit for review"}
          </button>
        </div>
      )}

      {step === "success" && (
        <div
          style={{
            marginTop: 40,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "var(--gold-deep)",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Check width={32} height={32} strokeWidth={3} aria-hidden />
          </div>
          <div
            style={{
              marginTop: 16,
              fontSize: 24,
              fontWeight: 700,
              color: "var(--text-strong)",
            }}
          >
            {formattedAmount} sent for review
          </div>
          <div
            style={{
              marginTop: 8,
              maxWidth: 380,
              fontSize: 14,
              color: "var(--ink-mute)",
              lineHeight: 1.5,
            }}
          >
            Our team is reviewing your check. You'll see the funds in your
            checking account once it's approved, usually within 1 business
            day.
          </div>
          <button
            type="button"
            onClick={() => router.push("/move")}
            className="lk-cta-btn primary"
            style={{ marginTop: 24, maxWidth: 380 }}
          >
            Done
          </button>
        </div>
      )}

      <AuthorizeTransfer
        open={pinOpen}
        amountLabel={formattedAmount}
        processingLabel="Submitting…"
        processingSubLabel="Sending your check for review"
        successLabel="Submitted"
        successSubLabel="We'll email you when it's reviewed"
        onCancel={() => {
          setPinOpen(false)
          if (confirmation) setStep("success")
        }}
        onAuthorized={runUpload}
      />
      <TransfersBlockedModal
        open={blockedOpen}
        onClose={() => setBlockedOpen(false)}
      />
    </>
  )
}

function prev(s: Step): Step {
  const order: Step[] = ["amount", "front", "back", "review", "success"]
  return order[Math.max(0, order.indexOf(s) - 1)]!
}

// ─── Capture step ──────────────────────────────────────────────────────────

type CapturedImage = {
  blob: Blob
  previewUrl: string
  sizeBytes: number
}

function CaptureStep({
  side,
  image,
  onCapture,
  onRetake,
  onNext,
}: {
  side: "front" | "back"
  image: CapturedImage | null
  onCapture: (img: CapturedImage) => void
  onRetake: () => void
  onNext: () => void
}) {
  const galleryRef = useRef<HTMLInputElement>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFile(file: File | null) {
    setError(null)
    if (!file) return
    if (!/^image\/(jpe?g|png|webp)$/i.test(file.type)) {
      setError("Please choose a JPEG, PNG, or WebP image.")
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("That image is over 8 MB. Try a smaller capture.")
      return
    }
    onCapture({
      blob: file,
      previewUrl: URL.createObjectURL(file),
      sizeBytes: file.size,
    })
  }

  function onCameraBlob(blob: Blob) {
    setError(null)
    if (blob.size > 8 * 1024 * 1024) {
      setError("That image is over 8 MB. Try a smaller capture.")
      return
    }
    onCapture({
      blob,
      previewUrl: URL.createObjectURL(blob),
      sizeBytes: blob.size,
    })
    setCameraOpen(false)
  }

  return (
    <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 14, color: "var(--ink-mute)", lineHeight: 1.5 }}>
        {side === "front"
          ? "Snap the front of your check on a flat surface. Make sure all four corners and the amount are visible."
          : "Sign the back of your check, then snap a photo of the signed side."}
      </div>

      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
      />

      <CameraCaptureModal
        open={cameraOpen}
        onCapture={onCameraBlob}
        onClose={() => setCameraOpen(false)}
      />

      <div
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          overflow: "hidden",
          borderRadius: 16,
          background: "var(--navy)",
          border: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 16,
            borderRadius: 12,
            border: "2px dashed rgba(255,255,255,.2)",
          }}
        />
        {image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={image.previewUrl}
            alt={`${side} of check`}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>
              Tap below to open your camera or pick a photo.
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="card-error" role="alert">
          {error}
        </div>
      )}

      {!image ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="lk-cta-btn primary"
            style={{ height: 56 }}
          >
            <Camera width={18} height={18} aria-hidden />
            Take photo
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="lk-cta-btn"
            style={{ height: 56 }}
          >
            <ImagePlus width={18} height={18} aria-hidden />
            From gallery
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              onRetake()
              if (galleryRef.current) galleryRef.current.value = ""
            }}
            className="lk-cta-btn"
            style={{ flex: 1 }}
          >
            <RotateCcw width={14} height={14} aria-hidden />
            Retake
          </button>
          <button
            type="button"
            onClick={onNext}
            className="lk-cta-btn primary"
            style={{ flex: 2 }}
          >
            Next
            <ChevronRight width={14} height={14} aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}

function Thumb({
  label,
  image,
}: {
  label: string
  image: CapturedImage | null
}) {
  return (
    <div
      style={{
        overflow: "hidden",
        borderRadius: 16,
        background: "var(--surface)",
        border: "1px solid var(--line)",
      }}
    >
      <div style={{ aspectRatio: "16 / 9", background: "var(--navy)" }}>
        {image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={image.previewUrl}
            alt={`${label} preview`}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          fontSize: 12,
        }}
      >
        <div style={{ fontWeight: 700, color: "var(--text-strong)" }}>{label}</div>
        {image && (
          <div style={{ color: "var(--ink-mute)" }}>
            {(image.sizeBytes / 1024).toFixed(0)} KB
          </div>
        )}
      </div>
    </div>
  )
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        padding: "12px 4px",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          flex: "0 0 116px",
          fontSize: 12.5,
          color: "var(--ink-mute)",
          lineHeight: 1.4,
        }}
      >
        {k}
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 14,
          fontWeight: 700,
          color: "var(--text-strong)",
          lineHeight: 1.4,
        }}
      >
        {v}
      </div>
    </div>
  )
}
