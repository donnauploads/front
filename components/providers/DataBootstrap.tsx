"use client"

import { useEffect } from "react"
import { useStore } from "@/lib/store"
import { listAccounts } from "@/lib/accounts/api/accounts"
import { listTransactions } from "@/lib/transactions/api/transactions"
import {
  getAutosave,
  listGoals,
  toFrontendAutosave,
} from "@/lib/savings/api/savings.real"
import { listNotifications } from "@/lib/notifications/api/notifications.real"
import { ApiError, NetworkError } from "@/lib/api/errors"
import { BRAND_NAME } from "@/lib/brand"
import { useToast } from "@/components/providers/ToastProvider"
import { ensureSocketConnected } from "@/lib/realtime/socket"

import { useMocks as USE_MOCKS } from "@/lib/dev/use-mocks-flag"

/**
 * When real wiring is on and we've got a session, fetch the customer's
 * accounts + first page of transactions and write them into the store.
 * In mocks mode this is a no-op — StoreHydrator already seeded the demo
 * fixtures, and reading from the API switches would return the same data.
 *
 * Mounted inside the (app) layout so it only runs for authenticated
 * customer-app pages. Status flags (`data.accountsStatus`,
 * `data.transactionsStatus`) drive loading + error UI.
 */
export function DataBootstrap() {
  const status = useStore((s) => s.session.status)
  const userId = useStore((s) => s.session.user?.id)
  const setAccounts = useStore((s) => s.setAccounts)
  const setTransactions = useStore((s) => s.setTransactions)
  const setAccountsStatus = useStore((s) => s.setAccountsStatus)
  const setTransactionsStatus = useStore((s) => s.setTransactionsStatus)
  const setTransactionsCursor = useStore((s) => s.setTransactionsCursor)
  const setGoals = useStore((s) => s.setGoals)
  const setAutosave = useStore((s) => s.setAutosave)
  const setNotifications = useStore((s) => s.setNotifications)
  const setLastError = useStore((s) => s.setLastError)
  const { toast } = useToast()

  // Realtime: the instant the session is authenticated, (re)connect the
  // socket so its handshake runs with the now-present access token. This is
  // what makes realtime / token-gated features activate immediately on
  // login instead of only after the user happens to navigate somewhere
  // (e.g. the Appearance settings page) that forced a reconnect.
  useEffect(() => {
    if (USE_MOCKS) return
    if (status !== "authenticated" || !userId) return
    ensureSocketConnected()
  }, [status, userId])

  useEffect(() => {
    if (USE_MOCKS) return
    if (status !== "authenticated" || !userId) return

    let cancelled = false

    ;(async () => {
      setAccountsStatus("loading")
      try {
        const accounts = await listAccounts()
        if (cancelled) return
        setAccounts(accounts)
        setAccountsStatus("ready")
      } catch (err) {
        if (cancelled) return
        setAccountsStatus("error")
        const msg =
          err instanceof NetworkError
            ? `Can't reach ${BRAND_NAME} right now.`
            : err instanceof ApiError
              ? err.message || "Couldn't load accounts."
              : "Couldn't load accounts."
        setLastError(msg)
        toast(msg, { variant: "error", duration: 3000 })
      }
    })()

    ;(async () => {
      try {
        const items = await listNotifications()
        if (cancelled) return
        setNotifications(items)
      } catch {
        // Non-critical; the bell just stays empty until a realtime push.
      }
    })()

    ;(async () => {
      try {
        const goals = await listGoals()
        if (cancelled) return
        setGoals(goals)
        try {
          const cfg = await getAutosave()
          if (cancelled) return
          setAutosave(toFrontendAutosave(cfg, goals))
        } catch {
          // Autosave is optional — first-time users have no config row yet.
        }
      } catch (err) {
        if (cancelled) return
        // Goals are non-critical for first paint; log via toast but don't
        // mark the whole page errored.
        if (err instanceof NetworkError || err instanceof ApiError) {
          // intentionally quiet
        }
      }
    })()

    ;(async () => {
      setTransactionsStatus("loading")
      try {
        const page = await listTransactions({ limit: 50 })
        if (cancelled) return
        setTransactions(page.items)
        setTransactionsCursor(page.nextCursor)
        setTransactionsStatus("ready")
      } catch (err) {
        if (cancelled) return
        setTransactionsStatus("error")
        if (err instanceof NetworkError) {
          toast("Can't load transactions, network error.", {
            variant: "error",
            duration: 2800,
          })
        } else if (err instanceof ApiError) {
          toast(err.message || "Couldn't load transactions.", {
            variant: "error",
            duration: 2800,
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    status,
    userId,
    setAccounts,
    setTransactions,
    setAccountsStatus,
    setTransactionsStatus,
    setTransactionsCursor,
    setGoals,
    setAutosave,
    setNotifications,
    setLastError,
    toast,
  ])

  return null
}
