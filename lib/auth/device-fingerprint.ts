/**
 * Lightweight client context the backend uses for device fingerprinting.
 * The actual fingerprint hash is computed server-side from headers + the
 * timezone + canvasHash we pass through. We only expose helpers.
 */

export function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? ""
  } catch {
    return ""
  }
}

export function getDeviceName(): string {
  if (typeof navigator === "undefined") return "Browser"
  const ua = navigator.userAgent
  if (/iPhone/i.test(ua)) return "iPhone"
  if (/iPad/i.test(ua)) return "iPad"
  if (/Android/i.test(ua)) return "Android"
  if (/Macintosh|Mac OS/i.test(ua)) return "Mac"
  if (/Windows/i.test(ua)) return "Windows"
  if (/Linux/i.test(ua)) return "Linux"
  return "Browser"
}

/**
 * Small canvas-derived hash to disambiguate same-UA browsers. Stays cheap
 * on purpose — the backend treats this as a soft signal, not a secret.
 */
export async function getCanvasHash(): Promise<string> {
  if (typeof document === "undefined" || typeof crypto === "undefined")
    return ""
  try {
    const canvas = document.createElement("canvas")
    canvas.width = 200
    canvas.height = 60
    const ctx = canvas.getContext("2d")
    if (!ctx) return ""
    ctx.textBaseline = "top"
    ctx.font = "14px 'Arial'"
    ctx.fillStyle = "#f60"
    ctx.fillRect(0, 0, 200, 60)
    ctx.fillStyle = "#069"
    ctx.fillText("nova-fingerprint", 2, 2)
    ctx.strokeStyle = "rgba(102,204,0,0.7)"
    ctx.beginPath()
    ctx.arc(50, 30, 20, 0, Math.PI * 2)
    ctx.stroke()
    const data = canvas.toDataURL()
    const buf = new TextEncoder().encode(data)
    const hash = await crypto.subtle.digest("SHA-256", buf)
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 64)
  } catch {
    return ""
  }
}
