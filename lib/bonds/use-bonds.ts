"use client"

import { useCallback, useEffect, useState } from "react"
import { useResolvedMocks } from "@/lib/dev/use-mocks-flag"
import { getSocket, peekSocket } from "@/lib/realtime/socket"
import { listBonds, type Bond } from "@/lib/bonds/api/bonds.real"

/**
 * Loads the customer's bonds and keeps them fresh: refetches whenever the
 * backend emits `bond.changed` (admin created/adjusted/locked a bond, or a
 * withdrawal settled). Kept out of the persisted global store on purpose —
 * bonds are always server-authoritative and shouldn't be cached across reloads.
 */
export function useBonds() {
  const USE_MOCKS = useResolvedMocks()
  const [bonds, setBonds] = useState<Bond[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (USE_MOCKS) {
      setBonds([])
      return
    }
    try {
      const rows = await listBonds()
      setBonds(rows)
      setError(null)
    } catch {
      setError("Couldn't load bonds.")
      setBonds((prev) => prev ?? [])
    }
  }, [USE_MOCKS])

  useEffect(() => {
    void refetch()
  }, [refetch])

  useEffect(() => {
    if (USE_MOCKS) return
    const sock = peekSocket() ?? getSocket()
    const onChange = () => void refetch()
    sock.on("bond.changed", onChange)
    return () => {
      sock.off("bond.changed", onChange)
    }
  }, [USE_MOCKS, refetch])

  return {
    bonds: bonds ?? [],
    loading: bonds === null && !error,
    error,
    refetch,
  }
}
