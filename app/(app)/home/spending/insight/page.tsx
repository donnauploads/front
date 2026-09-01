"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  PieChart,
  Pie,
  Tooltip,
  Legend,
} from "recharts"
import {
  format,
  subMonths,
  isSameMonth,
} from "date-fns"
import { useStore } from "@/lib/store"
import { formatMoney } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { applyOverridesToFeed } from "@/lib/admin/applyOverridesToFeed"
import {
  getCategoryInsights,
  getMonthlyInsights,
  type CategoryTotals,
  type MonthlyTotals,
} from "@/lib/insights/api/insights.real"
import { useMocks as USE_MOCKS } from "@/lib/dev/use-mocks-flag"

/** Category palette — tuned to the design's charcoal/mustard set so the
 *  donut + legend dots blend with the new shell. Falls back to a neutral
 *  bronze for unknown categories. */
const CATEGORY_COLORS: Record<string, string> = {
  Groceries: "#C9A24A", // gold
  Dining: "#2B2926", // navy
  Utilities: "#3D3934", // charcoal hover
  Subscriptions: "#A8884A", // bronze
  Transport: "#2F8A5B", // green
  Housing: "#B23A3A", // red
  Shopping: "#DCC07E", // gold-soft
  Income: "#2F8A5B",
  Transfer: "#756F66", // ink-mute
}
const DEFAULT_COLOR = "#97793A"

export default function InsightPage() {
  const router = useRouter()
  const rawTxns = useStore((s) => s.transactions)
  const overrides = useStore((s) => s.txOverrides)
  const currency = useStore((s) => s.displayCurrency)
  const txns = useMemo(
    () => applyOverridesToFeed(rawTxns, overrides),
    [rawTxns, overrides],
  )

  // 6 most recent months including current
  const months = useMemo(() => {
    const list: Date[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) list.push(subMonths(now, i))
    return list
  }, [])

  const [selectedMonth, setSelectedMonth] = useState<Date>(
    months[months.length - 1],
  )

  // Backend insights cache. `null` = haven't fetched yet (mocks mode
  // never populates these; we fall back to client-side aggregation).
  const [serverMonthly, setServerMonthly] = useState<MonthlyTotals[] | null>(
    null,
  )
  const [serverCategory, setServerCategory] = useState<
    CategoryTotals[] | null
  >(null)
  const [loading, setLoading] = useState(!USE_MOCKS)
  const [errored, setErrored] = useState(false)

  // Pull the monthly series once on mount. The server uses a materialised
  // view so 6 months of data is one cheap query.
  useEffect(() => {
    if (USE_MOCKS) return
    let cancelled = false
    setLoading(true)
    setErrored(false)
    getMonthlyInsights({ months: 6 })
      .then((rows) => {
        if (!cancelled) setServerMonthly(rows)
      })
      .catch(() => {
        if (!cancelled) setErrored(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Category breakdown refreshes whenever the selected month changes.
  useEffect(() => {
    if (USE_MOCKS) return
    let cancelled = false
    setServerCategory(null)
    // Anchor the month boundary to UTC. `startOfMonth` returns LOCAL
    // midnight, and `.toISOString()` then shifts it by the browser's TZ
    // offset — e.g. in UTC+3 (Bahrain) "July" becomes 2026-06-30T21:00Z,
    // which no longer matches the server's month bucket and the donut comes
    // back empty. Build the first-of-month at UTC midnight instead.
    getCategoryInsights({ monthStart: utcMonthStart(selectedMonth) })
      .then((rows) => {
        if (!cancelled) setServerCategory(rows)
      })
      .catch(() => {
        /* non-fatal — fall back to client aggregation */
      })
    return () => {
      cancelled = true
    }
  }, [selectedMonth])

  // Bar chart: money in vs out per month.
  // Real mode → server's materialised view (sees every settled txn).
  // Mocks mode → client-side aggregation over the in-memory feed.
  const monthlyData = useMemo(() => {
    if (!USE_MOCKS && serverMonthly) {
      // Map server rows by yearMonth so the 6 placeholder months line up
      // regardless of whether the server returned 6 rows or fewer.
      const byKey = new Map(
        serverMonthly.map((r) => [r.yearMonth, r] as const),
      )
      return months.map((m) => {
        const key = format(m, "yyyy-MM")
        const row = byKey.get(key)
        const income = row ? Number(BigInt(row.totalInCents)) / 100 : 0
        const spent = row ? Number(BigInt(row.totalOutCents)) / 100 : 0
        return {
          month: format(m, "MMM"),
          date: m,
          Income: +income.toFixed(2),
          Spent: +spent.toFixed(2),
        }
      })
    }
    return months.map((m) => {
      let income = 0
      let spent = 0
      for (const t of txns) {
        if (isSameMonth(new Date(t.date), m)) {
          if (t.amount >= 0) income += t.amount
          else spent += Math.abs(t.amount)
        }
      }
      return {
        month: format(m, "MMM"),
        date: m,
        Income: +income.toFixed(2),
        Spent: +spent.toFixed(2),
      }
    })
  }, [txns, months, serverMonthly])

  // Donut chart: outflow by category for selected month.
  const categoryData = useMemo(() => {
    if (!USE_MOCKS && serverCategory) {
      return serverCategory
        .map((r) => ({
          name: capitalize(r.category),
          value: +(Number(BigInt(r.totalSpentCents)) / 100).toFixed(2),
        }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
    }
    const sums = new Map<string, number>()
    for (const t of txns) {
      if (!isSameMonth(new Date(t.date), selectedMonth)) continue
      if (t.amount >= 0) continue
      const cat = t.category ?? "Other"
      sums.set(cat, (sums.get(cat) ?? 0) + Math.abs(t.amount))
    }
    return [...sums.entries()]
      .map(([name, value]) => ({ name, value: +value.toFixed(2) }))
      .sort((a, b) => b.value - a.value)
  }, [txns, selectedMonth, serverCategory])

  const isEmpty =
    !loading && monthlyData.every((d) => d.Income === 0 && d.Spent === 0)

  const categoryTotal = categoryData.reduce((s, d) => s + d.value, 0)
  const maxCat = categoryData.reduce((m, d) => Math.max(m, d.value), 0) || 1
  const monthLabel = format(selectedMonth, "MMM yyyy")

  return (
    <>
      <button
        type="button"
        onClick={() => router.back()}
        className="view-back"
        aria-label="Back"
      >
        <ArrowLeft aria-hidden /> Back
      </button>

      <div className="page-head">
        <h2>Spending insights</h2>
        <p className="ph-sub">
          Money in versus out across recent months, plus a breakdown of
          your outflows by category.
        </p>
      </div>

      {/* Month chips inside a panel header so they share the design's
          .chips look + sit flush against the panel below. */}
      <div className="panel">
        <div className="chips" role="tablist" aria-label="Pick month">
          {months.map((m) => {
            const active = isSameMonth(m, selectedMonth)
            return (
              <button
                key={m.toISOString()}
                type="button"
                role="tab"
                aria-selected={active}
                className={cn("chip", active && "active")}
                onClick={() => setSelectedMonth(m)}
              >
                {format(m, "MMM yyyy")}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="insight-loading">
            <Loader2 className="animate-spin" aria-hidden />
            Crunching numbers…
          </div>
        ) : errored && !serverMonthly ? (
          <div className="insight-error">
            <span className="icon" aria-hidden>!</span>
            <h3>Insights are unavailable</h3>
            <p style={{ marginTop: 6, fontSize: 13 }}>
              We couldn&apos;t reach the analytics service. Try again in a
              moment.
            </p>
          </div>
        ) : isEmpty ? (
          <div className="insight-empty">
            <span className="icon" aria-hidden>📈</span>
            <h3>Nothing to chart yet</h3>
            <p style={{ marginTop: 6, fontSize: 13 }}>
              Insights will populate once your transactions roll in.
            </p>
          </div>
        ) : (
          <div className="panel-body">
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                margin: "8px 0 12px",
              }}
            >
              Income vs spending
            </div>
            <div className="insight-chart">
              <ResponsiveContainer>
                <BarChart
                  data={monthlyData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  barCategoryGap={16}
                >
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    stroke="#756F66"
                    style={{ fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "rgba(43,41,38,0.05)" }}
                    contentStyle={{
                      background: "#FFFFFF",
                      border: "1px solid #E2DDD0",
                      borderRadius: 6,
                      fontSize: 12,
                      color: "#211F1B",
                    }}
                    formatter={(v: number) => formatMoney(v, currency)}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: 11,
                      paddingTop: 8,
                      color: "#514D45",
                    }}
                    iconType="circle"
                  />
                  <Bar dataKey="Income" fill="#2F8A5B" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Spent" fill="#C9A24A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {!loading && !errored && !isEmpty && (
        <div className="panel">
          <div className="panel-head">
            <h3>Spending by category</h3>
            <span style={{ fontSize: 13, color: "var(--ink-mute)", fontWeight: 600 }}>
              {monthLabel}
            </span>
          </div>
          <div className="panel-body">
            {categoryData.length === 0 ? (
              <div
                style={{
                  padding: "40px 0",
                  textAlign: "center",
                  color: "var(--ink-mute)",
                  fontSize: 14,
                }}
              >
                No spending recorded in this month.
              </div>
            ) : (
              <div className="insight-section">
                {/* Donut */}
                <div className="insight-chart" style={{ height: 200 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={84}
                        stroke="transparent"
                        paddingAngle={2}
                      >
                        {categoryData.map((d) => (
                          <Cell
                            key={d.name}
                            fill={CATEGORY_COLORS[d.name] ?? DEFAULT_COLOR}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#FFFFFF",
                          border: "1px solid #E2DDD0",
                          borderRadius: 6,
                          fontSize: 12,
                          color: "#211F1B",
                        }}
                        formatter={(v: number) => formatMoney(v, currency)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Category bars */}
                <div className="cat-list">
                  {categoryData.map((d) => {
                    const color = CATEGORY_COLORS[d.name] ?? DEFAULT_COLOR
                    const pct = Math.max(2, (d.value / maxCat) * 100)
                    return (
                      <div className="cat" key={d.name}>
                        <span className="cat-name">
                          <span
                            className="cat-dot"
                            style={{ background: color }}
                          />
                          {d.name}
                        </span>
                        <span className="cat-amt">
                          {formatMoney(d.value, currency)}
                        </span>
                        <div className="cat-track">
                          <span
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {categoryTotal > 0 && (
              <div
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: "1px solid var(--line)",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "var(--ink-mute)", fontWeight: 600 }}>
                  Total spent
                </span>
                <span
                  style={{
                    color: "var(--text-strong)",
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatMoney(categoryTotal, currency)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)
}

/** First-of-month at UTC midnight, using the LOCAL calendar month of `d`.
 *  Keeps the month identifier stable across timezones so it matches the
 *  server's `date_trunc('month', occurredAt)` bucket regardless of the
 *  viewer's offset. */
function utcMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1))
}
