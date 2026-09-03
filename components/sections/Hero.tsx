"use client"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Check, Award, Smartphone, Star, Newspaper } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { BRAND_NAME } from "@/lib/brand"

const bullets = [
  ["Zero-fee everyday banking", "with early paycheck access."],
  ["Up to 5% cash back", "and credit-building you actually own."],
  ["3.75% APY", "on every dollar in Savings."],
]

const badges = [
  {
    Icon: Award,
    title: "#1 Most Loved",
    sub: "Banking App™",
  },
  {
    Icon: Newspaper,
    title: "Editor's Pick",
    sub: "Best Overall Checking Account 2026",
  },
  {
    Icon: Star,
    title: "1 Million+ 5 star reviews",
    sub: "in the Google Play and Apple App Stores",
  },
  {
    Icon: Smartphone,
    title: "Top Rated",
    sub: "5 stars for customer service",
  },
]

export function Hero() {
  const [emailFocused, setEmailFocused] = useState(false)
  return (
    <section className="relative isolate overflow-hidden pt-16 pb-6 sm:pt-20 md:pb-8">
      {/* Hero background photo. The dark linear-gradient overlay on top
          keeps the white headline + bullets readable regardless of how
          the underlying photo's exposure shifts at different crops. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <img
          src="/hero9.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(4,20,12,0.55) 0%, rgba(4,20,12,0.35) 45%, rgba(4,20,12,0.6) 100%)",
          }}
        />
      </div>
      <div className="container relative">
        <div className="grid items-start gap-6 md:grid-cols-[2fr_1fr] md:gap-8 lg:gap-12">
          {/* Headline + bullets — left col, row 1. Wider than the phone
              column so the headline gets room to breathe at lg/xl. */}
          <div className="md:col-start-1 md:row-start-1 md:max-w-3xl md:pt-8">
            {/* Fluid headline: clamp() scales smoothly with viewport width
                so there's no harsh size jump at the md breakpoint (which
                used to render text-6xl on narrow tablets and wrap badly). */}
            {/* Font scales aggressively with viewport so each of the
                explicit-break segments ("built for the way", "you actually
                live.") always fits on its own line. Floor is 1.35rem so a
                ~320px phone still renders all three lines unwrapped. */}
            <h1 className="text-balance font-display font-bold leading-[1.05] tracking-tight text-white text-[clamp(1.35rem,5.4vw,4.5rem)]">
              <span className="md:hidden">
                Smarter banking,
                <br />
                made for you.
              </span>
              <span className="hidden md:inline">
                Smarter banking,
                <br />
                built for the way
                <br />
                you actually live.
              </span>
            </h1>

            <ul className="mt-3 space-y-1.5 text-[13px] sm:mt-4 sm:text-sm md:mt-6 md:space-y-2 md:text-lg">
              {bullets.map(([head, tail]) => (
                <li key={head} className="flex items-start gap-2 text-white sm:gap-3">
                  <Check
                    size={18}
                    className="mt-0.5 shrink-0 text-fern md:size-5"
                    strokeWidth={3}
                  />
                  <span>
                    <span className="font-semibold underline decoration-white/40 underline-offset-4">
                      {head}
                    </span>{" "}
                    <span className="underline decoration-white/40 underline-offset-4">
                      {tail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Phone + card — right col, spans both rows on desktop.
              `justify-center` (not `justify-end`) keeps the phone snug
              against the heading and centred in its column at every
              breakpoint. */}
          <div className="relative flex justify-center md:col-start-2 md:row-span-2 md:row-start-1 md:self-center">
            <Image
              src="/mock3.png"
              alt={`${BRAND_NAME} app preview`}
              width={1400}
              height={2800}
              priority
              className="h-auto w-[240px] [@media(min-width:400px)]:w-[280px] sm:w-[340px] md:w-[300px] lg:w-[380px] xl:w-[440px]"
            />
          </div>

          {/* Form + disclaimer — left col, row 2 on desktop; below phone on mobile */}
          <div className="md:col-start-1 md:row-start-2 md:max-w-3xl">
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex w-full flex-col gap-2 md:flex-row md:gap-2"
            >
              <input
                type="email"
                placeholder="Enter your email"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                // Match the Get-started button: same height (h-14) and
                // corner radius (rounded-2xl) on every viewport so the
                // pair lines up cleanly stacked on mobile and side-by-side
                // on desktop.
                // `flex-1` was applied at every breakpoint; in a flex-col
                // parent that sets flex-basis: 0% and (combined with the
                // input's default line-height) collapsed the rendered
                // height. Scoping it to md+ and using min-h locks the
                // mobile height to exactly 3.5rem like the button.
                className="block h-14 min-h-[3.5rem] w-full appearance-none rounded-lg border border-white/20 bg-flush/60 px-5 text-base leading-none text-white placeholder:text-white/60 backdrop-blur focus:border-[#0A0AB8] focus:outline-none focus:ring-2 focus:ring-[#0A0AB8] md:flex-1 md:px-6"
              />
              <Button
                asChild
                className="h-14 w-full shrink-0 rounded-lg text-base md:w-auto md:px-10"
              >
                <Link href="/get-started">Get started</Link>
              </Button>
            </form>

            {emailFocused && (
              <p className="mt-2 text-xs font-semibold text-white md:text-sm">
                Read our{" "}
                <Link
                  href="/privacy"
                  onMouseDown={(e) => e.preventDefault()}
                  className="underline underline-offset-2 hover:text-white/80"
                >
                  Privacy Notice
                </Link>
                .
              </p>
            )}

          </div>
        </div>

      </div>

      {/* Trust badges marquee — spans full viewport width */}
      <div className="mt-14 pt-8 md:mt-20">
        <div
          className="group relative overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0, #000 8%, #000 92%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0, #000 8%, #000 92%, transparent 100%)",
          }}
        >
          <div className="flex w-max animate-marquee gap-12 pr-12 group-hover:[animation-play-state:paused]">
            {[...badges, ...badges].map(({ Icon, title, sub }, i) => (
              <div
                key={i}
                className="flex w-[260px] shrink-0 items-start gap-3 text-white"
              >
                <Icon
                  size={28}
                  strokeWidth={1.5}
                  className="mt-1 shrink-0 text-white/80"
                />
                <div className="text-[13px] leading-snug">
                  <div className="font-bold">{title}</div>
                  <div className="text-white/60">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
