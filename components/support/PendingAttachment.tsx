"use client"

import { FileText, X } from "lucide-react"

/**
 * The composer's "staged file" strip: shows the picked-but-not-yet-sent
 * attachment (image thumbnail or a doc chip) with a remove button. Purely
 * presentational — the parent owns the File and the object-URL lifecycle.
 */
export function PendingAttachment({
  file,
  preview,
  onRemove,
  disabled,
}: {
  file: File
  /** Object URL for image previews; null for documents. */
  preview: string | null
  onRemove: () => void
  disabled?: boolean
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        margin: "0 12px 8px",
        padding: 8,
        borderRadius: 12,
        border: "1px solid var(--line, rgba(0,0,0,0.14))",
        background: "var(--surface-2, rgba(0,0,0,0.04))",
      }}
    >
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt={file.name}
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      ) : (
        <span
          aria-hidden
          style={{
            display: "grid",
            placeItems: "center",
            width: 44,
            height: 44,
            borderRadius: 8,
            background: "rgba(0,0,0,0.06)",
            flexShrink: 0,
          }}
        >
          <FileText width={20} height={20} />
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: "var(--text-strong, inherit)",
          }}
        >
          {file.name}
        </div>
        <div
          style={{ fontSize: 11.5, color: "var(--ink-mute, rgba(0,0,0,0.5))" }}
        >
          {formatBytes(file.size)} · ready to send
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Remove attachment"
        style={{
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          width: 28,
          height: 28,
          borderRadius: 8,
          border: 0,
          background: "rgba(0,0,0,0.06)",
          color: "inherit",
          cursor: disabled ? "default" : "pointer",
        }}
      >
        <X width={15} height={15} aria-hidden />
      </button>
    </div>
  )
}

function formatBytes(n: number): string {
  if (!n) return "0 B"
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
