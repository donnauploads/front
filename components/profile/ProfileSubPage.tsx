"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

/**
 * Shared wrapper used by every /profile/* sub-route. Provides the design's
 * `view-back` + `page-head` chrome so each settings page renders inside the
 * .content slot of the new app shell without re-implementing back nav.
 */
export function ProfileSubPage({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  const router = useRouter()
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
        <h2>{title}</h2>
        {subtitle && <p className="ph-sub">{subtitle}</p>}
      </div>
      {children}
    </>
  )
}
