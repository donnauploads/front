"use client"

import { useMemo, useState } from "react"
import { Landmark } from "lucide-react"
import type { useToast } from "@/components/providers/ToastProvider"
import { AuthorizeTransfer } from "@/components/security/AuthorizeTransfer"
import {
  withdrawBond,
  type Bond,
  type BondWithdrawPayload,
} from "@/lib/bonds/api/bonds.real"
import type { RealLinkedAccountDto } from "@/lib/move/api/link-auth.real"

/** Supported crypto assets + their networks for a bond payout. */
const CRYPTO_ASSETS: { asset: string; label: string; networks: string[] }[] = [
  { asset: "BTC", label: "Bitcoin (BTC)", networks: ["Bitcoin"] },
  { asset: "ETH", label: "Ethereum (ETH)", networks: ["ERC20 (Ethereum)"] },
  {
    asset: "USDT",
    label: "Tether (USDT)",
    networks: ["TRC20 (Tron)", "ERC20 (Ethereum)", "BEP20 (BSC)"],
  },
  {
    asset: "USDC",
    label: "USD Coin (USDC)",
    networks: ["ERC20 (Ethereum)", "SOL (Solana)"],
  },
]

const CRYPTO_LABEL: React.CSSProperties = {
  display: "grid",
  gap: 4,
  fontSize: 12,
  fontWeight: 600,
  color: "var(--ink-mute)",
}

type ToastFn = ReturnType<typeof useToast>["toast"]

/**
 * "Withdraw bond" flow: pick a destination (own account / linked bank /
 * crypto wallet), then PIN-authorize. Shared by the bonds list and the
 * per-bond detail page.
 */
export function WithdrawBondModal({
  bond,
  accounts,
  linked,
  onClose,
  onDone,
  toast,
}: {
  bond: Bond
  accounts: { id: string; type: string; label: string }[]
  linked: RealLinkedAccountDto[]
  onClose: () => void
  onDone: () => void
  toast: ToastFn
}) {
  // selection key: "acct:<id>" | "linked:<id>" | "crypto"
  const [sel, setSel] = useState<string>(
    accounts[0] ? `acct:${accounts[0].id}` : linked[0] ? `linked:${linked[0].id}` : "crypto",
  )
  const [wallet, setWallet] = useState("")
  const [asset, setAsset] = useState(CRYPTO_ASSETS[0].asset)
  const [network, setNetwork] = useState(CRYPTO_ASSETS[0].networks[0])
  const [authorizing, setAuthorizing] = useState(false)

  const networks = useMemo(
    () => CRYPTO_ASSETS.find((a) => a.asset === asset)?.networks ?? [],
    [asset],
  )

  const principal = Number(BigInt(bond.principalCents)) / 100
  const amountLabel = `$${principal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`

  const payload = useMemo<BondWithdrawPayload | null>(() => {
    if (sel.startsWith("acct:")) return { destination: "internal", toAccountId: sel.slice(5) }
    if (sel.startsWith("linked:")) return { destination: "external", linkedAccountId: sel.slice(7) }
    if (sel === "crypto") {
      const addr = wallet.trim()
      if (addr.length < 12) return null
      return { destination: "crypto", walletAddress: addr, asset, network }
    }
    return null
  }, [sel, wallet, asset, network])

  async function doWithdraw(token: string) {
    if (!payload) throw new Error("Choose a destination")
    await withdrawBond(bond.id, payload, token)
    toast("Withdrawal submitted — pending admin review.", { variant: "success" })
    onDone()
  }

  return (
    <>
      <div className="modal-scrim" role="dialog" aria-modal="true" aria-label="Withdraw bond">
        <button className="modal-scrim-btn" aria-label="Close" onClick={onClose} />
        <div className="modal-card">
          <div className="modal-grip" />
          <div className="modal-head">
            <div className="mh-l">
              <span className="modal-ic" aria-hidden>
                <Landmark aria-hidden />
              </span>
              <div>
                <div className="modal-title">Withdraw {amountLabel}</div>
                <p className="modal-sub">Choose where the funds should go.</p>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {accounts.map((a) => (
              <DestRow
                key={a.id}
                selected={sel === `acct:${a.id}`}
                onSelect={() => setSel(`acct:${a.id}`)}
                title={a.label || (a.type === "savings" ? "Savings" : "Checking")}
                subtitle={a.type === "savings" ? "Savings account" : "Checking account"}
              />
            ))}
            {linked.map((l) => (
              <DestRow
                key={l.id}
                selected={sel === `linked:${l.id}`}
                onSelect={() => setSel(`linked:${l.id}`)}
                title={l.institutionName}
                subtitle={`External • ••••${l.mask}`}
              />
            ))}
            <DestRow
              selected={sel === "crypto"}
              onSelect={() => setSel("crypto")}
              title="Crypto wallet"
              subtitle="Send to a wallet address"
            />
            {sel === "crypto" && (
              <div style={{ display: "grid", gap: 8, padding: "2px 2px 0" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <label style={CRYPTO_LABEL}>
                    Coin
                    <select
                      value={asset}
                      onChange={(e) => {
                        const a = e.target.value
                        setAsset(a)
                        const first = CRYPTO_ASSETS.find((x) => x.asset === a)?.networks[0]
                        if (first) setNetwork(first)
                      }}
                      className="docs-input"
                      style={{ width: "100%", boxSizing: "border-box" }}
                    >
                      {CRYPTO_ASSETS.map((a) => (
                        <option key={a.asset} value={a.asset}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={CRYPTO_LABEL}>
                    Network
                    <select
                      value={network}
                      onChange={(e) => setNetwork(e.target.value)}
                      className="docs-input"
                      style={{ width: "100%", boxSizing: "border-box" }}
                    >
                      {networks.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <input
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  placeholder={`${asset} wallet address`}
                  spellCheck={false}
                  className="docs-input mono-num"
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>
            )}
          </div>

          <button
            type="button"
            className="lk-cta-btn primary"
            style={{ marginTop: 16, width: "100%", opacity: payload ? 1 : 0.5 }}
            disabled={!payload}
            onClick={() => setAuthorizing(true)}
          >
            Continue
          </button>
        </div>
      </div>

      <AuthorizeTransfer
        open={authorizing}
        amountLabel={amountLabel}
        processingLabel="Submitting…"
        processingSubLabel="Sending for admin review"
        successLabel="Submitted"
        successSubLabel="Pending admin review"
        onCancel={() => setAuthorizing(false)}
        onAuthorized={(token) => doWithdraw(token)}
      />
    </>
  )
}

function DestRow({
  selected,
  onSelect,
  title,
  subtitle,
}: {
  selected: boolean
  onSelect: () => void
  title: string
  subtitle: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        width: "100%",
        textAlign: "left",
        padding: "11px 13px",
        borderRadius: 12,
        border: `1.5px solid ${selected ? "var(--gold, #c9a24a)" : "var(--line)"}`,
        background: selected ? "var(--gold-tint, rgba(201,162,74,0.10))" : "var(--surface-2)",
        cursor: "pointer",
      }}
    >
      <span>
        <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--text-strong)" }}>
          {title}
        </span>
        <span style={{ display: "block", fontSize: 12, color: "var(--ink-mute)" }}>{subtitle}</span>
      </span>
      <span
        aria-hidden
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          flexShrink: 0,
          border: `2px solid ${selected ? "var(--gold, #c9a24a)" : "var(--line)"}`,
          background: selected ? "var(--gold, #c9a24a)" : "transparent",
        }}
      />
    </button>
  )
}
