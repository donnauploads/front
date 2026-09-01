"use client"

import { cn } from "@/lib/utils"

/**
 * Selectable channel tile used on the get-started Choose-Channel step.
 * Two of these stack vertically on mobile, side-by-side on tablet+.
 */
export function ChannelCard({
  selected,
  onClick,
  icon,
  label,
  destination,
}: {
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  destination: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left transition active:scale-[0.99] sm:p-5",
        selected
          ? "border-brand-deep bg-brand-deep/5 ring-2 ring-brand-deep/15"
          : "border-ink-dark/15 hover:border-ink-dark/40",
      )}
    >
      <span
        className={cn(
          "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full transition",
          selected ? "bg-brand-deep text-white" : "bg-brand-deep/15 text-brand-deep",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-ink-dark">
          {label}
        </span>
        <span className="mt-0.5 block truncate font-mono text-sm text-ink-dark/65">
          {destination}
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition",
          selected
            ? "border-brand-deep bg-brand-deep"
            : "border-ink-dark/25 bg-transparent",
        )}
      >
        {selected && (
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white"
          >
            <polyline points="4 12 10 18 20 6" />
          </svg>
        )}
      </span>
    </button>
  )
}
