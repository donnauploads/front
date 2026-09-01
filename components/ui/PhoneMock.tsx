"use client"
import { Home, ArrowLeftRight, CreditCard, Star, User } from "lucide-react"
import { BRAND_SHORT } from "@/lib/brand"

export function PhoneMock() {
  return (
    <div className="relative mx-auto w-[140px] [@media(min-width:400px)]:w-[170px] sm:w-[220px] md:w-[312px] lg:w-[360px]">
      {/* Floating cashback badge — overlaps phone top-left like Chime */}
      <div
        className="absolute -left-6 top-8 z-20 rounded-2xl bg-fern px-4 py-3 text-flush shadow-glow sm:-left-10"
      >
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-extrabold leading-none">5%</span>
          <span className="text-[10px] font-bold uppercase leading-tight">
            Cash
            <br />
            Back
          </span>
        </div>
      </div>

      {/* Phone body */}
      <div className="relative aspect-[9/19] rounded-[3rem] border border-white/10 bg-gradient-to-b from-[#0a3d27] to-[#062518] p-3 shadow-card">
        <div className="absolute left-1/2 top-3 z-10 h-6 w-28 -translate-x-1/2 rounded-full bg-black" />
        <div className="h-full w-full overflow-hidden rounded-[2.4rem] bg-gradient-to-b from-[#063a23] to-[#04140c] p-4 pt-8">
          {/* Header */}
          <div className="flex items-center justify-between text-[10px] text-ink-muted">
            <span>9:41</span>
            <span>● ▮▮▮</span>
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-brand">
              <span>{BRAND_SHORT}</span>
              <span className="text-ink-muted">prime</span>
            </div>
            <div className="mt-1 text-[10px] text-ink-muted">Available</div>
            <div className="font-mono text-2xl font-bold text-ink">
              $2,346.91 <span className="text-brand">›</span>
            </div>
            <div className="text-[10px] text-brand/80">$200 SafetyNet ›</div>
          </div>

          {/* Bento grid of cards */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { label: "Savings", val: "$5,821", sub: "3.75% APY" },
              { label: "Cash back", val: "$115.00", sub: "Earning 5%" },
              { label: "MyPay", val: "$375", sub: "Get your pay" },
              { label: "Direct deposit", val: "In 3 days", sub: "ETA" },
              { label: "Credit score", val: "720", sub: "▮▮▮▮▮" },
              { label: "Deals", val: "$100.43", sub: "Saved" },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-xl bg-white/95 p-2 text-ink-dark"
              >
                <div className="text-[8px] font-medium text-ink-dark/60">
                  {c.label}
                </div>
                <div className="font-mono text-[13px] font-bold leading-tight">
                  {c.val}
                </div>
                <div className="text-[7px] text-brand">{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Tab bar */}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-black/30 px-3 py-2 text-ink-muted">
            {[Home, ArrowLeftRight, CreditCard, Star, User].map((I, i) => (
              <I key={i} size={14} />
            ))}
          </div>
        </div>
      </div>

      {/* Floating card behind phone */}
      <div
        className="absolute -right-12 top-1/3 -z-10 h-44 w-72 rotate-[14deg] rounded-2xl bg-gradient-to-br from-[#d4dac8] to-[#a8b59a] p-4 shadow-card"
      >
        <div className="flex h-full flex-col justify-between">
          <div className="text-sm font-bold lowercase text-bg-deep">{BRAND_SHORT}</div>
          <div className="space-y-2">
            <div className="font-mono text-[10px] tracking-widest text-bg-deep/70">
              •••• •••• •••• 4127
            </div>
            <div className="flex items-end justify-between">
              <div className="text-xs italic font-semibold text-bg-deep">
                VISA
              </div>
              <div className="text-[9px] text-bg-deep/60">Signature</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
