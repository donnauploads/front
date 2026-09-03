import Link from "next/link"
import { Logo } from "@/components/ui/Logo"
import { Button } from "@/components/ui/Button"
import { BRAND_NAME } from "@/lib/brand"

export function DownloadCTA() {
  return (
    <section className="bg-white pb-4 md:pb-6">
      <div className="container">
        <div className="relative overflow-hidden rounded-lg bg-kale px-5 py-6 sm:px-8 sm:py-8 md:py-12">
          <div className="grid items-center gap-4 sm:gap-6 lg:grid-cols-2 lg:gap-10">
            {/* Left — centered text column */}
            <div className="flex flex-col items-center text-center">
              <Logo />
              <h2 className="mt-3 font-display text-2xl font-bold leading-[1.05] tracking-tight text-white sm:mt-4 sm:text-3xl md:text-5xl">
                Open a {BRAND_NAME} checking
                <br />
                account in minutes.
              </h2>

              {/* CTA — scales with the surrounding type so it grows on
                  tablet / desktop without dwarfing the headline on small
                  phones. clamp(): 0.78rem → 1rem text, 2.5rem → 3.5rem
                  height, padded relative to the font. */}
              <Button
                asChild
                className="mt-4 !rounded-lg shrink-0 text-[clamp(0.78rem,1.3vw,1rem)] h-[clamp(2.5rem,5vw,3.5rem)] px-[clamp(1.25rem,3vw,2rem)] sm:mt-5"
              >
                <Link href="/get-started">Get started</Link>
              </Button>
            </div>

            {/* Right — phone mockup */}
            <div className="relative flex justify-center lg:justify-end">
              <img
                src="/mock4.png"
                alt={`${BRAND_NAME} app preview`}
                loading="lazy"
                decoding="async"
                className="w-[150px] object-contain sm:w-[180px] lg:w-[260px]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
