import { Apple, Facebook, Instagram, Twitter } from "lucide-react"

const cols = [
  {
    title: "Popular Features",
    items: [
      "Membership Tiers",
      "State Bank Debit Card",
      "Build Credit",
      "Checking Account",
      "High Yield Savings Account",
      "Get Paid Early",
      "MyPay",
    ],
  },
  {
    title: "Company",
    items: [
      "About",
      "Investor Relations",
      "In the News",
      "Careers",
      "For Employers",
    ],
  },
  {
    title: "Resources",
    items: [
      "Help Center",
      "Trust & Safety",
      "Savings Calculator",
      "Find an ATM",
      "Paycheck Calculator",
      "State Bank Reviews",
    ],
  },
  {
    title: "Privacy",
    items: [
      "Policies",
      "State Bank Privacy Notice",
      "Do Not Sell or Share My Personal Information",
      "Supporting Those With Disabilities",
    ],
  },
]

function PlayStoreIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={24} viewBox="0 0 22 24" fill="none" aria-hidden>
      <path d="M1 1.5v21l11-10.5L1 1.5z" fill="#2196F3" />
      <path d="M12 12l4-3.5 5 3-9 5.5V12z" fill="#FFC107" />
      <path d="M12 12l9-5.5-5-3-4 3.5V12z" fill="#4CAF50" />
      <path d="M1 22.5l11-10.5-11-10.5v21z" fill="#F44336" />
    </svg>
  )
}

function StoreBadge({
  top,
  bottom,
  icon,
}: {
  top: string
  bottom: string
  icon: React.ReactNode
}) {
  return (
    <a
      href="#"
      className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-lg bg-black px-3 text-white hover:bg-zinc-900 sm:w-44 sm:flex-none"
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 leading-none">
        <span className="block truncate text-[9px]">{top}</span>
        <span className="mt-0.5 block truncate text-sm font-semibold tracking-tight sm:text-base">
          {bottom}
        </span>
      </span>
    </a>
  )
}

export function Footer() {
  return (
    <footer className="bg-flush pb-10 pt-16 text-sm text-white">
      <div className="container">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-5 md:gap-6 lg:gap-10">
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-base font-bold text-white">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.items.map((i) => (
                  <li key={i}>
                    <a href="#" className="text-white/70 hover:text-fern">
                      {i}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact column — spans the full row on mobile so the
              store badges + social icons get the entire screen width
              instead of being squeezed into one half of the 2-col grid. */}
          <div className="col-span-2 sm:col-span-1">
            <h4 className="mb-4 text-base font-bold text-white">Contact</h4>
            <ul className="space-y-3">
              <li className="text-white/70">844-244-2222</li>
              <li>
                <a href="#" className="text-white/70 hover:text-fern">
                  Become an Affiliate
                </a>
              </li>
            </ul>

            <div className="mt-5 flex w-full gap-3">
              <StoreBadge
                top="Download on the"
                bottom="App Store"
                icon={<Apple size={22} fill="currentColor" />}
              />
              <StoreBadge
                top="GET IT ON"
                bottom="Google Play"
                icon={<PlayStoreIcon />}
              />
            </div>

            <div className="mt-6 flex items-center gap-5 text-white">
              <a href="#" aria-label="Facebook" className="hover:text-fern">
                <Facebook size={22} fill="currentColor" stroke="none" />
              </a>
              <a href="#" aria-label="X" className="hover:text-fern">
                <Twitter size={22} fill="currentColor" stroke="none" />
              </a>
              <a href="#" aria-label="Instagram" className="hover:text-fern">
                <Instagram size={22} />
              </a>
            </div>
          </div>
        </div>

        {/* Legal disclosures */}
        <div className="mt-16 space-y-3 border-t border-white/10 pt-8 text-[11px] leading-relaxed text-white/55">
          {[
            "All rates, fees, percentages, balances, and features displayed across this site are illustrative numbers for a fictional product and do not represent any real bank account.",
            "Round-up illustrations show how a hypothetical purchase could route spare change into a Savings goal. Behavior, frequency, and amounts are configurable in a real product.",
            "Early Payday timing depends on when a hypothetical payroll provider would submit funds to the receiving institution. Two-day-early figures shown here are illustrative.",
            "MyPay examples assume eligibility based on simulated direct-deposit history. In a real product, eligibility, limits, and fees would be governed by underwriting and applicable agreements.",
            "Credit-builder score gains shown reflect a sample outcome only. Real-world results vary by individual credit profile and reporting cadence.",
            "Cash-back percentages, bonus categories, and tier perks are placeholders. A real product would publish a rewards schedule with caps and exclusions.",
            "Cash deposits at participating retailers, ATM coverage networks, and partner-bank deposit insurance limits referenced here are conceptual.",
            "Customer-support response times shown in promotional copy are aspirational and may vary by channel and volume.",
          ].map((line, i) => (
            <p key={i}>
              <sup className="mr-1">{i + 1}</sup>
              {line}
            </p>
          ))}

          <div className="!mt-8 space-y-2 pt-4">
            <p className="font-semibold text-white/80">Licenses</p>
            <p>
              State Bank is the central bank and regulator of the
              Kingdom of Bahrain&apos;s financial services sector, established
              under the State Bank and Financial Institutions Law.
            </p>
            <p>
              Information presented here is provided for general reference and
              does not constitute an offer of banking, lending, or investment
              services.
            </p>
          </div>

          <div className="!mt-8 space-y-1 pt-4">
            <p className="font-semibold text-white/80">State Bank</p>
            <p>King Faisal Highway, Diplomatic Area · Manama, Kingdom of Bahrain</p>
            <p>Operated by the State Bank</p>
          </div>

          <p className="!mt-8 pt-4 text-white/45">
            © {new Date().getFullYear()} State Bank. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
