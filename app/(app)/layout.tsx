"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/shell/AppShell"
import { useStore } from "@/lib/store"
import { DataBootstrap } from "@/components/providers/DataBootstrap"
import { ErrorBoundary } from "@/components/providers/ErrorBoundary"
import { FirstLoginSecurityGate } from "@/components/security/FirstLoginSecurityGate"
import { AdminMessageModal } from "@/components/notifications/AdminMessageModal"
import { AppLock } from "@/components/security/AppLock"
import {
  SignInLoaderGate,
  DashboardLoadingScreen,
} from "@/components/providers/SignInLoaderGate"

import { useResolvedMocks } from "@/lib/dev/use-mocks-flag"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const status = useStore((s) => s.session.status)
  const role = useStore((s) => s.session.user?.role)
  // useResolvedMocks() returns the env default on the server and the first
  // client render, then settles to the override-applied value after mount.
  // That keeps the rendered DOM stable across hydration even when the
  // DevToolbar toggle has set a localStorage override that disagrees with
  // the build-time default.
  const USE_MOCKS = useResolvedMocks()

  useEffect(() => {
    if (USE_MOCKS) return
    if (status === "unauthenticated") router.replace("/login")
  }, [status, router, USE_MOCKS])

  // In mocks mode the session slice is never populated — render through.
  if (USE_MOCKS)
    return (
      <ErrorBoundary scope="The customer app">
        <DataBootstrap />
        <AppShell>
          <SignInLoaderGate>{children}</SignInLoaderGate>
        </AppShell>
      </ErrorBoundary>
    )

  // While the session is still bootstrapping, show the branded paper loader
  // (NOT the bare green body / old full-screen "Loading…" page) so it flows
  // seamlessly into the SignInLoaderGate once the user is authenticated.
  if (status === "loading" || status === "unknown")
    return <DashboardLoadingScreen />
  if (status === "unauthenticated") return null
  if (role !== "customer" && role !== "admin" && role !== "superadmin")
    return null
  return (
    <ErrorBoundary scope="The customer app">
      <DataBootstrap />
      <AppShell>
        <SignInLoaderGate>{children}</SignInLoaderGate>
      </AppShell>
      <FirstLoginSecurityGate />
      <AdminMessageModal />
      <AppLock />
    </ErrorBoundary>
  )
}
