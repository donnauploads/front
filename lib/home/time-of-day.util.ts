/**
 * Pure time-of-day bucketing. No DOM, no zustand — safe to import anywhere
 * (including tests). Server uses the same buckets in Stage 3's
 * `GET /me/greeting`.
 */

export type GreetingBucket = "morning" | "afternoon" | "evening" | "night"

/**
 * Map a Date to a bucket using local-time hours.
 *
 *   05:00–11:59 → morning
 *   12:00–16:59 → afternoon
 *   17:00–20:59 → evening
 *   21:00–04:59 → night
 */
export function bucketForDate(date: Date): GreetingBucket {
  const h = date.getHours()
  if (h >= 5 && h < 12) return "morning"
  if (h >= 12 && h < 17) return "afternoon"
  if (h >= 17 && h < 21) return "evening"
  return "night"
}

export function bucketForCurrentHour(): GreetingBucket {
  return bucketForDate(new Date())
}

export function bucketForHour(h: number): GreetingBucket {
  if (h >= 5 && h < 12) return "morning"
  if (h >= 12 && h < 17) return "afternoon"
  if (h >= 17 && h < 21) return "evening"
  return "night"
}

/**
 * Parse an ISO-8601 string with offset (e.g. "2026-05-27T03:25:00-04:00")
 * and return the wall-clock seconds-of-day in *that* offset, projected
 * forward by `elapsedMs`. Returns null if the ISO can't be parsed.
 *
 * Why this exists: `new Date(iso).getHours()` returns hours in the
 * *browser's* timezone, which is not what we want when the server has
 * resolved the user's location-specific timezone for us. We want the
 * hour at the user's actual location, not at their device.
 */
export function projectLocalSecondsOfDay(
  iso: string,
  elapsedMs: number,
): number | null {
  const m = iso.match(/T(\d{2}):(\d{2}):(\d{2})/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  const s = Number(m[3])
  const base = h * 3600 + min * 60 + s
  const projected = base + Math.floor(elapsedMs / 1000)
  // Wrap into [0, 86400). Negative elapsedMs (clock skew) wraps gracefully.
  return ((projected % 86400) + 86400) % 86400
}

export const GREETING_LABEL: Record<GreetingBucket, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
  night: "Good night",
}

/**
 * Format an ISO string in 12-hour clock, e.g. "7:14 AM".
 * Used by the local-time chip.
 */
export function formatLocalTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  let h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, "0")
  const ampm = h >= 12 ? "PM" : "AM"
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}
