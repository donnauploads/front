"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, FileText, Loader2, Sparkles } from "lucide-react"
import { ProfileSubPage } from "@/components/profile/ProfileSubPage"
import { listAccounts } from "@/lib/accounts/api/accounts"
import type { Account } from "@/lib/store"
import {
  downloadCustomStatement,
  downloadFromUrl,
  downloadPolicyPdf,
  getStatementUrl,
  getTaxFormUrl,
  listPolicies,
  listStatements,
  listTaxForms,
  triggerBlobDownload,
  type PolicyListItem,
  type StatementListItem,
  type TaxFormListItem,
} from "@/lib/profile/api/documents.real"

// ─── Helpers ──────────────────────────────────────────────────────────────

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function fmtDateShort(iso: string): string {
  const d = new Date(iso)
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}
function fmtPeriodLabel(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)
  // Most statements are a single month → "April 2026 Statement".
  if (
    start.getUTCDate() === 1 &&
    start.getUTCFullYear() === end.getUTCFullYear() &&
    end.getUTCMonth() === start.getUTCMonth()
  ) {
    return `${MONTHS_LONG[start.getUTCMonth()]} ${start.getUTCFullYear()} Statement`
  }
  return `${fmtDateShort(startIso)} – ${fmtDateShort(endIso)}`
}

function todayIso(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10)
}
function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10)
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  return (
    <ProfileSubPage
      title="Documents"
      subtitle="Statements, tax forms, and policies."
    >
      <CustomStatementCard />
      <StatementsSection />
      <TaxFormsSection />
      <PoliciesSection />
    </ProfileSubPage>
  )
}

// ─── Custom statement (period picker) ─────────────────────────────────────

function CustomStatementCard() {
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [accountId, setAccountId] = useState<string>("")
  const [from, setFrom] = useState<string>(isoDaysAgo(30))
  const [to, setTo] = useState<string>(todayIso())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listAccounts()
      .then((rows) => {
        if (cancelled) return
        setAccounts(rows)
        if (rows[0] && !accountId) setAccountId(rows[0].id)
      })
      .catch(() => {
        if (!cancelled) setAccounts([])
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canSubmit = !!accountId && !!from && !!to && from <= to && !busy

  async function onDownload() {
    if (!canSubmit) return
    setBusy(true)
    setErr(null)
    try {
      const { blob, filename } = await downloadCustomStatement({
        accountId,
        periodStart: from,
        periodEnd: to,
      })
      triggerBlobDownload(blob, filename)
    } catch (e) {
      setErr((e as Error).message || "Couldn't generate statement.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h3
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "rgba(201,162,74,.16)",
              color: "var(--gold-deep)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-hidden
          >
            <Sparkles width={16} height={16} />
          </span>
          Statement for a custom period
        </h3>
      </div>
      <div className="panel-body">
        <p
          style={{
            fontSize: 13.5,
            color: "var(--ink-mute)",
            margin: "0 0 16px",
            lineHeight: 1.45,
          }}
        >
          Generate a PDF for any date range. Posted transactions only.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          <Field label="Account">
            {accounts == null ? (
              <div
                style={{
                  height: 40,
                  borderRadius: 8,
                  background: "var(--paper)",
                  animation: "xferStepIn 1.2s ease infinite alternate",
                }}
              />
            ) : (
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="docs-input"
              >
                {accounts.length === 0 ? (
                  <option value="">No accounts</option>
                ) : (
                  accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))
                )}
              </select>
            )}
          </Field>

          <Field label="From">
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="docs-input"
            />
          </Field>

          <Field label="To">
            <input
              type="date"
              value={to}
              min={from}
              max={todayIso()}
              onChange={(e) => setTo(e.target.value)}
              className="docs-input"
            />
          </Field>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
          }}
        >
          <Presets onPick={(f, t) => { setFrom(f); setTo(t) }} />
          <button
            type="button"
            disabled={!canSubmit}
            onClick={onDownload}
            className="lk-cta-btn primary"
            style={{ width: "auto", padding: "12px 22px", fontSize: 14 }}
          >
            {busy ? (
              <Loader2 className="animate-spin" width={16} height={16} aria-hidden />
            ) : (
              <Download width={16} height={16} aria-hidden />
            )}
            {busy ? "Generating…" : "Download PDF"}
          </button>
        </div>

        {err && (
          <div
            className="card-error"
            role="alert"
            style={{ marginTop: 14, marginBottom: 0 }}
          >
            {err}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          marginBottom: 6,
          paddingLeft: 2,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: ".14em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

function Presets({ onPick }: { onPick: (from: string, to: string) => void }) {
  const presets: { label: string; from: () => string; to: () => string }[] = [
    { label: "Last 30 days", from: () => isoDaysAgo(30), to: todayIso },
    { label: "Last 90 days", from: () => isoDaysAgo(90), to: todayIso },
    {
      label: "Year to date",
      from: () =>
        new Date(Date.UTC(new Date().getFullYear(), 0, 1)).toISOString().slice(0, 10),
      to: todayIso,
    },
  ]
  return (
    // 3-column grid so the three presets always fit on a single row,
    // each pill taking equal width — the previous flex-wrap layout
    // pushed "Year to date" onto its own line on narrow modals.
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 8,
      }}
    >
      {presets.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => onPick(p.from(), p.to())}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: 38,
            padding: "0 10px",
            border: "1px solid var(--line)",
            borderRadius: 10,
            background: "#FFFFFF",
            color: "var(--text-strong)",
            fontFamily: "inherit",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            transition: "background .15s ease, border-color .15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--paper)"
            e.currentTarget.style.borderColor = "var(--ink-mute)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#FFFFFF"
            e.currentTarget.style.borderColor = "var(--line)"
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

// ─── Statements ───────────────────────────────────────────────────────────

function StatementsSection() {
  const [items, setItems] = useState<StatementListItem[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listStatements()
      .then((rows) => !cancelled && setItems(rows))
      .catch((e) => !cancelled && setErr((e as Error).message || "Couldn't load statements."))
    return () => {
      cancelled = true
    }
  }, [])

  const rows = useMemo(
    () =>
      (items ?? []).map((s) => ({
        id: s.id,
        title: fmtPeriodLabel(s.periodStart, s.periodEnd),
        date: fmtDateShort(s.generatedAt),
        accountLabel: s.accountLabel,
      })),
    [items],
  )

  return (
    <GroupShell title="Statements" loading={items == null} error={err} empty={rows.length === 0}>
      {rows.map((it) => (
        <Row
          key={it.id}
          title={it.title}
          subtitle={`${it.accountLabel} · ${it.date}`}
          onClick={() => downloadStatement(it.id, it.title)}
        />
      ))}
    </GroupShell>
  )
}

async function downloadStatement(id: string, title: string) {
  try {
    const { url } = await getStatementUrl(id)
    await downloadFromUrl(url, `State Bank-${title}.pdf`)
  } catch (e) {
    alert((e as Error).message || "Couldn't download statement.")
  }
}

// ─── Tax forms ────────────────────────────────────────────────────────────

function TaxFormsSection() {
  const [items, setItems] = useState<TaxFormListItem[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listTaxForms()
      .then((rows) => !cancelled && setItems(rows))
      .catch((e) => !cancelled && setErr((e as Error).message || "Couldn't load tax forms."))
    return () => {
      cancelled = true
    }
  }, [])

  const rows = useMemo(
    () =>
      (items ?? []).map((t) => ({
        id: t.id,
        title: `${t.formType} (${t.taxYear})`,
        subtitle: fmtDateShort(t.generatedAt),
      })),
    [items],
  )

  return (
    <GroupShell title="Tax forms" loading={items == null} error={err} empty={rows.length === 0}>
      {rows.map((it) => (
        <Row
          key={it.id}
          title={it.title}
          subtitle={it.subtitle}
          onClick={() => downloadTaxForm(it.id, it.title)}
        />
      ))}
    </GroupShell>
  )
}

async function downloadTaxForm(id: string, title: string) {
  try {
    const { url } = await getTaxFormUrl(id)
    await downloadFromUrl(url, `State Bank-${title}.pdf`)
  } catch (e) {
    alert((e as Error).message || "Couldn't download tax form.")
  }
}

async function downloadPolicy(slug: string) {
  try {
    const { blob, filename } = await downloadPolicyPdf(slug)
    triggerBlobDownload(blob, filename)
  } catch (e) {
    alert((e as Error).message || "Couldn't download policy.")
  }
}

// ─── Policies ─────────────────────────────────────────────────────────────

function PoliciesSection() {
  const [items, setItems] = useState<PolicyListItem[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listPolicies()
      .then((rows) => !cancelled && setItems(rows))
      .catch((e) => !cancelled && setErr((e as Error).message || "Couldn't load policies."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <GroupShell title="Policies" loading={items == null} error={err} empty={!items?.length}>
      {(items ?? []).map((p) => (
        <Row
          key={p.slug}
          title={p.title}
          subtitle={`v${p.version} · Effective ${fmtDateShort(p.effectiveAt)}`}
          onClick={() => downloadPolicy(p.slug)}
        />
      ))}
    </GroupShell>
  )
}

// ─── Shared shell + row ───────────────────────────────────────────────────

function GroupShell({
  title,
  loading,
  error,
  empty,
  children,
}: {
  title: string
  loading: boolean
  error: string | null
  empty: boolean
  children: React.ReactNode
}) {
  return (
    <>
      <div className="pf-group">{title}</div>
      {loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: 30,
            color: "var(--ink-mute)",
            fontSize: 14,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 5,
          }}
        >
          <Loader2 className="animate-spin" width={16} height={16} aria-hidden />
          Loading…
        </div>
      ) : error ? (
        <div className="card-error" role="alert">
          {error}
        </div>
      ) : empty ? (
        <div className="linked-empty">
          <FileText aria-hidden />
          <p style={{ fontWeight: 600, color: "var(--text-strong)", margin: 0 }}>
            Nothing here yet
          </p>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-body">{children}</div>
        </div>
      )}
    </>
  )
}

function Row({
  title,
  subtitle,
  onClick,
  href,
}: {
  title: string
  subtitle?: string
  onClick?: () => void | Promise<void>
  href?: string
}) {
  const inner = (
    <>
      <span className="doc-ic">
        <FileText strokeWidth={1.9} aria-hidden />
      </span>
      <span className="doc-body">
        <span className="doc-title">{title}</span>
        {subtitle && <span className="doc-sub">{subtitle}</span>}
      </span>
      <span className="doc-dl" aria-hidden>
        <Download aria-hidden />
      </span>
    </>
  )
  if (href) {
    return (
      <a href={href} className="doc-row">
        {inner}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className="doc-row">
      {inner}
    </button>
  )
}
