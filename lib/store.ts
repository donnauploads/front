"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { isDisplayCurrency, type DisplayCurrency } from "@/lib/currency"

// ─── Domain types ─────────────────────────────────────────────────────────
// These slices intentionally start empty. Per-tab prompts will populate
// fixtures in `lib/fixtures/` and hydrate the store on first mount.

export type Account = {
  id: string
  type: "checking" | "savings" | "credit_builder" | "mypay"
  label: string
  balance: number
  currency: "USD"
  apy?: number
}

export type Transaction = {
  id: string
  accountId: string
  amount: number          // negative = outflow
  currency: "USD"
  description: string
  category?: string
  merchant?: string
  counterpartyName?: string
  status: "posted" | "pending"
  date: string            // ISO 8601
}

export type User = {
  name: string
  novaTag: string          // e.g. "$Denis-Trufin"
  memberSince: string      // year string e.g. "2021"
  initials: string
  avatarUrl?: string | null
}

// Forward-declared loosely so we don't drag the home/mocks types into the
// store's surface area. Anyone consuming `prefs.lastGreeting.data` casts to
// the concrete `Greeting` shape from `lib/home/mocks/greeting.mock.ts`.
export type CachedGreeting = {
  data: {
    greeting: "morning" | "afternoon" | "evening" | "night"
    firstName: string
    locationLabel: string
    weather: {
      tempF: number
      tempC: number
      condition: string
      icon: string
      summary: string
    } | null
    localTimeIso: string
  }
  fetchedAt: number
}

export type GeoStatus = "unknown" | "granted" | "denied" | "unavailable"

export type GreetingDebug = {
  forceBucket?: "morning" | "afternoon" | "evening" | "night"
  forceCondition?:
    | "sunny"
    | "partly_cloudy"
    | "cloudy"
    | "rain"
    | "snow"
    | "storm"
    | "night_clear"
    | "night_cloudy"
  forceError?: boolean
}

export type Prefs = {
  theme: "light" | "dark"
  demoBannerDismissed: boolean
  /** Privacy toggle on the home page — hides balances/amounts behind dots
   *  for over-the-shoulder situations. Persisted so it survives reloads. */
  balancesVisible: boolean
  geolocation: {
    status: GeoStatus
    /** Set true once we've asked once, so we never re-prompt automatically. */
    asked: boolean
  }
  lastGreeting: CachedGreeting | null
  debug: {
    greeting: GreetingDebug
  }
}

export type AppNotification = {
  id: string
  title: string
  body: string
  ts: string
  unread: boolean
  category: "transaction" | "offer" | "security" | "account"
}

/** A real-time admin "popup" message shown as a modal over the dashboard. */
export type AdminPopupMessage = {
  id: string
  title: string
  body: string
  ts: string
}

export type SavingsGoal = {
  id: string
  emoji: string
  name: string
  balance: number
  target: number | null
  isDefault: boolean
  contributePerWeek: number
}

export type SplitAllocation = {
  id: string
  label: string
  emoji: string
  percent: number
}

export type Autosave = {
  split: SplitAllocation[]
  roundUpsEnabled: boolean
  roundUpsTargetGoalId: string | null
}

export type LinkedAccount = {
  id: string
  bank: string
  type: "checking" | "savings" | "debit"
  mask: string
  status:
    | "connected"
    | "out_of_sync"
    | "needs_reauth"
    // Pending State Bank approval: the user submitted bank creds + verified
    // the email OTP, but an admin hasn't approved yet. Renders as a
    // disabled row with a "Pending authorization" pill. No money can
    // move through this row until status flips to "connected".
    | "pending_authorization"
    // Admin rejected the link request. Shown for ~24h after rejection
    // so the user sees why; the backend drops it from the customer
    // pending list after that window expires.
    | "rejected"
  lastSynced: string
  /** Populated only when status === "rejected". */
  rejectionReason?: string | null
}

export type RecurringTransfer = {
  id: string
  fromId: string
  fromLabel: string
  toId: string
  toLabel: string
  amount: number
  frequency: "weekly" | "biweekly" | "monthly"
  dayOf: number
  nextRun: string
  active: boolean
}

// ─── Admin domain types ──────────────────────────────────────────────────

export type Role = "customer" | "admin" | "superadmin"

export type KycStatus = "pending" | "in_review" | "approved" | "rejected"

export type KycDocument = {
  id: string
  type: "id" | "bill"
  subtype: string
  fileName: string
  /** Visual placeholder kind for the doc viewer. */
  previewKind: "image" | "pdf"
}

export type KycHistoryEvent = {
  at: string
  event: string
  by?: string
}

export type KycSubmission = {
  id: string
  userId: string
  userName: string
  userEmail: string
  dob: string
  addressLine: string
  ssnLast4: string
  phone: string
  ip: string
  geo: string
  status: KycStatus
  submittedAt: string
  reviewedAt?: string
  reviewerNote?: string
  documents: KycDocument[]
  history: KycHistoryEvent[]
}

export type AdminUser = {
  id: string
  name: string
  email: string
  novaTag: string
  phoneE164: string
  role: Role
  status: "active" | "suspended" | "pending_kyc"
  lastSignInAt: string
  createdAt: string
}

// ─── Admin transactions (FE-7) ────────────────────────────────────────────

export type AdminTxStatus =
  | "pending"
  | "settled"
  | "declined"
  | "reversed"
  | "hidden"

export type AdminTxRecord = {
  id: string
  userId: string
  userName: string
  accountId: string
  accountLabel: string
  amount: number
  currency: "USD"
  description: string
  category: string
  status: AdminTxStatus
  occurredAt: string
}

export type TxOverride = {
  amount?: number
  occurredAt?: string
  description?: string
  category?: string
  status?: AdminTxStatus
  reason: string
  overriddenAt: string
  overriddenBy: string
}

export type AdminSession = {
  id: string
  userId: string
  deviceName: string
  os: string
  browser: string
  ip: string
  location: string
  lastActiveAt: string
  revokedAt?: string
  /** Whether this is the device that's currently signed in. */
  current: boolean
}

// Signup-flow state that needs to survive a browser refresh while the user
// is in the middle of `/get-started`. Form values (name, dob, etc.) stay
// local to the page; this slice tracks the cross-step artifacts (the
// signup id, the phone in E.164, the chosen verification channel, and the
// verification result) that need to persist.
export type VerificationChannel = "email" | "sms"

export type SignupSlice = {
  signupId: string | null
  phoneE164: string | null
  verificationChannel: VerificationChannel | null
  verificationId: string | null
  verifiedAt: number | null
}

// ─── Session (WIRE-2) ─────────────────────────────────────────────────────
// Lives in memory only. Recovered on app boot by SessionBootstrap via the
// httpOnly refresh cookie. Never persist this slice.

export type SessionStatus =
  | "unknown"
  | "loading"
  | "authenticated"
  | "unauthenticated"

export type SessionUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: Role
  novaTag: string | null
  phoneE164: string | null
  avatarUrl: string | null
  status: string
  /** True for admin-created accounts until the user completes the forced
   *  password change + transaction PIN (see FirstLoginSecurityGate). */
  securitySetupRequired?: boolean
}

export type SessionSlice = {
  user: SessionUser | null
  status: SessionStatus
  sessionId: string | null
}

export type DataStatus = "unknown" | "loading" | "ready" | "error"

export type DataSlice = {
  accountsStatus: DataStatus
  transactionsStatus: DataStatus
  transactionsCursor: string | null
  lastError: string | null
}

// ─── Store ────────────────────────────────────────────────────────────────

type State = {
  user: User | null
  accounts: Account[]
  transactions: Transaction[]
  notifications: AppNotification[]
  adminMessage: AdminPopupMessage | null
  goals: SavingsGoal[]
  autosave: Autosave
  /** User-chosen display currency (persisted). Balances/amounts are stored
   *  in USD and converted to this for display. */
  displayCurrency: DisplayCurrency
  /** ISO timestamp of the live FX table feeding display-currency conversion.
   *  Bumped when rates load so money widgets re-render at the live rate. */
  fxRatesAsOf: string | null
  linkedAccounts: LinkedAccount[]
  recurringTransfers: RecurringTransfer[]
  /** Prototype admin lock — when true, every money-move is gated to the
   *  "Transfers are temporarily locked" modal. Toggle via window.State Bank. */
  transfersLocked: boolean
  activatedDealIds: string[]
  signup: SignupSlice
  prefs: Prefs
  dev: { fakeRole: Role }
  adminKyc: KycSubmission[]
  adminUsers: AdminUser[]
  adminSessions: AdminSession[]
  adminTxns: AdminTxRecord[]
  txOverrides: Record<string, TxOverride>
  session: SessionSlice
  data: DataSlice
}

type Actions = {
  setUser: (user: User | null) => void
  setAccounts: (accounts: Account[]) => void
  setTransactions: (txns: Transaction[]) => void
  addTransaction: (t: Transaction) => void
  settleTransaction: (id: string) => void
  upsertTransaction: (t: Transaction) => void
  removeTransaction: (id: string) => void
  setAccountBalance: (accountId: string, balance: number) => void
  prependNotification: (n: AppNotification) => void
  markNotificationsRead: (ids: string[]) => void
  setNotifications: (n: AppNotification[]) => void
  showAdminMessage: (m: AdminPopupMessage) => void
  dismissAdminMessage: () => void
  markAllNotificationsRead: () => void
  setGoals: (goals: SavingsGoal[]) => void
  upsertGoal: (g: SavingsGoal) => void
  deleteGoal: (id: string) => void
  contributeToGoal: (id: string, amount: number) => void
  setAutosave: (a: Autosave) => void
  setDisplayCurrency: (c: DisplayCurrency) => void
  setFxRatesAsOf: (v: string | null) => void
  setLinkedAccounts: (las: LinkedAccount[]) => void
  upsertLinkedAccount: (la: LinkedAccount) => void
  removeLinkedAccount: (id: string) => void
  setRecurringTransfers: (rts: RecurringTransfer[]) => void
  upsertRecurringTransfer: (rt: RecurringTransfer) => void
  deleteRecurringTransfer: (id: string) => void
  setTransfersLocked: (v: boolean) => void
  toggleDeal: (id: string) => void
  setGeoStatus: (status: GeoStatus, asked?: boolean) => void
  setLastGreeting: (g: CachedGreeting | null) => void
  setGreetingDebug: (d: GreetingDebug) => void
  setSignupId: (id: string | null) => void
  setSignupPhoneE164: (phone: string | null) => void
  setVerificationChannel: (c: VerificationChannel | null) => void
  setVerificationId: (id: string | null) => void
  setVerifiedAt: (ts: number | null) => void
  resetSignup: () => void
  setFakeRole: (role: Role) => void
  setKycSubmissions: (items: KycSubmission[]) => void
  updateKycStatus: (
    id: string,
    status: KycStatus,
    note?: string,
    by?: string,
  ) => void
  setAdminUsers: (items: AdminUser[]) => void
  setAdminSessions: (items: AdminSession[]) => void
  revokeAdminSession: (id: string) => void
  revokeAllSessionsForUser: (userId: string) => void
  setUserRole: (userId: string, role: Role) => void
  setAdminTxns: (items: AdminTxRecord[]) => void
  setTxOverride: (id: string, override: TxOverride) => void
  clearTxOverride: (id: string) => void
  bulkShiftTxns: (
    ids: string[],
    deltaDays: number,
    reason: string,
    by: string,
  ) => void
  setSessionUser: (user: SessionUser | null) => void
  setSessionStatus: (status: SessionStatus) => void
  setSessionId: (id: string | null) => void
  clearSession: () => void
  setAccountsStatus: (status: DataStatus) => void
  setTransactionsStatus: (status: DataStatus) => void
  setTransactionsCursor: (c: string | null) => void
  setLastError: (msg: string | null) => void
  dismissDemoBanner: () => void
  setTheme: (theme: "light" | "dark") => void
  toggleBalancesVisible: () => void
  reset: () => void
  resetDemo: () => void
}

const initialState: State = {
  user: null,
  accounts: [],
  transactions: [],
  notifications: [],
  adminMessage: null,
  goals: [],
  autosave: {
    split: [],
    roundUpsEnabled: false,
    roundUpsTargetGoalId: null,
  },
  displayCurrency: "USD",
  fxRatesAsOf: null,
  linkedAccounts: [],
  recurringTransfers: [],
  transfersLocked: false,
  activatedDealIds: [],
  signup: {
    signupId: null,
    phoneE164: null,
    verificationChannel: null,
    verificationId: null,
    verifiedAt: null,
  },
  prefs: {
    theme: "dark",
    demoBannerDismissed: false,
    balancesVisible: true,
    geolocation: {
      status: "unknown",
      asked: false,
    },
    lastGreeting: null,
    debug: {
      greeting: {},
    },
  },
  dev: { fakeRole: "customer" },
  adminKyc: [],
  adminUsers: [],
  adminSessions: [],
  adminTxns: [],
  txOverrides: {},
  session: { user: null, status: "unknown", sessionId: null },
  data: {
    accountsStatus: "unknown",
    transactionsStatus: "unknown",
    transactionsCursor: null,
    lastError: null,
  },
}

export const useStore = create<State & Actions>()(
  persist(
    (set) => ({
      ...initialState,
      setUser: (user) => set({ user }),
      setAccounts: (accounts) => set({ accounts }),
      setTransactions: (transactions) => set({ transactions }),
      addTransaction: (t) =>
        set((s) => ({ transactions: [t, ...s.transactions] })),
      settleTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, status: "posted" } : t,
          ),
        })),
      upsertTransaction: (t) =>
        set((s) => {
          const idx = s.transactions.findIndex((x) => x.id === t.id)
          if (idx === -1) return { transactions: [t, ...s.transactions] }
          const next = [...s.transactions]
          next[idx] = { ...next[idx]!, ...t }
          return { transactions: next }
        }),
      removeTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
        })),
      setAccountBalance: (accountId, balance) =>
        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === accountId ? { ...a, balance } : a,
          ),
        })),
      prependNotification: (n) =>
        set((s) => {
          if (s.notifications.some((x) => x.id === n.id)) return {}
          return { notifications: [n, ...s.notifications] }
        }),
      markNotificationsRead: (ids) =>
        set((s) => {
          const set_ = new Set(ids)
          return {
            notifications: s.notifications.map((n) =>
              set_.has(n.id) ? { ...n, unread: false } : n,
            ),
          }
        }),
      setNotifications: (notifications) => set({ notifications }),
      markAllNotificationsRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, unread: false })),
        })),
      showAdminMessage: (adminMessage) => set({ adminMessage }),
      dismissAdminMessage: () => set({ adminMessage: null }),
      setGoals: (goals) => set({ goals }),
      upsertGoal: (g) =>
        set((s) => {
          const idx = s.goals.findIndex((x) => x.id === g.id)
          const goals = idx === -1 ? [...s.goals, g] : s.goals.map((x) => (x.id === g.id ? g : x))
          return { goals }
        }),
      deleteGoal: (id) =>
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      contributeToGoal: (id, amount) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id ? { ...g, balance: +(g.balance + amount).toFixed(2) } : g,
          ),
        })),
      setAutosave: (autosave) => set({ autosave }),
      setDisplayCurrency: (displayCurrency) => set({ displayCurrency }),
      setFxRatesAsOf: (fxRatesAsOf) => set({ fxRatesAsOf }),
      setLinkedAccounts: (linkedAccounts) => set({ linkedAccounts }),
      upsertLinkedAccount: (la) =>
        set((s) => {
          const i = s.linkedAccounts.findIndex((x) => x.id === la.id)
          return {
            linkedAccounts:
              i === -1
                ? [...s.linkedAccounts, la]
                : s.linkedAccounts.map((x) => (x.id === la.id ? la : x)),
          }
        }),
      removeLinkedAccount: (id) =>
        set((s) => ({
          linkedAccounts: s.linkedAccounts.filter((l) => l.id !== id),
        })),
      setRecurringTransfers: (recurringTransfers) =>
        set({ recurringTransfers }),
      upsertRecurringTransfer: (rt) =>
        set((s) => {
          const i = s.recurringTransfers.findIndex((x) => x.id === rt.id)
          return {
            recurringTransfers:
              i === -1
                ? [...s.recurringTransfers, rt]
                : s.recurringTransfers.map((x) => (x.id === rt.id ? rt : x)),
          }
        }),
      deleteRecurringTransfer: (id) =>
        set((s) => ({
          recurringTransfers: s.recurringTransfers.filter((r) => r.id !== id),
        })),
      setTransfersLocked: (v) => set({ transfersLocked: v }),
      toggleDeal: (id) =>
        set((s) => ({
          activatedDealIds: s.activatedDealIds.includes(id)
            ? s.activatedDealIds.filter((x) => x !== id)
            : [...s.activatedDealIds, id],
        })),
      setGeoStatus: (status, asked) =>
        set((s) => ({
          prefs: {
            ...s.prefs,
            geolocation: {
              status,
              asked: asked ?? s.prefs.geolocation.asked,
            },
          },
        })),
      setLastGreeting: (g) =>
        set((s) => ({ prefs: { ...s.prefs, lastGreeting: g } })),
      setGreetingDebug: (d) =>
        set((s) => ({
          prefs: { ...s.prefs, debug: { ...s.prefs.debug, greeting: d } },
        })),
      setSignupId: (id) =>
        set((s) => ({ signup: { ...s.signup, signupId: id } })),
      setSignupPhoneE164: (phone) =>
        set((s) => ({ signup: { ...s.signup, phoneE164: phone } })),
      setVerificationChannel: (c) =>
        set((s) => ({ signup: { ...s.signup, verificationChannel: c } })),
      setVerificationId: (id) =>
        set((s) => ({ signup: { ...s.signup, verificationId: id } })),
      setVerifiedAt: (ts) =>
        set((s) => ({ signup: { ...s.signup, verifiedAt: ts } })),
      setFakeRole: (role) => set((s) => ({ dev: { ...s.dev, fakeRole: role } })),
      setKycSubmissions: (items) => set({ adminKyc: items }),
      updateKycStatus: (id, status, note, by) =>
        set((s) => ({
          adminKyc: s.adminKyc.map((k) =>
            k.id === id
              ? {
                  ...k,
                  status,
                  reviewedAt: new Date().toISOString(),
                  reviewerNote: note ?? k.reviewerNote,
                  history: [
                    ...k.history,
                    {
                      at: new Date().toISOString(),
                      event:
                        status === "approved"
                          ? "Approved"
                          : status === "rejected"
                            ? "Rejected"
                            : status === "in_review"
                              ? "Marked in review"
                              : "Pending",
                      by,
                    },
                  ],
                }
              : k,
          ),
        })),
      setAdminUsers: (items) => set({ adminUsers: items }),
      setAdminSessions: (items) => set({ adminSessions: items }),
      revokeAdminSession: (id) =>
        set((s) => ({
          adminSessions: s.adminSessions.map((sess) =>
            sess.id === id
              ? { ...sess, revokedAt: new Date().toISOString() }
              : sess,
          ),
        })),
      revokeAllSessionsForUser: (userId) =>
        set((s) => ({
          adminSessions: s.adminSessions.map((sess) =>
            sess.userId === userId && !sess.revokedAt
              ? { ...sess, revokedAt: new Date().toISOString() }
              : sess,
          ),
        })),
      setUserRole: (userId, role) =>
        set((s) => ({
          adminUsers: s.adminUsers.map((u) =>
            u.id === userId ? { ...u, role } : u,
          ),
        })),
      setAdminTxns: (items) => set({ adminTxns: items }),
      setTxOverride: (id, override) =>
        set((s) => ({ txOverrides: { ...s.txOverrides, [id]: override } })),
      clearTxOverride: (id) =>
        set((s) => {
          const next = { ...s.txOverrides }
          delete next[id]
          return { txOverrides: next }
        }),
      setSessionUser: (user) =>
        set((s) => ({ session: { ...s.session, user } })),
      setSessionStatus: (status) =>
        set((s) => ({ session: { ...s.session, status } })),
      setSessionId: (id) =>
        set((s) => ({ session: { ...s.session, sessionId: id } })),
      clearSession: () =>
        set({
          session: { user: null, status: "unauthenticated", sessionId: null },
        }),
      setAccountsStatus: (status) =>
        set((s) => ({ data: { ...s.data, accountsStatus: status } })),
      setTransactionsStatus: (status) =>
        set((s) => ({ data: { ...s.data, transactionsStatus: status } })),
      setTransactionsCursor: (c) =>
        set((s) => ({ data: { ...s.data, transactionsCursor: c } })),
      setLastError: (msg) =>
        set((s) => ({ data: { ...s.data, lastError: msg } })),
      bulkShiftTxns: (ids, deltaDays, reason, by) =>
        set((s) => {
          const ms = deltaDays * 86_400_000
          const now = new Date().toISOString()
          const next = { ...s.txOverrides }
          for (const id of ids) {
            const rec = s.adminTxns.find((t) => t.id === id)
            if (!rec) continue
            const current = next[id]
            const baseOccurred = current?.occurredAt ?? rec.occurredAt
            const shifted = new Date(
              new Date(baseOccurred).getTime() + ms,
            ).toISOString()
            next[id] = {
              ...current,
              occurredAt: shifted,
              reason,
              overriddenAt: now,
              overriddenBy: by,
            }
          }
          return { txOverrides: next }
        }),
      resetSignup: () =>
        set({
          signup: {
            signupId: null,
            phoneE164: null,
            verificationChannel: null,
            verificationId: null,
            verifiedAt: null,
          },
        }),
      dismissDemoBanner: () =>
        set((s) => ({ prefs: { ...s.prefs, demoBannerDismissed: true } })),
      setTheme: (theme) =>
        set((s) => ({ prefs: { ...s.prefs, theme } })),
      toggleBalancesVisible: () =>
        set((s) => ({
          prefs: { ...s.prefs, balancesVisible: !s.prefs.balancesVisible },
        })),
      reset: () => set(initialState),
      resetDemo: () => {
        // Clear persistence; the StoreHydrator will re-seed on next mount.
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("nova:store")
          } catch {}
        }
        set(initialState)
        if (typeof window !== "undefined") {
          window.location.reload()
        }
      },
    }),
    {
      name: "nova:store",
      version: 7,
      storage: createJSONStorage(() => localStorage),
      // Never persist the session — access tokens live in module memory
      // and the user object is recovered on boot via /me.
      partialize: (s) => {
        const copy = { ...s } as Partial<State & Actions>
        delete (copy as { session?: unknown }).session
        delete (copy as { data?: unknown }).data
        return copy
      },
      // v0 → v1: signup slice restructured for channel-agnostic verification.
      // v1 → v2: prefs gained `geolocation`, `lastGreeting`, `debug`.
      // v2 → v3: admin slices + dev.fakeRole.
      // v3 → v4: admin transactions + tx overrides.
      migrate: (persisted: unknown, fromVersion: number) => {
        const next =
          persisted && typeof persisted === "object"
            ? (persisted as Record<string, unknown>)
            : {}
        if (fromVersion < 1) {
          next.signup = {
            signupId: null,
            phoneE164: null,
            verificationChannel: null,
            verificationId: null,
            verifiedAt: null,
          }
        }
        if (fromVersion < 2) {
          const prefs =
            (next.prefs && typeof next.prefs === "object"
              ? (next.prefs as Record<string, unknown>)
              : {}) ?? {}
          next.prefs = {
            ...prefs,
            geolocation: { status: "unknown", asked: false },
            lastGreeting: null,
            debug: { greeting: {} },
          }
        }
        if (fromVersion < 3) {
          next.dev = { fakeRole: "customer" }
          next.adminKyc = []
          next.adminUsers = []
          next.adminSessions = []
        }
        if (fromVersion < 4) {
          next.adminTxns = []
          next.txOverrides = {}
        }
        if (fromVersion < 5) {
          const prefs =
            (next.prefs && typeof next.prefs === "object"
              ? (next.prefs as Record<string, unknown>)
              : {}) ?? {}
          next.prefs = { ...prefs, balancesVisible: true }
        }
        if (fromVersion < 6) {
          // Linked accounts are now backend-driven — drop any seeded mock
          // fixtures that earlier versions persisted so the /move/linked
          // page shows only live data.
          next.linkedAccounts = []
        }
        if (fromVersion < 7) {
          // RUB was removed from the display-currency options (replaced by
          // EUR). Reset anyone still holding a now-unsupported code so the
          // picker + conversions don't fall back to an undefined rate.
          if (!isDisplayCurrency(next.displayCurrency)) {
            next.displayCurrency = "USD"
          }
        }
        return next
      },
    },
  ),
)
