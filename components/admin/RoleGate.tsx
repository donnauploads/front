"use client"

import { ReactNode } from "react"
import { useStore } from "@/lib/store"
import type { Role } from "@/lib/store"
import { cn } from "@/lib/utils"
import { useMocks } from "@/lib/dev/use-mocks-flag"

/**
 * Wraps role-gated UI. If the viewer's role doesn't include the required
 * one, the children render disabled with a tooltip explaining why. We
 * deliberately render the disabled shell instead of hiding so reviewers
 * can see what's possible at higher roles.
 *
 * Real-mode reads the session role from /me; mocks-mode reads the
 * dev.fakeRole toggle so designers can flip between admin/superadmin
 * with Alt+Shift+R.
 */
export function RoleGate({
  requires,
  reason,
  children,
}: {
  requires: Role
  reason?: string
  children: ReactNode
}) {
  const role = useEffectiveRole()
  const allowed = role ? roleAtLeast(role, requires) : false
  if (allowed) return <>{children}</>
  return (
    <span
      className={cn(
        "relative inline-flex cursor-not-allowed opacity-50 [&_*]:!pointer-events-none",
      )}
      title={reason ?? `Requires ${requires}`}
      aria-disabled
    >
      {children}
    </span>
  )
}

function roleAtLeast(role: Role, required: Role): boolean {
  const order: Role[] = ["customer", "admin", "superadmin"]
  return order.indexOf(role) >= order.indexOf(required)
}

export function useIsAtLeast(role: Role): boolean {
  const effective = useEffectiveRole()
  return effective ? roleAtLeast(effective, role) : false
}

/** Returns the role the UI should gate on — real session in real mode,
 *  dev.fakeRole in mocks mode. */
function useEffectiveRole(): Role | null {
  const fakeRole = useStore((s) => s.dev.fakeRole)
  const sessionRole = useStore((s) => s.session.user?.role ?? null)
  return useMocks ? fakeRole : sessionRole
}
