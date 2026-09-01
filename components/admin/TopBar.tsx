"use client"

import { Menu } from "lucide-react"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { useMocks } from "@/lib/dev/use-mocks-flag"

export function AdminTopBar({
  onOpenMobileMenu,
}: {
  /** Mobile-only: shown on small screens, opens the LeftRail drawer. */
  onOpenMobileMenu?: () => void
}) {
  // In real mode the truth is the session user the JWT-guarded /me call
  // hydrated. The customer-shaped `s.user` slice is only authoritative in
  // mocks mode (used by the standalone UI demo). Reading session first
  // means a logout / re-login as a different admin reflects here without
  // any extra plumbing.
  const sessionUser = useStore((s) => s.session.user)
  const customerSliceUser = useStore((s) => s.user)
  const fakeRole = useStore((s) => s.dev.fakeRole)
  const role = useMocks
    ? fakeRole
    : (sessionUser?.role ?? fakeRole)

  const name = displayName(sessionUser, customerSliceUser)
  const initials = displayInitials(sessionUser, customerSliceUser)
  const avatarUrl = sessionUser?.avatarUrl ?? customerSliceUser?.avatarUrl ?? null

  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open menu"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden"
        >
          <Menu className="h-4 w-4" aria-hidden />
        </button>
        <div className="truncate text-xs text-slate-500">
          Signed in as{" "}
          <span className="font-semibold text-slate-900">{name}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
            role === "superadmin"
              ? "bg-violet-100 text-violet-700"
              : "bg-slate-900 text-white",
          )}
        >
          {role === "superadmin" ? "Superadmin" : role === "admin" ? "Admin" : role}
        </span>
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xs font-semibold text-white">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
      </div>
    </header>
  )
}

function displayName(
  sessionUser: { firstName?: string | null; lastName?: string | null; email?: string | null } | null | undefined,
  customerSliceUser: { name?: string | null } | null | undefined,
): string {
  if (sessionUser) {
    const full = [sessionUser.firstName, sessionUser.lastName]
      .filter(Boolean)
      .join(" ")
      .trim()
    if (full) return full
    if (sessionUser.email) return sessionUser.email
  }
  if (customerSliceUser?.name) return customerSliceUser.name
  return "Admin"
}

function displayInitials(
  sessionUser: { firstName?: string | null; lastName?: string | null; email?: string | null } | null | undefined,
  customerSliceUser: { initials?: string | null } | null | undefined,
): string {
  if (sessionUser) {
    const f = (sessionUser.firstName ?? "").trim()
    const l = (sessionUser.lastName ?? "").trim()
    const fl = ((f[0] ?? "") + (l[0] ?? "")).toUpperCase()
    if (fl) return fl
    if (sessionUser.email) return sessionUser.email.slice(0, 2).toUpperCase()
  }
  if (customerSliceUser?.initials) return customerSliceUser.initials
  return "AD"
}
