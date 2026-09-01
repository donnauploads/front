"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { clearAccessToken } from "@/lib/api/token-store"
import { disconnectSocket, getSocket } from "@/lib/realtime/socket"
import { useToast } from "@/components/providers/ToastProvider"

import { useMocks as USE_MOCKS } from "@/lib/dev/use-mocks-flag"

/**
 * Subscribes the singleton socket while the user is authenticated and
 * dispatches the backend's documented events into the store. Mounted
 * once near the root; only does anything when session.status is
 * "authenticated" and we're not in mocks mode.
 *
 * Event payloads mirror apps/api/src/modules/realtime/realtime.gateway.ts.
 */
export function RealtimeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { toast } = useToast()
  const status = useStore((s) => s.session.status)
  const clearSession = useStore((s) => s.clearSession)
  const upsertTransaction = useStore((s) => s.upsertTransaction)
  const settleTransaction = useStore((s) => s.settleTransaction)
  const removeTransaction = useStore((s) => s.removeTransaction)
  const setAccountBalance = useStore((s) => s.setAccountBalance)
  const prependNotification = useStore((s) => s.prependNotification)
  const markNotificationsRead = useStore((s) => s.markNotificationsRead)
  const showAdminMessage = useStore((s) => s.showAdminMessage)

  // When the user logs out (or session is revoked), tear the socket down
  // exactly once. Kept separate from the listener-attach effect so we
  // don't accidentally rip the socket out from under feature-level
  // subscribers (chat modal, admin queue badges, etc.) whenever an
  // unrelated dep (router, toast, store action ref) changes.
  useEffect(() => {
    if (USE_MOCKS) return
    if (status === "unauthenticated") disconnectSocket()
  }, [status])

  useEffect(() => {
    if (USE_MOCKS) return
    if (status !== "authenticated") return

    const sock = getSocket()
    if (!sock.connected) sock.connect()

    function onConnect() {
      // For dev visibility — keep the noise out of prod.
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.info("[realtime] connected")
      }
    }

    function onConnectError(err: Error) {
      // 401-equivalent: token rejected at handshake. Fall through to the
      // session expiry path — the SessionBootstrap refresh loop will pick
      // up a new token and the next reconnect attempt re-auths.
      // eslint-disable-next-line no-console
      console.warn("[realtime] connect_error:", err.message)
    }

    function onSessionRevoked(p: {
      sessionId: string
      userId: string
      reason: string
      at: string
    }) {
      clearAccessToken()
      clearSession()
      disconnectSocket()
      const msg =
        p.reason === "newer_login"
          ? "Logged in successfully in safe mode."
          : p.reason === "password_changed"
            ? "Your password changed, please sign in again."
            : p.reason === "admin_revoke"
              ? "An admin signed you out."
              : "Your session was ended."
      toast(msg, { variant: "info", duration: 3200 })
      router.replace("/login")
    }

    function onTransactionCreated(p: {
      transactionId: string
      accountId: string
      amountCents: string
      status: string
      at: string
      description?: string
      category?: string
      occurredAt?: string
      kind?: string
    }) {
      // Backend now includes description / category / occurredAt on the
      // wire so admin-created rows render correctly on first push. If a
      // previous client-side optimistic insert already filled the row,
      // we prefer the server-authoritative fields when present and fall
      // back to the existing values otherwise.
      const existing = useStore
        .getState()
        .transactions.find((t) => t.id === p.transactionId)
      const amount = Number(BigInt(p.amountCents)) / 100
      const status: "pending" | "posted" =
        p.status === "pending" ? "pending" : "posted"
      upsertTransaction({
        id: p.transactionId,
        accountId: p.accountId,
        amount,
        currency: "USD",
        description:
          p.description ?? existing?.description ?? "Transfer",
        category: p.category ?? existing?.category ?? "Transfer",
        merchant: existing?.merchant,
        status,
        date: p.occurredAt ?? p.at,
      })
    }

    function onTransactionSettled(p: {
      transactionId: string
      accountId: string
      amountCents: string
      at: string
    }) {
      // Flip the row to posted. If it isn't in the store yet (rare race),
      // create it.
      const existing = useStore
        .getState()
        .transactions.find((t) => t.id === p.transactionId)
      if (existing) {
        settleTransaction(p.transactionId)
        return
      }
      upsertTransaction({
        id: p.transactionId,
        accountId: p.accountId,
        amount: Number(BigInt(p.amountCents)) / 100,
        currency: "USD",
        description: "Transfer",
        category: "Transfer",
        status: "posted",
        date: p.at,
      })
    }

    function onTransactionUpdated(p: {
      transactionId: string
      accountId: string
      effective: {
        amountCents: string
        occurredAt: string
        description: string
        category: string
        status: string
      } | null
      hidden: boolean
      at: string
    }) {
      // Admin override push. `hidden` means the customer should no longer
      // see this row — wipe it locally so the spending feed updates.
      if (p.hidden) {
        removeTransaction(p.transactionId)
        return
      }
      if (!p.effective) return
      const status: "pending" | "posted" =
        p.effective.status === "pending" ? "pending" : "posted"
      upsertTransaction({
        id: p.transactionId,
        accountId: p.accountId,
        amount: Number(BigInt(p.effective.amountCents)) / 100,
        currency: "USD",
        description: p.effective.description,
        category:
          p.effective.category.charAt(0).toUpperCase() +
          p.effective.category.slice(1),
        status,
        date: p.effective.occurredAt,
      })
    }

    function onAccountBalanceChanged(p: {
      accountId: string
      balanceCents: string
    }) {
      setAccountBalance(p.accountId, Number(BigInt(p.balanceCents)) / 100)
    }

    function onNotificationCreated(p: {
      notificationId: string
      category: "transaction" | "offer" | "security" | "account"
      title: string
      body: string
      ctaUrl: string | null
      at: string
    }) {
      prependNotification({
        id: p.notificationId,
        title: p.title,
        body: p.body,
        ts: p.at,
        unread: true,
        category: p.category,
      })
    }

    function onNotificationRead(p: { notificationIds: string[] }) {
      markNotificationsRead(p.notificationIds)
    }

    function onAdminMessage(p: {
      messageId: string
      title: string
      body: string
      at: string
    }) {
      showAdminMessage({
        id: p.messageId,
        title: p.title,
        body: p.body,
        ts: p.at,
      })
    }

    sock.on("connect", onConnect)
    sock.on("connect_error", onConnectError)
    sock.on("session.revoked", onSessionRevoked)
    sock.on("transaction.created", onTransactionCreated)
    sock.on("transaction.settled", onTransactionSettled)
    sock.on("transaction.updated", onTransactionUpdated)
    sock.on("account.balanceChanged", onAccountBalanceChanged)
    sock.on("notification.created", onNotificationCreated)
    sock.on("notification.read", onNotificationRead)
    sock.on("admin.message", onAdminMessage)

    return () => {
      // Just detach our listeners — leave the socket open so other
      // subscribers (ChatSupportModal, admin queue hook, etc.) keep
      // receiving events. The logout effect above handles teardown.
      sock.off("connect", onConnect)
      sock.off("connect_error", onConnectError)
      sock.off("session.revoked", onSessionRevoked)
      sock.off("transaction.created", onTransactionCreated)
      sock.off("transaction.settled", onTransactionSettled)
      sock.off("transaction.updated", onTransactionUpdated)
      sock.off("account.balanceChanged", onAccountBalanceChanged)
      sock.off("notification.created", onNotificationCreated)
      sock.off("notification.read", onNotificationRead)
      sock.off("admin.message", onAdminMessage)
    }
  }, [
    status,
    router,
    toast,
    clearSession,
    upsertTransaction,
    settleTransaction,
    removeTransaction,
    setAccountBalance,
    prependNotification,
    markNotificationsRead,
    showAdminMessage,
  ])

  return <>{children}</>
}
