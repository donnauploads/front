"use client"

import { useState } from "react"
import { FileText, ImageIcon } from "lucide-react"
import type { KycDocument } from "@/lib/store"
import { cn } from "@/lib/utils"

/**
 * Tabbed viewer for ID + bill documents. No real files exist in the demo,
 * so we render a styled placeholder that matches the document subtype.
 */
export function KycDocViewer({ documents }: { documents: KycDocument[] }) {
  const [activeId, setActiveId] = useState<string | null>(
    documents[0]?.id ?? null,
  )
  const active = documents.find((d) => d.id === activeId) ?? null

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex border-b border-slate-200 bg-slate-50 text-sm">
        {documents.map((d) => {
          const on = d.id === activeId
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setActiveId(d.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 font-medium transition",
                on
                  ? "border-b-2 border-slate-900 text-slate-900"
                  : "border-b-2 border-transparent text-slate-500 hover:text-slate-700",
              )}
            >
              {d.type === "id" ? "ID" : "Proof of address"}
              <span className="text-[11px] text-slate-400">· {d.subtype}</span>
            </button>
          )
        })}
      </div>

      <div className="p-4">
        {active ? (
          <DocPlaceholder doc={active} />
        ) : (
          <div className="py-12 text-center text-sm text-slate-500">
            No documents on file.
          </div>
        )}
      </div>
    </div>
  )
}

function DocPlaceholder({ doc }: { doc: KycDocument }) {
  const Icon = doc.previewKind === "image" ? ImageIcon : FileText
  return (
    <div className="space-y-3">
      <div
        className="flex aspect-[16/10] w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500"
        aria-hidden
      >
        <div className="flex flex-col items-center gap-2">
          <Icon className="h-10 w-10" />
          <span className="text-xs font-mono">{doc.fileName}</span>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-medium text-slate-700">{doc.subtype}</span>
        <span className="font-mono">
          {doc.previewKind.toUpperCase()} · preview
        </span>
      </div>
    </div>
  )
}
