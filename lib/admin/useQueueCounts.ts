"use client"

import { useEffect, useState } from "react"
import { peekSocket, getSocket } from "@/lib/realtime/socket"
import { getQueueCounts, type QueueCounts } from "./api/queue.real"

/**
 * Subscribe to the admin operations queue counts.
 *
 *   1. Fetches once on mount via GET /admin/queue-counts.
 *   2. Subscribes to `admin.queue.changed` over the existing WebSocket
 *      (broadcast to the `support:admins` room — admins auto-join on
 *      socket connect). Each event triggers a fresh fetch so we always
 *      reflect actual DB state, not optimistic deltas.
 *
 * Used by the dashboard cards and the sidebar badges so they stay in
 * sync without polling.
 */
export function useQueueCounts() {
  const [counts, setCounts] = useState<QueueCounts | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    function refresh() {
      getQueueCounts()
        .then((c) => {
          if (!cancelled) setCounts(c)
        })
        .catch(() => {
          if (!cancelled) setError("Couldn't load queue counts.")
        })
    }
    refresh()

    let sock = peekSocket()
    if (!sock) sock = getSocket()
    const onChange = () => refresh()
    sock.on("admin.queue.changed", onChange)
    return () => {
      cancelled = true
      sock?.off("admin.queue.changed", onChange)
    }
  }, [])

  return { counts, error }
}
