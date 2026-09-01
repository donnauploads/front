"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  describeAccountTypes,
  logoUrl,
  type Institution,
} from "@/lib/move/api/institutions"

/** Up to two letters from the institution name, uppercased. */
function monogram(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function InstitutionRow({
  institution,
  onSelect,
}: {
  institution: Institution
  onSelect: (institution: Institution) => void
}) {
  // Try a Clearbit logo first; fall back to the brand-color monogram
  // when the image 404s (Clearbit doesn't have every bank).
  const [logoOk, setLogoOk] = useState(true)

  return (
    <button
      type="button"
      onClick={() => onSelect(institution)}
      className="flex w-full items-center gap-3 rounded-[12px] border border-[#ECE8DF] bg-[#F6F4EF] px-[14px] py-2.5 text-left transition active:scale-[0.99] hover:border-[#C9A24A]/45 hover:bg-[#F0EDE5]"
    >
      {logoOk ? (
        <div className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-[#ECE8DF]">
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
      ) : (
        <div
          aria-hidden
          className={cn(
            "flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white",
            institution.color,
          )}
        >
          {monogram(institution.name)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-bold leading-[1.2] tracking-[-0.01em] text-[#211E1A]">
          {institution.name}
        </div>
        <div className="mt-0.5 text-[13px] text-[#8C8578]">
          {describeAccountTypes(institution.accountTypes)}
        </div>
      </div>
      <svg
        viewBox="0 0 16 16"
        className="h-4 w-4 flex-shrink-0 text-[#B7AF9F]"
        aria-hidden
      >
        <path
          d="M6 4l4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.75"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
