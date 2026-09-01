"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Account, Transaction } from "@/lib/store"
import { type DisplayCurrency, convertFromBase, currencyDecimals } from "@/lib/currency"

/**
 * Accounts view — the dedicated "Your accounts" screen reached from the
 * sidebar's Accounts entry. Lists every State Bank account
 * with its balance + actions, then the current account's recent activity
 * as a date/merchant/amount table. Reads from the zustand store so it
 * reflects real transfers, payments, and deposits.
 */

// Amounts are stored in USD; convert to the user's display currency.
function formatBalance(amountBase: number, currency: DisplayCurrency = "USD"): { whole: string; dec: string } {
  const dp = currencyDecimals(currency)
  const [whole, dec] = convertFromBase(amountBase, currency).toFixed(dp).split(".")
  return { whole: whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ","), dec: dec ? `.${dec}` : "" }
}

/** Number only — thousands separators, display-currency decimals, no code. */
function formatNum(amount: number, currency: DisplayCurrency = "USD"): string {
  const dp = currencyDecimals(currency)
  return Math.abs(convertFromBase(amount, currency)).toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  })
}

function accountTypeLabel(t: Account["type"]): string {
  switch (t) {
    case "checking": return "Everyday Current Account"
    case "savings": return "Savings Account"
    case "credit_builder": return "Credit Card"
    case "mypay": return "MyPay Account"
  }
}

/** "1 Jun 2026" */
function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

/** "10:38:21" (24h). Seed timestamps land on :00 seconds — derive a stable
 *  second from the id so the column reads naturally; real posted txns keep
 *  their actual seconds. */
function fmtTime(iso: string, id: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  let s = d.getSeconds()
  if (s === 0) {
    let h = 0
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0x7fffffff
    s = h % 60
  }
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(s)}`
}

export default function AccountsPage() {
  const accounts = useStore((s) => s.accounts)
  const transactions = useStore((s) => s.transactions)
  const currency = useStore((s) => s.displayCurrency)

  const primary = useMemo(
    () => accounts.find((a) => a.type === "checking") ?? accounts[0],
    [accounts],
  )

  const primaryTxns = useMemo(() => {
    if (!primary) return []
    return transactions.filter((t) => t.accountId === primary.id).slice(0, 20)
  }, [transactions, primary])

  return (
    <>
      <div className="page-head">
        <h2>Your accounts</h2>
        <p className="ph-sub">
          All your State Bank accounts and balances in one place.
        </p>
      </div>

      <div className="acct-grid">
        {accounts.length === 0 ? (
          <p style={{ color: "var(--ink-mute)" }}>No accounts yet.</p>
        ) : (
          accounts.map((a) => <AccountCard key={a.id} account={a} currency={currency} />)
        )}
      </div>

      {primary && (
        <div className="ra-card">
          <div className="ra-head">
            <h3>Current Account, recent activity</h3>
            <Link className="ra-all" href="/home/spending">
              All <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="ra-colhead" role="row">
            <span>Date</span>
            <span>Description</span>
            <span className="ra-h-amt">Amount</span>
          </div>
          {primaryTxns.length === 0 ? (
            <div className="ra-empty">No recent activity on this account.</div>
          ) : (
            primaryTxns.map((t) => <ActivityRow key={t.id} txn={t} currency={currency} />)
          )}
        </div>
      )}
    </>
  )
}

function AccountCard({ account, currency }: { account: Account; currency: DisplayCurrency }) {
  const isCredit = account.type === "credit_builder"
  const isSavings = account.type === "savings"
  const bal = formatBalance(Math.abs(account.balance), currency)
  const meta =
    account.apy != null && !isCredit
      ? `Earning ${account.apy}% APY`
      : isCredit
        ? "Available credit"
        : "Available · no overdraft used"

  return (
    <div className="acct">
      <div className="acct-top">
        <div>
          <div className="acct-type">{account.label || accountTypeLabel(account.type)}</div>
          <div className="acct-no">···· ···· ····</div>
        </div>
        <span className="acct-chip" aria-hidden>
          {isCredit ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
          ) : isSavings ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 14l4-4 3 3 5-6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="6" width="18" height="13" rx="2" />
              <path d="M3 10h18" />
            </svg>
          )}
        </span>
      </div>
      <div className={cn("acct-bal", isCredit && account.balance < 0 && "neg")}>
        <span className="cur">{currency}</span>
        {bal.whole}{bal.dec}
      </div>
      <div className="acct-meta">{meta}</div>
      <div className="acct-actions">
        <Link href="/home/spending">View activity</Link>
        <Link href={isCredit ? "/home/spending/card" : "/move/transfer"}>
          {isCredit ? "Manage card" : isSavings ? "Top up →" : "Transfer →"}
        </Link>
      </div>
    </div>
  )
}

function ActivityRow({ txn, currency }: { txn: Transaction; currency: DisplayCurrency }) {
  const incoming = txn.amount > 0
  const name =
    txn.description || txn.merchant || txn.counterpartyName || "Transaction"

  return (
    <div className="ra-row" role="row">
      <div>
        <div className="ra-date">{fmtDate(txn.date)}</div>
        <div className="ra-time">{fmtTime(txn.date, txn.id)}</div>
      </div>
      <div className="ra-name">
        {name}
        {txn.status === "pending" && <span className="ra-pend">Pending</span>}
      </div>
      <div className={cn("ra-amt", incoming && "pos")}>
        {incoming ? "+" : "−"}
        {formatNum(txn.amount, currency)}
      </div>
    </div>
  )
}
