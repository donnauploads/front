import { Check, Lock, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/Button"

export function RewardingSafeguard() {
  return (
    <section className="bg-white pt-10 pb-4 md:pt-20 md:pb-10">
      <div className="container grid items-stretch gap-4 lg:grid-cols-2 lg:gap-6">
        <Card
          eyebrow={<Sparkles size={16} />}
          eyebrowLabel="Prime"
          title="The most rewarding way to bank."
          body="Unlock State Bank Prime with qualifying direct deposits and stack 5% cash back, 3.75% APY on Savings, and a credit lift you can actually feel."
          visual={
            <div className="relative grid w-full place-items-center">
              <div
                className="absolute inset-0 rounded-full bg-fern/30 blur-3xl"
                aria-hidden
              />
              <img
                src="/rew1.jpg"
                alt=""
                className="relative h-auto w-full max-w-[420px] rounded-[32px] object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.55)]"
              />
            </div>
          }
        />
        <Card
          eyebrow={<Lock size={16} />}
          eyebrowLabel="Security"
          title="Safeguard your money."
          body={null}
          bullets={[
            "FDIC-style coverage via partner banks",
            "Backed by Visa's Zero Liability Policy",
            "Protection against fraudulent charges",
          ]}
          visual={
            <div className="relative grid w-full place-items-center">
              <div
                className="absolute inset-0 rounded-full bg-fern/30 blur-3xl"
                aria-hidden
              />
              <img
                src="/sec1.jpg"
                alt=""
                className="relative h-auto w-full max-w-[420px] rounded-[32px] object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.55)]"
              />
            </div>
          }
        />
      </div>
    </section>
  )
}

function Card({
  eyebrow,
  eyebrowLabel,
  title,
  body,
  bullets,
  visual,
}: {
  eyebrow: React.ReactNode
  eyebrowLabel: string
  title: string
  body: string | null
  bullets?: string[]
  visual: React.ReactNode
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-lg bg-kale p-5 sm:p-8 md:p-10">
      <div className="mb-4 grid min-h-[180px] place-items-center sm:mb-6 sm:min-h-[220px] md:min-h-64">
        {visual}
      </div>
      <div className="inline-flex w-fit self-start items-center gap-2 rounded-full bg-fern/15 px-3 py-1 text-xs font-semibold text-fern">
        {eyebrow}
        <span>{eyebrowLabel}</span>
      </div>
      <h3 className="mt-2.5 max-w-md font-display text-2xl font-bold tracking-tight text-white sm:mt-3 sm:text-3xl md:text-4xl">
        {title}
      </h3>
      {body && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70 sm:mt-3 sm:text-base">
          {body}
        </p>
      )}
      {bullets && (
        <ul className="mt-2.5 space-y-1.5 text-sm text-white sm:mt-3 sm:space-y-2 sm:text-[15px]">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <Check size={16} strokeWidth={3} className="mt-0.5 shrink-0 text-fern sm:size-[18px]" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="outline"
        size="sm"
        className="mt-4 w-full rounded-lg border-fern text-white hover:bg-fern/10 sm:mt-5 md:h-12 md:text-base"
      >
        Learn More
      </Button>
    </div>
  )
}
