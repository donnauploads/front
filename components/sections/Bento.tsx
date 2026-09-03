"use client"
import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, CreditCard, TrendingUp, PiggyBank, Clock, Headphones, Wallet } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { BRAND_NAME } from "@/lib/brand"

type Card = {
  id: string
  Icon: typeof Wallet
  title: string
  bullets: string[]
  image: string
  visual: () => JSX.Element
}

const cards: Card[] = [
  {
    id: "fees",
    Icon: Wallet,
    title: "Fee-Free Banking",
    bullets: [
      "Fee-free banking with no minimum balance.",
      "60K+ fee-free ATMs nationwide.",
      "SafetyNet covers up to $200 in overdraft, fee-free.",
    ],
    image: "/b5.jpg",
    visual: FeeVisual,
  },
  {
    id: "cashback",
    Icon: CreditCard,
    title: "5% Cash Back",
    bullets: [
      `5% cash back with ${BRAND_NAME} Prime, or 2% with ${BRAND_NAME} Plus.`,
      "Pick a bonus category, gas, groceries, utilities.",
      `Earn on every tap with the ${BRAND_NAME} Card.`,
    ],
    image: "/b2.jpg",
    visual: CashbackVisual,
  },
  {
    id: "credit",
    Icon: TrendingUp,
    title: "Grow Credit",
    bullets: [
      "No credit check required to start building.",
      "No interest, no annual fee, no security deposit.",
      "Average member sees a 70-point lift in year one.",
    ],
    image: "/b4.jpg",
    visual: CreditVisual,
  },
  {
    id: "savings",
    Icon: PiggyBank,
    title: "Easy Savings",
    bullets: [
      "Up to 3.75% APY on every Savings dollar.",
      "Round-ups quietly grow your stash on autopilot.",
      "Set named goals and track progress in real time.",
    ],
    image: "/b3.jpg",
    visual: SavingsVisual,
  },
  {
    id: "payday",
    Icon: Clock,
    title: "Early Payday",
    bullets: [
      "Access up to $500 of your paycheck early when you ask.",
      "Direct deposit lands up to two days sooner.",
      "No mandatory fees and no interest.",
    ],
    image: "/b1.jpg",
    visual: PaydayVisual,
  },
  {
    id: "support",
    Icon: Headphones,
    title: "24/7 Support",
    bullets: [
      "Real-time alerts on every transaction.",
      "Talk to a real human, any hour, any day.",
      "Protected by Visa's Zero Liability Policy.",
    ],
    image: "/b2.jpg",
    visual: SupportVisual,
  },
]

export function Bento() {
  return (
    <section className="relative">
      {/* Mobile/tablet: stacking sticky cards */}
      <div className="space-y-6 lg:hidden">
        {cards.map((card, i) => (
          <StackCard key={card.id} card={card} index={i} total={cards.length} />
        ))}
      </div>
      {/* Desktop: single sticky card with scroll-driven list */}
      <div className="hidden lg:block">
        <DesktopList />
      </div>
      {/* Static gradient gap before the next (white) section */}
      <div className="h-[4vh] lg:h-[6vh]" />
    </section>
  )
}

function DesktopList() {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = el.offsetHeight - window.innerHeight
      const scrolled = Math.min(total, Math.max(0, -rect.top))
      const progress = total > 0 ? scrolled / total : 0
      const idx = Math.min(
        cards.length - 1,
        Math.floor(progress * cards.length + 0.0001),
      )
      setActive(idx)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  return (
    <div ref={ref} style={{ height: `${cards.length * 100}vh` }}>
      <div
        className="sticky px-6 md:px-10"
        style={{ top: `calc(var(--nav-h) + 56px)` }}
      >
        <div
          className="mx-auto max-w-[1360px]"
          style={{ height: `calc(100vh - var(--nav-h) - 18vh)` }}
        >
          <div className="grid h-full grid-cols-2 gap-6 overflow-hidden rounded-lg bg-kale p-6 xl:p-8">
            {/* Left: stacked list of titles + active details */}
            <div className="flex flex-col">
              <ul className="space-y-3">
                {cards.map((c, i) => {
                  const isActive = i === active
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => {
                          const el = ref.current
                          if (!el) return
                          const total = el.offsetHeight - window.innerHeight
                          const targetScroll =
                            el.offsetTop + (total * i) / cards.length + 8
                          window.scrollTo({
                            top: targetScroll,
                            behavior: "smooth",
                          })
                        }}
                        className={`block text-left font-display text-3xl font-bold tracking-tight transition-colors xl:text-4xl ${
                          isActive
                            ? "text-white"
                            : "text-white/15 hover:text-white/40"
                        }`}
                      >
                        {c.title}
                      </button>
                      <AnimatePresence initial={false}>
                        {isActive && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <ul className="mt-5 space-y-3 text-base text-white xl:text-lg">
                              {c.bullets.map((b) => (
                                <li key={b} className="flex items-start gap-3">
                                  <Check
                                    size={18}
                                    strokeWidth={3}
                                    className="mt-1 shrink-0 text-fern"
                                  />
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                            <Button
                              variant="outline"
                              size="lg"
                              className="mt-6 w-full max-w-xs rounded-lg border-fern text-white hover:bg-fern/10"
                            >
                              Learn More
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Right: visual — swaps based on the active card. Stacking
                the images and toggling opacity keeps the switch smooth
                without a layout shift. */}
            <div className="relative h-full w-full overflow-hidden rounded-3xl bg-kale">
              {cards.map((c, i) => (
                <img
                  key={c.id}
                  src={c.image}
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                    i === active ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StackCard({
  card,
  index,
}: {
  card: Card
  index: number
  total: number
}) {
  const isFirst = index === 0
  // Every card pins for 90vh. The last card's inner content sits at the top
  // of its slot so the remaining ~20vh of the section's gradient bg shows
  // beneath its rounded bottom — matches Chime's transition into the next section.
  return (
    <div
      // transform-gpu + will-change promote the sticky card to its own
      // compositor layer. Without it, mobile browsers repaint the
      // shadow + image on every scroll frame as the cards restack,
      // which shows up as visible flicker. backface-hidden + contain
      // further isolate the layer from neighboring re-paints.
      className="sticky w-full transform-gpu will-change-transform [backface-visibility:hidden] [contain:paint]"
      style={{
        zIndex: index + 1,
        top: `calc(var(--nav-h) + 16px)`,
        height: `calc(100vh - var(--nav-h) - 28vh)`,
      }}
    >
      <div
        // overflow-hidden instead of overflow-y-auto — nested scroll
        // containers fight sticky positioning on iOS Safari and cause
        // visible flicker as the sticky card's bounding box jitters
        // between paints. Inner content is sized to fit; long bullet
        // lists wrap rather than scroll.
        className={`flex h-full flex-col overflow-hidden rounded-lg bg-kale px-5 pb-8 pt-6 sm:px-8 sm:pb-10 sm:pt-8 md:px-10 md:pb-12 md:pt-10 ${
          isFirst ? "" : "shadow-[0_-30px_60px_-40px_rgba(0,0,0,0.7)]"
        }`}
      >
        <div className="container min-h-0 flex-1">
          <div className="flex h-full flex-col gap-5 md:gap-7 lg:grid lg:grid-cols-2 lg:items-center lg:gap-10">
            <div className="w-full shrink-0 lg:max-w-xl">
              <h3 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-[40px] md:leading-[1.05]">
                {card.title}
              </h3>
              <ul className="mt-3 space-y-1.5 text-sm text-white sm:mt-4 sm:space-y-2 sm:text-base md:mt-5 md:space-y-2.5 md:text-lg">
                {card.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 md:gap-3">
                    <Check
                      size={16}
                      strokeWidth={3}
                      className="mt-0.5 shrink-0 text-fern sm:mt-1"
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full max-w-xs rounded-lg border-fern text-white hover:bg-fern/10 md:mt-6 md:h-12 md:text-base lg:w-auto"
              >
                Learn More
              </Button>
            </div>

            {/* Keep the aspect ratio close to the photo's natural shape so
                object-cover barely crops — extreme wide ratios (21/9, 5/2)
                lopped off the people's heads and the table. object-center
                anchors the crop on the subjects. max-h caps it so it never
                grows into a thin letterbox band on wide tablets. */}
            <div className="relative mx-auto w-full max-h-[42vh] overflow-hidden rounded-2xl bg-kale aspect-[4/3] sm:aspect-[3/2] md:aspect-[16/10]">
              <img
                src={card.image}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full rounded-2xl object-cover object-center [transform:translateZ(0)]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Visuals (no IP imagery; CSS/SVG analogues) ---------- */

function VisualShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-6">{children}</div>
  )
}

function FeeVisual() {
  return (
    <VisualShell>
      <div className="grid w-full max-w-md gap-4">
        <div className="rounded-2xl bg-flush/70 p-5 ring-1 ring-white/10 backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-widest text-white/60">
            Fee-Free ATM
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">$0</div>
          <div className="mt-1 text-xs text-fern">3418 McKinney Ave · Open</div>
        </div>
        <div className="rounded-2xl bg-flush/70 p-5 ring-1 ring-white/10 backdrop-blur">
          <div className="text-xs text-white/60">More ATMs than the top 3</div>
          <div className="text-xs text-white/60">national banks combined*</div>
        </div>
      </div>
    </VisualShell>
  )
}

function CashbackVisual() {
  return (
    <VisualShell>
      <div className="relative w-full max-w-sm">
        <div className="rotate-3 rounded-2xl bg-black p-6 shadow-card">
          <div className="text-sm lowercase text-fern">cbb</div>
          <div className="mt-10 font-mono text-xs tracking-[0.3em] text-white/80">
            ••••  ••••  ••••  5278
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div className="font-mono text-[10px] text-white/40">
              VALID THRU 12/28
            </div>
            <div className="text-sm font-bold italic text-white">VISA</div>
          </div>
        </div>
        <div className="absolute -left-3 -top-3 rounded-xl bg-mint px-3 py-2 text-xs font-bold text-flush shadow-glow">
          Cha-ching! +5% back
        </div>
      </div>
    </VisualShell>
  )
}

function CreditVisual() {
  return (
    <VisualShell>
      <div className="w-full max-w-sm space-y-4">
        <div className="rounded-2xl bg-flush/70 p-6 ring-1 ring-white/10 backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-widest text-white/60">
            Increase your score up to
          </div>
          <div className="mt-2 font-mono text-6xl font-extrabold text-white">
            70<span className="text-3xl text-fern">pts</span>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 text-ink-dark shadow-card">
          <div className="text-xs font-semibold text-ink-dark/60">
            Credit Score
          </div>
          <div className="mt-1 font-mono text-3xl font-extrabold">720</div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
            <div className="h-full w-3/4 bg-gradient-to-r from-fern to-highlight" />
          </div>
        </div>
      </div>
    </VisualShell>
  )
}

function SavingsVisual() {
  return (
    <VisualShell>
      <div className="w-full max-w-sm space-y-3">
        <div className="rounded-2xl bg-flush/70 px-4 py-3 ring-1 ring-white/10 backdrop-blur">
          <div className="flex items-center gap-2 text-white">
            <span className="font-mono text-3xl font-extrabold">9</span>
            <span className="text-xs font-bold uppercase">
              × higher than
              <br />
              the national avg
            </span>
          </div>
        </div>
        {[
          ["My savings", "$500", "Default"],
          ["Wedding", "$100", ""],
          ["Emergency fund", "$2,150", ""],
          ["Tokyo trip", "$3,170", ""],
        ].map(([label, val, tag]) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-2xl bg-white/95 px-4 py-3 text-ink-dark"
          >
            <div>
              <div className="text-xs font-semibold text-ink-dark/60">
                {label}
              </div>
              <div className="font-mono text-base font-bold">{val}</div>
            </div>
            {tag && (
              <span className="rounded-full bg-mint px-2 py-1 text-[10px] font-bold text-flush">
                {tag}
              </span>
            )}
          </div>
        ))}
      </div>
    </VisualShell>
  )
}

function PaydayVisual() {
  return (
    <VisualShell>
      <div className="w-full max-w-sm">
        <div className="mb-3 rounded-2xl bg-flush/70 px-4 py-3 ring-1 ring-white/10 backdrop-blur">
          <div className="text-base font-bold text-white">
            <span className="text-fern">Billions</span> of dollars
          </div>
          <div className="text-xs text-white/60">unlocked before payday</div>
        </div>
        <div className="rounded-3xl bg-flush/70 p-6 ring-1 ring-white/10 backdrop-blur">
          <div className="relative mx-auto h-44 w-44">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="10"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="url(#g)"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="264"
                strokeDashoffset="80"
              />
              <defs>
                <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#1EC677" />
                  <stop offset="100%" stopColor="#3CCD88" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <div className="font-mono text-3xl font-extrabold text-white">
                  $275
                </div>
                <div className="text-[10px] text-white/60">Available now</div>
              </div>
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-white/50">
            <span>Aug 1</span>
            <span>Aug 15</span>
          </div>
        </div>
      </div>
    </VisualShell>
  )
}

function SupportVisual() {
  return (
    <VisualShell>
      <div className="w-full max-w-sm space-y-3">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-fern px-4 py-3 text-sm text-flush">
          Did I just get charged twice?
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 text-sm text-white ring-1 ring-white/10">
          On it, refund posted in 30 seconds. ✓
        </div>
        <div className="text-[11px] text-white/50">Real human · 24/7</div>
      </div>
    </VisualShell>
  )
}
