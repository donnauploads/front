"use client"

import { useEffect } from "react"
import { useStore } from "@/lib/store"
import { demoAccounts, demoUser } from "@/lib/fixtures/accounts"
import { demoNotifications } from "@/lib/fixtures/notifications"
import { transactions as allTransactions } from "@/lib/mock-data"
import { demoGoals, demoSplitAllocations } from "@/lib/fixtures/goals"
import { demoRecurring } from "@/lib/fixtures/move"
import { demoKycSubmissions } from "@/lib/admin/api/kyc"
import { demoAdminUsers } from "@/lib/admin/api/users"
import { demoAdminSessions } from "@/lib/admin/api/sessions"
import { demoAdminTxns } from "@/lib/admin/api/transactions"

/**
 * Seeds the demo fixtures into the store once, on first client mount.
 * Persisted slices win on subsequent loads — only fills what's missing,
 * so user-driven changes (e.g. mark-as-read) survive across sessions.
 */
export function StoreHydrator() {
  useEffect(() => {
    const s = useStore.getState()
    if (!s.user) useStore.setState({ user: demoUser })
    if (s.accounts.length === 0) useStore.setState({ accounts: demoAccounts })
    if (s.notifications.length === 0)
      useStore.setState({ notifications: demoNotifications })
    if (s.transactions.length === 0)
      useStore.setState({ transactions: allTransactions })
    if (s.goals.length === 0) useStore.setState({ goals: demoGoals })
    // Linked accounts are backend-driven (live link flow + admin approval);
    // the /move/linked page fetches them. Don't seed mock fixtures here.
    if (s.recurringTransfers.length === 0)
      useStore.setState({ recurringTransfers: demoRecurring })
    if (s.adminKyc.length === 0)
      useStore.setState({ adminKyc: demoKycSubmissions })
    if (s.adminUsers.length === 0)
      useStore.setState({ adminUsers: demoAdminUsers })
    if (s.adminSessions.length === 0)
      useStore.setState({ adminSessions: demoAdminSessions })
    if (s.adminTxns.length === 0)
      useStore.setState({ adminTxns: demoAdminTxns })
    if (s.autosave.split.length === 0)
      useStore.setState({
        autosave: {
          
          ...s.autosave,
          split: demoSplitAllocations,
          roundUpsTargetGoalId:
            s.autosave.roundUpsTargetGoalId ?? "g_my_savings",
        },
      })
  }, [])

  // Prototype "admin" hook — flip the transfers lock from the console:
  //   window.stateBank.setTransfersLocked(true)   // every money-move → locked modal
  //   window.stateBank.setTransfersLocked(false)  // back to normal (success flow)
  useEffect(() => {
    if (typeof window === "undefined") return
    const w = window as unknown as { stateBank?: Record<string, unknown> }
    w.stateBank = {
      ...(w.stateBank ?? {}),
      setTransfersLocked: (v: boolean) =>
        useStore.getState().setTransfersLocked(!!v),
      isTransfersLocked: () => useStore.getState().transfersLocked,
    }
  }, [])

  return null
}
