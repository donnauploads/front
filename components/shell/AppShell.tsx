"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { StoreHydrator } from "@/components/providers/StoreHydrator"
import { SbSidebar } from "./SbSidebar"
import { SbTopBar } from "./SbTopBar"

import "@/app/(app)/dashboard-sb.css"

/**
 * Customer-app shell — design-ported layout.
 *
 *   .app
 *   ├── <SbSidebar />              ← 268px navy panel; slides in ≤860px
 *   └── .main
 *       ├── <SbTopBar />           ← burger + crumb/title + search + dropdowns
 *       └── .content (children)
 *
 * The sidebar's open/close state lives here so the burger in the topbar
 * can toggle it. Pathname changes auto-close it on mobile so navigating
 * via the menu drops the user back into the new page cleanly.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const contentRef = useRef<HTMLDivElement>(null)

  // Auto-close the slide-in sidebar on route change (mobile UX), and reset
  // the scroll position. `.content` is the scroll region now (the shell is
  // pinned to the viewport), so Next's default window-scroll-reset doesn't
  // apply — scroll the content region back to the top on navigation.
  useEffect(() => {
    setSidebarOpen(false)
    contentRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  // Esc closes the sidebar when open.
  useEffect(() => {
    if (!sidebarOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [sidebarOpen])

  return (
    <div className="app">
      <StoreHydrator />

      <SbSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main">
        <SbTopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <div className="content" ref={contentRef}>{children}</div>
      </div>
    </div>
  )
}
