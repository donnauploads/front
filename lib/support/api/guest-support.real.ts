/**
 * Guest (logged-out) support chat API. Mirrors the authed support endpoints
 * but hits the public `/support/guest/*` routes — no session required. A
 * thread is created from a name/email intake; the returned `token` is a
 * capability the browser stores (localStorage) and sends back in the
 * `x-guest-token` header on every subsequent call. Messages stream live over
 * the realtime gateway (event `support.message.created`) via an anonymous
 * guest socket — see `connectGuestSocket` in lib/realtime/socket.
 */

import { apiFetch } from "@/lib/api/client"

export type GuestSupportMessage = {
  id: string
  threadId: string
  senderId: string | null
  senderRole: "guest" | "admin" | "customer"
  body: string
  createdAt: string
}

export type GuestThread = {
  id: string
  status: "open" | "closed"
  /** Signed capability token — store it; send as `x-guest-token`. */
  token: string
  createdAt: string
}

const STORAGE_KEY = "sb:guest-support"

export type StoredGuest = {
  threadId: string
  token: string
  name: string
  email: string
}

export function loadStoredGuest(): StoredGuest | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as StoredGuest
    if (v && v.threadId && v.token) return v
  } catch {
    /* ignore corrupt entry */
  }
  return null
}

export function saveStoredGuest(v: StoredGuest): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
  } catch {
    /* storage may be unavailable (private mode) — chat still works in-session */
  }
}

export function clearStoredGuest(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Start a brand-new guest thread from the intake form. */
export function openGuestThread(
  name: string,
  email: string,
): Promise<GuestThread> {
  return apiFetch<GuestThread>("/support/guest/thread", {
    method: "POST",
    skipAuth: true,
    body: { name, email },
  })
}

export function listGuestMessages(
  threadId: string,
  token: string,
): Promise<GuestSupportMessage[]> {
  return apiFetch<GuestSupportMessage[]>(
    `/support/guest/thread/${threadId}/messages`,
    { skipAuth: true, headers: { "x-guest-token": token } },
  )
}

export function sendGuestMessage(
  threadId: string,
  token: string,
  body: string,
): Promise<GuestSupportMessage> {
  return apiFetch<GuestSupportMessage>(
    `/support/guest/thread/${threadId}/messages`,
    {
      method: "POST",
      skipAuth: true,
      headers: { "x-guest-token": token },
      body: { body },
    },
  )
}
