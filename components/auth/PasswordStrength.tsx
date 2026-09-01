"use client"

import { cn } from "@/lib/utils"

/**
 * Shared password-rule checklist used by:
 *   - /get-started password step
 *   - /recover/password reset landing
 *
 * Server-side validators in Stage 2 (`POST /auth/recover/password/reset`,
 * `POST /auth/signup/:id/password`) duplicate these rules — frontend gates
 * UX, server is the contract.
 */

export const PASSWORD_RULES = [
  { label: "8+ characters", test: (pw: string) => pw.length >= 8 },
  { label: "Number", test: (pw: string) => /\d/.test(pw) },
  {
    label: "Lower and uppercase letters",
    test: (pw: string) => /[a-z]/.test(pw) && /[A-Z]/.test(pw),
  },
  {
    label: "Special characters like ! @ # $ %",
    test: (pw: string) => /[^A-Za-z0-9]/.test(pw),
  },
] as const

export function isPasswordValid(pw: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(pw))
}

export function PasswordStrength({
  password,
  className,
}: {
  password: string
  className?: string
}) {
  return (
    <ul className={cn("space-y-2.5 pl-4", className)}>
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password)
        return (
          <li key={rule.label} className="flex items-center gap-2 text-sm">
            <CheckMark active={ok} />
            <span
              className={cn(
                "transition-colors",
                ok ? "text-ink-dark" : "text-ink-dark/65",
              )}
            >
              {rule.label}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function CheckMark({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        "h-5 w-5 flex-shrink-0 transition-colors",
        active ? "text-brand-deep" : "text-ink-dark/25",
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="4 12 10 18 20 6" />
    </svg>
  )
}
