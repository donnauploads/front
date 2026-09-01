"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Camera, RotateCcw, X } from "lucide-react"

/**
 * Live-camera modal. Uses `navigator.mediaDevices.getUserMedia` to open
 * the device camera, renders the stream into a <video>, and on Snap
 * draws the current frame into a canvas to produce a JPEG Blob.
 *
 * Resilient fallback: if getUserMedia is missing (older browsers) or
 * rejected (permission denied / no hardware), the modal surfaces a
 * "Choose file instead" button that delegates to a <input type="file">
 * — same UX a file picker would have given.
 */
export function CameraCaptureModal({
  open,
  facingMode = "environment",
  onCapture,
  onClose,
}: {
  open: boolean
  /** "environment" = rear camera (default), "user" = front. */
  facingMode?: "environment" | "user"
  onCapture: (blob: Blob) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileFallbackRef = useRef<HTMLInputElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  // Start the stream when the modal opens, stop it when it closes.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError(null)
    setStarting(true)

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError("Camera isn't available on this device.")
      setStarting(false)
      return
    }

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        setStream(s)
        if (videoRef.current) {
          videoRef.current.srcObject = s
          void videoRef.current.play().catch(() => {})
        }
      })
      .catch((err: DOMException) => {
        if (cancelled) return
        const msg =
          err.name === "NotAllowedError"
            ? "Camera access was denied. Allow it in your browser settings or pick a file instead."
            : err.name === "NotFoundError"
            ? "No camera found on this device."
            : "Couldn't start the camera."
        setError(msg)
      })
      .finally(() => {
        if (!cancelled) setStarting(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, facingMode])

  // Stop tracks whenever the stream ref changes or the modal closes.
  useEffect(() => {
    if (!open && stream) {
      stream.getTracks().forEach((t) => t.stop())
      setStream(null)
    }
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Lock body scroll + preserve scroll position while open so the page
  // behind doesn't drift if the user swipes inside the modal.
  useEffect(() => {
    if (!open || typeof document === "undefined") return
    const body = document.body
    const prevOverflow = body.style.overflow
    const prevPosition = body.style.position
    const prevTop = body.style.top
    const prevWidth = body.style.width
    const scrollY = window.scrollY
    body.style.overflow = "hidden"
    body.style.position = "fixed"
    body.style.top = `-${scrollY}px`
    body.style.width = "100%"
    return () => {
      body.style.overflow = prevOverflow
      body.style.position = prevPosition
      body.style.top = prevTop
      body.style.width = prevWidth
      window.scrollTo(0, scrollY)
    }
  }, [open])

  function snap() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement("canvas")
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob)
      },
      "image/jpeg",
      0.92,
    )
  }

  function handleFileFallback(file: File | null) {
    if (!file) return
    onCapture(file)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Camera"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black/90 p-4"
          style={{ touchAction: "none" }}
        >
          <input
            ref={fileFallbackRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) =>
              handleFileFallback(e.target.files?.[0] ?? null)
            }
          />

          <button
            type="button"
            aria-label="Close camera"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>

          <div className="flex w-full max-w-md flex-col items-center">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-black ring-1 ring-white/10">
              {error ? (
                <div className="absolute inset-0 grid place-items-center px-6 text-center">
                  <div className="space-y-3">
                    <p className="text-sm text-white">{error}</p>
                    <button
                      type="button"
                      onClick={() => fileFallbackRef.current?.click()}
                      className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-white/90"
                    >
                      Choose file instead
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                  {starting && (
                    <div className="absolute inset-0 grid place-items-center text-xs text-white/80">
                      Starting camera…
                    </div>
                  )}
                  {/* Guide rectangle so the user knows where to align the
                      check. Same vibe as the check capture frame. */}
                  <div className="cam-guide pointer-events-none absolute inset-6 rounded-2xl" />
                </>
              )}
            </div>

            <div className="mt-6 flex w-full items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => fileFallbackRef.current?.click()}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white/15 text-sm font-bold transition hover:bg-white/25"
                style={{ color: "#ffffff" }}
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                File…
              </button>
              <button
                type="button"
                onClick={snap}
                disabled={!stream || !!error}
                aria-label="Take photo"
                className="flex h-16 w-16 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-40"
                style={{
                  background: "#ffffff",
                  border: "4px solid #C9A24A",
                  boxShadow: "0 0 0 3px rgba(255,255,255,.25)",
                }}
              >
                <Camera className="h-6 w-6" style={{ color: "#1C1A17" }} aria-hidden />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-12 flex-1 items-center justify-center rounded-full bg-white/15 text-sm font-bold transition hover:bg-white/25"
                style={{ color: "#ffffff" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
