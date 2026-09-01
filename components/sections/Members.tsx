import { Logo } from "@/components/ui/Logo"

export function Members() {
  return (
    <section className="bg-kale py-10 md:py-16">
      <div className="container text-center">
        <div className="mb-6 flex justify-center md:mb-8">
          <Logo />
        </div>
        <div className="overflow-hidden rounded-3xl">
          <img
            src="/members.jpg"
            alt="State Bank members"
            className="block w-full object-cover"
          />
        </div>
        <div className="mx-auto mt-3 max-w-2xl md:mt-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-fern">
            State Bank Members
          </div>
          <h2 className="mt-3 text-balance font-display text-xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-2xl md:text-3xl">
            Helping everyday people take control of their financial future, together.
          </h2>
        </div>
      </div>
    </section>
  )
}
