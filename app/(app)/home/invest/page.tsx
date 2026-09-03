"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  LineChart,
  Lock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { BRAND_NAME } from "@/lib/brand"

const FUNDS = [
  {
    id: "nova-core",
    name: `${BRAND_NAME} Core`,
    sub: "Broad U.S. equities, low cost",
    ytd: 12.4,
    risk: "Moderate",
    accent: "from-fern/30 to-brand-deep/40",
  },
  {
    id: "nova-income",
    name: `${BRAND_NAME} Income`,
    sub: "Investment-grade bonds + treasuries",
    ytd: 4.2,
    risk: "Low",
    accent: "from-teal-500/30 to-emerald-900/40",
  },
  {
    id: "nova-growth",
    name: `${BRAND_NAME} Growth`,
    sub: "Tilted toward innovation + small caps",
    ytd: 21.8,
    risk: "High",
    accent: "from-amber-500/25 to-orange-900/40",
  },
] as const

const HIGHLIGHTS = [
  {
    Icon: ShieldCheck,
    title: "SEC-registered partner",
    body: `Brokerage services through ${BRAND_NAME} Securities, SIPC-protected up to $500k.`,
  },
  {
    Icon: Sparkles,
    title: "$1 to start",
    body: "Fractional shares, invest the spare change from Round-Ups straight into a fund.",
  },
  {
    Icon: Lock,
    title: "Same login, no new app",
    body: "Your investing account lives next to your Spending, move money in a tap.",
  },
] as const

export default function InvestPage() {
  const router = useRouter()
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-3 pb-10 md:px-6">
      {/* Back row */}
      <button
        type="button"
        onClick={() => router.back()}
        className="view-back"
        aria-label="Back"
      >
        <ArrowLeft aria-hidden />
        Back
      </button>

      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-fern/15 to-brand-deep/40 p-6 ring-1 ring-white/10 md:p-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-ink/85">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-fern text-flush">
              <LineChart className="h-4 w-4" aria-hidden strokeWidth={2.5} />
            </span>
            Investments
          </div>
          <span className="rounded-full bg-fern/20 px-2.5 py-1 text-[11px] font-semibold text-fern ring-1 ring-fern/30">
            Coming soon
          </span>
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink md:text-4xl">
          Put your money to work.
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted md:text-base">
          Auto-invest a slice of every direct deposit, or pick a fund. We keep
          it simple, three diversified options, no jargon, no surprise fees.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-bright"
          >
            Join the waitlist
          </button>
          <Link
            href="/home"
            className="rounded-full bg-white/[0.06] px-4 py-2 text-sm font-semibold text-ink ring-1 ring-white/10 transition hover:bg-white/[0.1]"
          >
            Not now
          </Link>
        </div>
      </section>

      {/* Funds preview */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="font-display text-lg font-bold tracking-tight text-ink">
            Funds at launch
          </h2>
          <span className="text-xs text-ink-muted">YTD return</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {FUNDS.map((f) => (
            <div
              key={f.id}
              className={cn(
                "relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 ring-1 ring-white/10",
                f.accent,
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-ink">{f.name}</div>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-fern/20 px-2 py-0.5 text-[10px] font-semibold text-fern ring-1 ring-fern/25">
                  <ArrowUpRight className="h-3 w-3" aria-hidden />
                  {f.ytd.toFixed(1)}%
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-muted">{f.sub}</p>
              <div className="mt-4 flex items-center justify-between text-[11px] text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" aria-hidden />
                  Risk: {f.risk}
                </span>
                <span className="font-semibold text-fern">Preview →</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 px-1 text-[11px] text-ink-muted">
          Illustrative figures. Past performance is not indicative of future
          results. Investing involves risk, including possible loss of
          principal.
        </p>
      </section>

      {/* Why State Bank Investments */}
      <section className="mt-8">
        <h2 className="mb-3 px-1 font-display text-lg font-bold tracking-tight text-ink">
          Why {BRAND_NAME} Investments
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {HIGHLIGHTS.map(({ Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-fern/15 text-fern ring-1 ring-fern/25">
                <Icon className="h-4 w-4" aria-hidden />
              </div>
              <div className="mt-3 text-sm font-semibold text-ink">
                {title}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Auto-invest CTA */}
      <section className="mt-8 rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-fern/15 text-fern ring-1 ring-fern/25">
            <TrendingUp className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink">Auto-invest</div>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Route a percentage of every direct deposit into the fund of your
              choice. Set it once, we handle the rest.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-6 text-center text-[11px] text-ink-muted">
        Investing services offered by {BRAND_NAME} Securities LLC, member FINRA / SIPC.
      </div>
    </div>
  )
}
