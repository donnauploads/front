"use client"

import { useEffect, useRef, useState } from "react"
import { Download, FileText, ImageOff, Loader2 } from "lucide-react"
import type { SupportAttachment } from "@/lib/support/api/support.real"

/**
 * Renders a chat attachment.
 *  - Images: fetched with the caller's authenticated loader (bytes never live
 *    on a public URL), shown from an object URL. Clicking opens full size.
 *  - Documents (pdf/doc/docx): NOT fetched until the user clicks — then
 *    downloaded via a transient object URL. They are never rendered inline,
 *    so the browser can't open/execute them.
 *
 * `load` returns the attachment's bytes as a Blob (authed). `messageId`
 * scopes the effect so a re-render doesn't re-fetch.
 */
export function AttachmentBubble({
  attachment,
  messageId,
  load,
  mine,
}: {
  attachment: SupportAttachment
  messageId: string
  load: () => Promise<Blob>
  mine: boolean
}) {
  const isImage = attachment.kind === "image"
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [state, setState] = useState<"idle" | "loading" | "error">(
    isImage ? "loading" : "idle",
  )
  const [downloading, setDownloading] = useState(false)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isImage) return
    let cancelled = false
    setState("loading")
    load()
      .then((blob) => {
        if (cancelled) return
        const obj = URL.createObjectURL(blob)
        urlRef.current = obj
        setImgUrl(obj)
        setState("idle")
      })
      .catch(() => {
        if (!cancelled) setState("error")
      })
    return () => {
      cancelled = true
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId, isImage])

  async function onDownload() {
    if (downloading) return
    setDownloading(true)
    try {
      const blob = await load()
      const obj = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = obj
      a.download = attachment.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      // Give the browser a beat to start the download before revoking.
      setTimeout(() => URL.revokeObjectURL(obj), 4000)
    } catch {
      /* swallow — the row stays clickable to retry */
    } finally {
      setDownloading(false)
    }
  }

  if (isImage) {
    return (
      <div
        style={{
          marginTop: 2,
          borderRadius: 12,
          overflow: "hidden",
          background: "rgba(0,0,0,0.06)",
          maxWidth: 260,
        }}
      >
        {state === "loading" && (
          <div style={PLACEHOLDER}>
            <Loader2 className="animate-spin" width={16} height={16} aria-hidden />
          </div>
        )}
        {state === "error" && (
          <div style={PLACEHOLDER}>
            <ImageOff width={16} height={16} aria-hidden />
            <span style={{ fontSize: 12 }}>Couldn&rsquo;t load image</span>
          </div>
        )}
        {imgUrl && state === "idle" && (
          <a href={imgUrl} target="_blank" rel="noreferrer noopener">
            <img
              src={imgUrl}
              alt={attachment.name}
              style={{
                display: "block",
                width: "100%",
                maxHeight: 320,
                objectFit: "cover",
              }}
            />
          </a>
        )}
      </div>
    )
  }

  // Document card — click to download.
  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={downloading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginTop: 2,
        width: "100%",
        maxWidth: 280,
        textAlign: "left",
        cursor: downloading ? "default" : "pointer",
        border: `1px solid ${mine ? "rgba(255,255,255,0.35)" : "var(--line, rgba(0,0,0,0.14))"}`,
        borderRadius: 12,
        padding: "9px 11px",
        background: mine
          ? "rgba(255,255,255,0.14)"
          : "var(--surface-2, rgba(0,0,0,0.05))",
        color: "inherit",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "grid",
          placeItems: "center",
          width: 34,
          height: 34,
          borderRadius: 8,
          background: mine ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.06)",
          flexShrink: 0,
        }}
      >
        <FileText width={18} height={18} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {attachment.name}
        </span>
        <span style={{ display: "block", fontSize: 11.5, opacity: 0.75 }}>
          {docLabel(attachment.type)} · {formatBytes(attachment.size)}
        </span>
      </span>
      <span aria-hidden style={{ flexShrink: 0, opacity: 0.85 }}>
        {downloading ? (
          <Loader2 className="animate-spin" width={16} height={16} />
        ) : (
          <Download width={16} height={16} />
        )}
      </span>
    </button>
  )
}

const PLACEHOLDER: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  height: 96,
  color: "var(--ink-mute, rgba(0,0,0,0.5))",
}

function docLabel(type: string): string {
  if (type === "application/pdf") return "PDF"
  if (type.includes("wordprocessingml")) return "Word (.docx)"
  if (type === "application/msword") return "Word (.doc)"
  return "File"
}

function formatBytes(n: number): string {
  if (!n) return "0 B"
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
