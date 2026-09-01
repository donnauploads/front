"use client"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Minus } from "lucide-react"

const faqs = [
  {
    q: "Is State Bank an online bank?",
    a: "State Bank is the central bank and regulator of the Kingdom's financial sector, with a digital experience that works alongside licensed member banks to deliver banking services. Your money sits with a partner bank; State Bank builds the experience around it.",
  },
  {
    q: "How do I open a State Bank account?",
    a: "Download the app, enter your email and a few details, and verify your identity. Most accounts are open in under three minutes, no paperwork, no branch visit.",
  },
  {
    q: "Where can I find a fee-free ATM?",
    a: "Use any of the 60,000+ partner ATMs across the country, find one inside the State Bank app under \"ATMs nearby.\" Out-of-network withdrawals may incur the operator's fee.",
  },
  {
    q: "Does State Bank require a credit check to open an account?",
    a: "No. Opening a checking account doesn't require a credit check or affect your score. The State Bank Credit Builder Card is similarly check-free to get started.",
  },
  {
    q: "Which banks partner with State Bank?",
    a: "Banking services are provided by State Bank's licensed member partner banks. Deposit insurance details are listed in-app and in the deposit account agreement.",
  },
  {
    q: "How do I deposit money into my State Bank account?",
    a: "Set up direct deposit, transfer from another bank, deposit a check via mobile capture, or load cash at any participating retailer.",
  },
  {
    q: "Are State Bank account deposits FDIC insured?",
    a: "Deposits held with our partner banks are eligible for FDIC-style coverage up to applicable limits. See the in-app disclosure for current details.",
  },
  {
    q: "Where can I go to add money to my State Bank debit card?",
    a: "Add cash for free at participating retailers nationwide. The State Bank app shows the nearest ones, hours included.",
  },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className="bg-white pb-24 pt-8 text-kale">
      <div className="container max-w-3xl">
        <h2 className="font-display text-4xl font-bold tracking-tight text-brand-deep sm:text-5xl">
          FAQs
        </h2>
        <div className="mt-10 space-y-2">
          {faqs.map((item, i) => {
            const isOpen = open === i
            return (
              <div
                key={item.q}
                className={`overflow-hidden transition-colors ${
                  isOpen
                    ? "rounded-2xl bg-kale text-white"
                    : "border-b border-kale/10 text-kale"
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className={`flex w-full items-center justify-between gap-6 text-left text-lg font-semibold ${
                    isOpen ? "px-6 pt-5" : "py-5"
                  }`}
                >
                  <span>{item.q}</span>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full">
                    {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-6 pt-2 text-[15px] leading-relaxed text-white/80">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
