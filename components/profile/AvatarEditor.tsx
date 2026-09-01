"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, Trash2, X } from "lucide-react"
import {
  ACCEPTED_AVATAR_TYPES,
  MAX_AVATAR_BYTES,
  removeAvatar,
  uploadAvatar,
} from "@/lib/profile/api/avatar"

/** Visible circular crop area inside the viewport square. */
const CIRCLE_PX = 280
/** Exported PNG resolution. */
const EXPORT_PX = 512

/* ─── Design tokens (per the new "Adjust your photo" spec) ───── */
const T = {
  modalBg: "#FFFFFF",
  backdrop: "rgba(40,38,34,0.55)",
  ink: "#23211C",
  muted: "#6B6760",
  gold: "#C7A350",
  goldPress: "#B8923F",
  border: "#E0DBD0",
  track: "#E8E4DA",
  thumb: "#3A372F",
} as const

const FONT_SANS =
  'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'

export function AvatarEditor({
  open,
  currentAvatarUrl,
  initialFile,
  onClose,
  onSaved,
  onRemoved,
}: {
  open: boolean
  currentAvatarUrl: string | null
  /** Pre-loaded file — when provided, the editor skips the picker
   *  subview and lands straight in the crop view. Used when the
   *  caller already showed the OS file dialog itself (e.g. the
   *  "Change" pill on the personal-info page). */
  initialFile?: File | null
  onClose: () => void
  onSaved: (dataUrl: string) => void
  onRemoved: () => void
}) {
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) return
    const t = setTimeout(() => {
      setPickedFile(null)
      if (imgUrl) URL.revokeObjectURL(imgUrl)
      setImgUrl(null)
      setError(null)
    }, 250)
    return () => clearTimeout(t)
  }, [open, imgUrl])

  // Pre-load the initialFile (if any) every time the editor opens
  // with one. Validates against the same accept/size rules as the
  // in-modal picker so a hostile caller can't bypass them.
  useEffect(() => {
    if (!open || !initialFile) return
    if (
      !ACCEPTED_AVATAR_TYPES.includes(
        initialFile.type as (typeof ACCEPTED_AVATAR_TYPES)[number],
      )
    ) {
      setError("Use a PNG, JPEG, or WebP image.")
      return
    }
    if (initialFile.size > MAX_AVATAR_BYTES) {
      setError("That image is too large, keep it under 5 MB.")
      return
    }
    setError(null)
    setPickedFile(initialFile)
    setImgUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(initialFile)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialFile])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  function pick() {
    fileInputRef.current?.click()
  }

  function handleFiles(file: File | null | undefined) {
    if (!file) return
    if (
      !ACCEPTED_AVATAR_TYPES.includes(
        file.type as (typeof ACCEPTED_AVATAR_TYPES)[number],
      )
    ) {
      setError("Use a PNG, JPEG, or WebP image.")
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("That image is too large, keep it under 5 MB.")
      return
    }
    setError(null)
    setPickedFile(file)
    if (imgUrl) URL.revokeObjectURL(imgUrl)
    const url = URL.createObjectURL(file)
    setImgUrl(url)
  }

  async function save(dataUrl: string, blob: Blob) {
    if (!pickedFile || saving) return
    setSaving(true)
    setError(null)
    try {
      const result = await uploadAvatar(blob)
      if (!result.ok) {
        if (result.code === "TOO_LARGE")
          setError("That image is too large, keep it under 5 MB.")
        else if (result.code === "BAD_TYPE")
          setError("Use a PNG, JPEG, or WebP image.")
        else setError("Couldn't upload right now. Try again in a moment.")
        return
      }
      // For now, the spec also asks us to console.log the dataURL.
      // eslint-disable-next-line no-console
      console.log("[AvatarEditor] cropped data URL:", dataUrl.slice(0, 60) + "…")
      onSaved(result.avatarUrl)
      onClose()
    } catch {
      setError("Couldn't upload right now. Try again in a moment.")
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (removing) return
    setRemoving(true)
    setError(null)
    try {
      await removeAvatar()
      onRemoved()
      onClose()
    } catch {
      setError("Couldn't remove your photo. Try again in a moment.")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Adjust your photo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: T.backdrop,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            fontFamily: FONT_SANS,
          }}
        >
          <button
            aria-label="Close"
            onClick={onClose}
            style={{
              position: "absolute",
              inset: 0,
              background: "transparent",
              border: 0,
              padding: 0,
              cursor: "default",
            }}
          />
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 420,
              maxHeight: "calc(100vh - 24px)",
              overflowY: "auto",
              background: T.modalBg,
              borderRadius: 22,
              padding: 24,
              boxShadow: "0 24px 60px -20px rgba(28,26,23,.32)",
              color: T.ink,
            }}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 30,
                height: 30,
                borderRadius: 999,
                border: 0,
                background: "transparent",
                color: T.muted,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X width={18} height={18} aria-hidden />
            </button>

            {!imgUrl ? (
              <PickerView
                hasCurrent={Boolean(currentAvatarUrl)}
                onPick={pick}
                onDropFile={(f) => handleFiles(f)}
                onRemove={remove}
                removing={removing}
                error={error}
              />
            ) : (
              <CropView
                imgUrl={imgUrl}
                error={error}
                saving={saving}
                onCancel={onClose}
                onChangePhoto={pick}
                onSave={save}
              />
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_AVATAR_TYPES.join(",")}
              style={{ display: "none" }}
              onChange={(e) => handleFiles(e.target.files?.[0] ?? null)}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Picker subview (file select) ───────────────────────────── */

function PickerView({
  hasCurrent,
  onPick,
  onDropFile,
  onRemove,
  removing,
  error,
}: {
  hasCurrent: boolean
  onPick: () => void
  onDropFile: (file: File) => void
  onRemove: () => void
  removing: boolean
  error: string | null
}) {
  const [hover, setHover] = useState(false)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            fontWeight: 700,
            color: T.ink,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Change profile photo
        </h2>
        <p
          style={{
            marginTop: 8,
            fontSize: 16,
            color: T.muted,
          }}
        >
          PNG, JPEG, or WebP, up to 5 MB.
        </p>
      </div>
      <button
        type="button"
        onClick={onPick}
        onDragOver={(e) => {
          e.preventDefault()
          setHover(true)
        }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => {
          e.preventDefault()
          setHover(false)
          const f = e.dataTransfer.files?.[0]
          if (f) onDropFile(f)
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "18px 20px",
          borderRadius: 16,
          background: hover ? "#F8F5EE" : "#FBF9F3",
          border: `1.5px ${hover ? "solid" : "dashed"} ${T.border}`,
          cursor: "pointer",
          textAlign: "left",
          fontFamily: FONT_SANS,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 46,
            height: 46,
            borderRadius: 999,
            background: "rgba(199,163,80,.18)",
            color: T.gold,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Camera width={20} height={20} />
        </span>
        <span>
          <span
            style={{ display: "block", fontSize: 16, fontWeight: 600, color: T.ink }}
          >
            Tap to upload or drag a photo
          </span>
          <span style={{ display: "block", fontSize: 13, color: T.muted, marginTop: 2 }}>
            PNG, JPEG, or WebP, up to 5 MB
          </span>
        </span>
      </button>

      {error && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: "8px 12px",
            borderRadius: 10,
            background: "rgba(178,58,58,.08)",
            color: "#B23A3A",
            fontSize: 13,
          }}
        >
          {error}
        </p>
      )}

      {hasCurrent && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            height: 52,
            borderRadius: 12,
            background: "rgba(178,58,58,.08)",
            color: "#B23A3A",
            border: 0,
            cursor: removing ? "default" : "pointer",
            fontFamily: FONT_SANS,
            fontSize: 15,
            fontWeight: 600,
            opacity: removing ? 0.6 : 1,
          }}
        >
          <Trash2 width={16} height={16} aria-hidden />
          {removing ? "Removing…" : "Remove photo"}
        </button>
      )}
    </div>
  )
}

/* ─── Crop subview ──────────────────────────────────────────── */

type CropState = {
  /** Natural pixel dims of the loaded image. */
  natW: number
  natH: number
  /** Cover-scale: the minimum scale at which the image fully covers the circle. */
  baseScale: number
  scale: number
  offsetX: number
  offsetY: number
}

function CropView({
  imgUrl,
  error,
  saving,
  onCancel,
  onChangePhoto,
  onSave,
}: {
  imgUrl: string
  error: string | null
  saving: boolean
  onCancel: () => void
  onChangePhoto: () => void
  onSave: (dataUrl: string, blob: Blob) => void | Promise<void>
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [crop, setCrop] = useState<CropState | null>(null)
  // Refs mirror state so wheel/pointer handlers (which fire faster than
  // React renders) always read the LATEST scale + offset.
  const cropRef = useRef<CropState | null>(null)
  useEffect(() => {
    cropRef.current = crop
  }, [crop])
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  )

  function onImgLoad() {
    const img = imgRef.current
    if (!img) return
    const natW = img.naturalWidth
    const natH = img.naturalHeight
    const baseScale = Math.max(CIRCLE_PX / natW, CIRCLE_PX / natH)
    setCrop({ natW, natH, baseScale, scale: baseScale, offsetX: 0, offsetY: 0 })
  }

  /** Clamp helper — keeps the scaled image fully covering the circle. */
  function clamped(next: CropState): CropState {
    const half = CIRCLE_PX / 2
    const sw = (next.natW * next.scale) / 2
    const sh = (next.natH * next.scale) / 2
    // When sw < half (shouldn't happen because scale >= baseScale), the
    // clamp range inverts — pin to 0 instead of breaking it.
    const xMin = Math.min(half - sw, 0)
    const xMax = Math.max(sw - half, 0)
    const yMin = Math.min(half - sh, 0)
    const yMax = Math.max(sh - half, 0)
    return {
      ...next,
      offsetX: Math.max(xMin, Math.min(xMax, next.offsetX)),
      offsetY: Math.max(yMin, Math.min(yMax, next.offsetY)),
    }
  }

  // ── Drag ─────────────────────────────────────────────────────
  function onPointerDown(e: React.PointerEvent) {
    if (!crop) return
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      ox: crop.offsetX,
      oy: crop.offsetY,
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    const start = dragRef.current
    const c = cropRef.current
    if (!start || !c) return
    const next = clamped({
      ...c,
      offsetX: start.ox + (e.clientX - start.x),
      offsetY: start.oy + (e.clientY - start.y),
    })
    setCrop(next)
  }
  function onPointerUp(e: React.PointerEvent) {
    dragRef.current = null
    try {
      ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

  // ── Scroll zoom (anchored toward pointer) ────────────────────
  function onWheel(e: React.WheelEvent) {
    const c = cropRef.current
    const viewport = viewportRef.current
    if (!c || !viewport) return
    e.preventDefault()
    const rect = viewport.getBoundingClientRect()
    const px = e.clientX - rect.left - rect.width / 2
    const py = e.clientY - rect.top - rect.height / 2
    const min = c.baseScale
    const max = c.baseScale * 3
    const next = Math.max(min, Math.min(max, c.scale * (1 - e.deltaY * 0.0015)))
    if (next === c.scale) return
    const ratio = next / c.scale
    const offsetX = px - (px - c.offsetX) * ratio
    const offsetY = py - (py - c.offsetY) * ratio
    setCrop(clamped({ ...c, scale: next, offsetX, offsetY }))
  }

  // ── Slider zoom (center-anchored) ────────────────────────────
  function onSlider(nextScale: number) {
    const c = cropRef.current
    if (!c) return
    const min = c.baseScale
    const max = c.baseScale * 3
    const s = Math.max(min, Math.min(max, nextScale))
    if (s === c.scale) return
    const ratio = s / c.scale
    setCrop(
      clamped({
        ...c,
        scale: s,
        // Treat (0,0) as the anchor — image scales around its own center.
        offsetX: c.offsetX * ratio,
        offsetY: c.offsetY * ratio,
      }),
    )
  }

  // ── Save ─────────────────────────────────────────────────────
  async function doSave() {
    const c = cropRef.current
    const img = imgRef.current
    if (!c || !img) return
    try {
      const { dataUrl, blob } = await renderToCanvas({
        img,
        crop: c,
        circle: CIRCLE_PX,
        out: EXPORT_PX,
      })
      await onSave(dataUrl, blob)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[AvatarEditor] save failed:", e)
    }
  }

  // ── Native wheel listener (React's onWheel is passive in some
  //     browsers — bind non-passive so preventDefault works). ───
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      const c = cropRef.current
      if (!c) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const px = e.clientX - rect.left - rect.width / 2
      const py = e.clientY - rect.top - rect.height / 2
      const min = c.baseScale
      const max = c.baseScale * 3
      const next = Math.max(
        min,
        Math.min(max, c.scale * (1 - e.deltaY * 0.0015)),
      )
      if (next === c.scale) return
      const ratio = next / c.scale
      const offsetX = px - (px - c.offsetX) * ratio
      const offsetY = py - (py - c.offsetY) * ratio
      setCrop(clamped({ ...c, scale: next, offsetX, offsetY }))
    }
    el.addEventListener("wheel", handler, { passive: false })
    return () => el.removeEventListener("wheel", handler)
  }, [])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            fontFamily: FONT_SANS,
            fontSize: 20,
            fontWeight: 700,
            color: T.ink,
            margin: 0,
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
          }}
        >
          Adjust your photo
        </h2>
        <p
          style={{
            marginTop: 4,
            marginBottom: 0,
            fontSize: 13,
            color: T.muted,
            maxWidth: 320,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.4,
          }}
        >
          Drag to reposition · scroll or use the slider to zoom.
        </p>
      </div>

      {/* Viewport — square container with a circular mask. */}
      <div
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel /* keep React handler as a fallback */}
        style={{
          width: CIRCLE_PX,
          height: CIRCLE_PX,
          margin: "0 auto",
          borderRadius: "50%",
          overflow: "hidden",
          background: "#F4EFE3",
          touchAction: "none",
          cursor: crop ? "grab" : "default",
          position: "relative",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={imgUrl}
          alt=""
          draggable={false}
          crossOrigin="anonymous"
          onLoad={onImgLoad}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            // Center the natural image, then translate by offsets, then
            // scale from its own center. CSS transforms apply
            // right-to-left, so translate happens BEFORE scale in matrix
            // order — but offsets are still in screen-space because the
            // translate's units are the outer coord system (the parent).
            transform: crop
              ? `translate(-50%, -50%) translate(${crop.offsetX}px, ${crop.offsetY}px) scale(${crop.scale})`
              : "translate(-50%, -50%)",
            transformOrigin: "center center",
            // Width/height left intrinsic — we scale via transform.
            maxWidth: "none",
            maxHeight: "none",
            pointerEvents: "none",
            userSelect: "none",
            willChange: "transform",
          }}
        />
      </div>

      {/* Slider */}
      <div>
        <input
          type="range"
          aria-label="Zoom"
          min={crop?.baseScale ?? 1}
          max={(crop?.baseScale ?? 1) * 3}
          step={0.0001}
          value={crop?.scale ?? 1}
          onChange={(e) => onSlider(parseFloat(e.target.value))}
          style={{
            width: "100%",
            accentColor: T.thumb,
            cursor: crop ? "pointer" : "default",
          }}
        />
      </div>

      {error && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: "8px 12px",
            borderRadius: 10,
            background: "rgba(178,58,58,.08)",
            color: "#B23A3A",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            height: 46,
            borderRadius: 11,
            background: "#FFFFFF",
            color: T.ink,
            border: `1px solid ${T.border}`,
            fontFamily: FONT_SANS,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void doSave()}
          disabled={!crop || saving}
          style={{
            height: 46,
            borderRadius: 11,
            background: saving ? T.goldPress : T.gold,
            color: T.ink,
            border: 0,
            fontFamily: FONT_SANS,
            fontSize: 14,
            fontWeight: 700,
            cursor: !crop || saving ? "default" : "pointer",
            opacity: !crop || saving ? 0.7 : 1,
          }}
          onMouseDown={(e) => {
            if (crop && !saving) e.currentTarget.style.background = T.goldPress
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.background = T.gold
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = saving ? T.goldPress : T.gold
          }}
        >
          {saving ? "Saving…" : "Save photo"}
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          type="button"
          onClick={onChangePhoto}
          style={{
            background: "transparent",
            border: 0,
            color: T.muted,
            fontFamily: FONT_SANS,
            fontSize: 13,
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: 3,
            padding: 0,
          }}
        >
          Change photo
        </button>
      </div>
    </div>
  )
}

/* ─── Canvas export ─────────────────────────────────────────── */

/**
 * Reproduce the preview transform on an offscreen canvas, clip to a
 * circle, and emit a PNG. The CSS transform on the <img> was:
 *
 *   translate(-50%, -50%) translate(offsetX, offsetY) scale(scale)
 *
 * In source-image coordinates, the visible circle (centered on the
 * viewport) maps back to this rect:
 *
 *   center_x_src = natW/2 - offsetX / scale
 *   center_y_src = natH/2 - offsetY / scale
 *   size_src     = CIRCLE_PX / scale
 *
 * We crop a square of that size around (center_x_src, center_y_src)
 * and draw it into an EXPORT_PX × EXPORT_PX canvas under a circular
 * clip. The output PNG matches the preview pixel-for-pixel (modulo
 * the upscale ratio).
 */
async function renderToCanvas({
  img,
  crop,
  circle,
  out,
}: {
  img: HTMLImageElement
  crop: CropState
  circle: number
  out: number
}): Promise<{ dataUrl: string; blob: Blob }> {
  const cx = crop.natW / 2 - crop.offsetX / crop.scale
  const cy = crop.natH / 2 - crop.offsetY / crop.scale
  const srcSize = circle / crop.scale

  const canvas = document.createElement("canvas")
  canvas.width = out
  canvas.height = out
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("CANVAS_UNAVAILABLE")
  // Circular clip — the exported PNG has soft alpha edges at the circle.
  ctx.beginPath()
  ctx.arc(out / 2, out / 2, out / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(
    img,
    cx - srcSize / 2,
    cy - srcSize / 2,
    srcSize,
    srcSize,
    0,
    0,
    out,
    out,
  )

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png"),
  )
  if (!blob) throw new Error("ENCODE_FAILED")
  const dataUrl = canvas.toDataURL("image/png")
  return { dataUrl, blob }
}
