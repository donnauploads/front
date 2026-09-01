"use client"

import * as React from "react"

/**
 * Number input that displays values with thousand-separator commas while
 * keeping the underlying state as a raw digit string ("5000000" or
 * "-5000000.50"). Drop-in replacement for `<input type="number">` in
 * money/amount fields.
 *
 * Apply to anything money-shaped. Do NOT use for phone numbers, SSN,
 * PINs, OTP codes, or other identifiers where digits are not a quantity.
 */
export type MoneyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  /** Raw value with no commas — e.g. "5000000" or "-12.50". */
  value: string
  /** Called with the comma-stripped string the parent should store. */
  onChange: (next: string) => void
}

export function MoneyInput({ value, onChange, ...rest }: MoneyInputProps) {
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={formatWithCommas(value)}
      onChange={(e) => onChange(stripCommas(e.target.value))}
      {...rest}
    />
  )
}

/** "5000000.5" → "5,000,000.5", "-12.50" → "-12.50", "" → "". */
export function formatWithCommas(s: string): string {
  if (!s) return ""
  const sign = s.startsWith("-") ? "-" : ""
  const rest = s.replace(/^-/, "")
  // Allow a trailing "." while the user is still typing.
  const [whole, fraction] = rest.split(".")
  // Strip any stray non-digits from the integer part so paste/paste-with-
  // commas behaves correctly.
  const cleanedWhole = (whole ?? "").replace(/\D/g, "")
  const wholeWithCommas = cleanedWhole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  if (fraction === undefined) return sign + wholeWithCommas
  return sign + wholeWithCommas + "." + fraction.replace(/\D/g, "")
}

/** "5,000,000.50" → "5000000.50". Preserves "-" and ".". */
export function stripCommas(s: string): string {
  return s.replace(/,/g, "")
}
