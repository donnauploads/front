import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a user-typed numeric string with thousands separators while typing.
 * Keeps a single trailing decimal point and decimal digits intact, so the
 * field doesn't fight the user mid-entry (e.g. "1234." stays "1,234.").
 */
export function formatNumericInput(raw: string): string {
  // Strip everything except digits and dots; collapse multiple dots to one.
  const cleaned = raw.replace(/[^0-9.]/g, "")
  const firstDot = cleaned.indexOf(".")
  const normalized =
    firstDot === -1
      ? cleaned
      : cleaned.slice(0, firstDot + 1) +
        cleaned.slice(firstDot + 1).replace(/\./g, "")
  const [intPart, decPart] = normalized.split(".")
  const withCommas = (intPart ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas
}

/** Strip commas so the formatted value can be parsed / sent to the server. */
export function unformatNumericInput(formatted: string): string {
  return formatted.replace(/,/g, "")
}

/**
 * Resolve no sooner than `minMs`. Use to keep a loading spinner visible long
 * enough to read on fast networks. Errors still surface immediately.
 */
export async function withMinDelay<T>(
  promise: Promise<T>,
  minMs = 800,
): Promise<T> {
  const start = Date.now()
  try {
    return await promise
  } finally {
    const elapsed = Date.now() - start
    if (elapsed < minMs) {
      await new Promise((r) => setTimeout(r, minMs - elapsed))
    }
  }
}
