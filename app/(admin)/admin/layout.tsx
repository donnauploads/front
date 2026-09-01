"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { useToast } from "@/components/providers/ToastProvider"
import { StoreHydrator } from "@/components/providers/StoreHydrator"
import { LeftRail } from "@/components/admin/LeftRail"
import { AdminTopBar } from "@/components/admin/TopBar"
import { ErrorBoundary } from "@/components/providers/ErrorBoundary"

import { useMocks as USE_MOCKS } from "@/lib/dev/use-mocks-flag"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const fakeRole = useStore((s) => s.dev.fakeRole)
  const setFakeRole = useStore((s) => s.setFakeRole)
  const sessionStatus = useStore((s) => s.session.status)
  const sessionRole = useStore((s) => s.session.user?.role)
  const { toast } = useToast()
  const [ready, setReady] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Wait one tick so the persisted role hydrates before we decide.
  useEffect(() => setReady(true), [])

  // Mocks mode keeps the dev role toggle (FE-6). Real wiring uses the
  // session role from /me.
  const effectiveRole = USE_MOCKS ? fakeRole : sessionRole

  useEffect(() => {
    if (!ready) return
    if (!USE_MOCKS) {
      if (sessionStatus === "loading" || sessionStatus === "unknown") return
      if (sessionStatus === "unauthenticated") {
        router.replace("/login")
        return
      }
    }
    if (effectiveRole !== "admin" && effectiveRole !== "superadmin") {
      toast("You don't have access to that page.", {
        variant: "error",
        duration: 2400,
      })
      router.replace("/home")
    }
  }, [ready, sessionStatus, effectiveRole, router, toast])

  // Alt+Shift+R is a mocks-only convenience — switching the dev role has
  // no effect on real RBAC, so we don't bind the key when wiring is on.
  useEffect(() => {
    if (!USE_MOCKS) return
    function onKey(e: KeyboardEvent) {
      if (e.altKey && e.shiftKey && (e.key === "R" || e.key === "r")) {
        e.preventDefault()
        const next = fakeRole === "superadmin" ? "admin" : "superadmin"
        setFakeRole(next)
        toast(`Switched to ${next}`, { variant: "info", duration: 1500 })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [fakeRole, setFakeRole, toast])

  if (!ready) return null
  if (!USE_MOCKS) {
    if (sessionStatus === "loading" || sessionStatus === "unknown") {
      return (
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
          Loading…
        </div>
      )
    }
    if (sessionStatus === "unauthenticated") return null
  }
  if (effectiveRole !== "admin" && effectiveRole !== "superadmin") return null

  return (
    <ErrorBoundary scope="The admin app">
      {/* Lock the shell to the viewport height so the LeftRail and the
          AdminTopBar stay pinned; only <main> scrolls under them. */}
      <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
        <StoreHydrator />
        <LeftRail
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
        <div className="flex h-screen min-w-0 flex-1 flex-col">
          <AdminTopBar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </ErrorBoundary>
  )
}
