"use client"

/**
 * International phone input scoped to the regions State Bank accepts signups
 * from: the Americas, Europe, Asia, and Saudi Arabia. Renders a country
 * picker chip on the left and an as-you-type formatted number field on
 * the right. Emits the canonical E.164 string to the parent so the
 * signup payload doesn't need to re-parse.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Search } from "lucide-react"
import {
  AsYouType,
  getExampleNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js"
import examples from "libphonenumber-js/examples.mobile.json"
import { cn } from "@/lib/utils"

type Country = { code: CountryCode; name: string; flag: string; dial: string }

// Allowed regions: Americas + Europe + Asia + Saudi Arabia (covers the
// Middle East ask without expanding to every Gulf/Levant state — add
// more here as compliance signs them off).
const COUNTRIES: Country[] = [
  // North America
  { code: "US", name: "United States", flag: "🇺🇸", dial: "+1" },
  { code: "CA", name: "Canada", flag: "🇨🇦", dial: "+1" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", dial: "+52" },
  // Central / South America
  { code: "AR", name: "Argentina", flag: "🇦🇷", dial: "+54" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", dial: "+55" },
  { code: "CL", name: "Chile", flag: "🇨🇱", dial: "+56" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", dial: "+57" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷", dial: "+506" },
  { code: "DO", name: "Dominican Republic", flag: "🇩🇴", dial: "+1" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨", dial: "+593" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹", dial: "+502" },
  { code: "PA", name: "Panama", flag: "🇵🇦", dial: "+507" },
  { code: "PE", name: "Peru", flag: "🇵🇪", dial: "+51" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾", dial: "+598" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪", dial: "+58" },
  // Europe
  { code: "AT", name: "Austria", flag: "🇦🇹", dial: "+43" },
  { code: "BE", name: "Belgium", flag: "🇧🇪", dial: "+32" },
  { code: "BG", name: "Bulgaria", flag: "🇧🇬", dial: "+359" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", dial: "+41" },
  { code: "CZ", name: "Czechia", flag: "🇨🇿", dial: "+420" },
  { code: "DE", name: "Germany", flag: "🇩🇪", dial: "+49" },
  { code: "DK", name: "Denmark", flag: "🇩🇰", dial: "+45" },
  { code: "EE", name: "Estonia", flag: "🇪🇪", dial: "+372" },
  { code: "ES", name: "Spain", flag: "🇪🇸", dial: "+34" },
  { code: "FI", name: "Finland", flag: "🇫🇮", dial: "+358" },
  { code: "FR", name: "France", flag: "🇫🇷", dial: "+33" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", dial: "+44" },
  { code: "GR", name: "Greece", flag: "🇬🇷", dial: "+30" },
  { code: "HR", name: "Croatia", flag: "🇭🇷", dial: "+385" },
  { code: "HU", name: "Hungary", flag: "🇭🇺", dial: "+36" },
  { code: "IE", name: "Ireland", flag: "🇮🇪", dial: "+353" },
  { code: "IS", name: "Iceland", flag: "🇮🇸", dial: "+354" },
  { code: "IT", name: "Italy", flag: "🇮🇹", dial: "+39" },
  { code: "LT", name: "Lithuania", flag: "🇱🇹", dial: "+370" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺", dial: "+352" },
  { code: "LV", name: "Latvia", flag: "🇱🇻", dial: "+371" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", dial: "+31" },
  { code: "NO", name: "Norway", flag: "🇳🇴", dial: "+47" },
  { code: "PL", name: "Poland", flag: "🇵🇱", dial: "+48" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", dial: "+351" },
  { code: "RO", name: "Romania", flag: "🇷🇴", dial: "+40" },
  { code: "SE", name: "Sweden", flag: "🇸🇪", dial: "+46" },
  { code: "SI", name: "Slovenia", flag: "🇸🇮", dial: "+386" },
  { code: "SK", name: "Slovakia", flag: "🇸🇰", dial: "+421" },
  // Asia
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", dial: "+880" },
  { code: "CN", name: "China", flag: "🇨🇳", dial: "+86" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰", dial: "+852" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", dial: "+62" },
  { code: "IN", name: "India", flag: "🇮🇳", dial: "+91" },
  { code: "JP", name: "Japan", flag: "🇯🇵", dial: "+81" },
  { code: "KH", name: "Cambodia", flag: "🇰🇭", dial: "+855" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", dial: "+82" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰", dial: "+94" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", dial: "+60" },
  { code: "NP", name: "Nepal", flag: "🇳🇵", dial: "+977" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", dial: "+63" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", dial: "+92" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", dial: "+65" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", dial: "+66" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼", dial: "+886" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", dial: "+84" },
  // Middle East
  { code: "BH", name: "Bahrain", flag: "🇧🇭", dial: "+973" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", dial: "+971" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼", dial: "+965" },
  { code: "OM", name: "Oman", flag: "🇴🇲", dial: "+968" },
  { code: "QA", name: "Qatar", flag: "🇶🇦", dial: "+974" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", dial: "+966" },
]

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]))

export type PhoneInputValue = {
  /** What the user sees, formatted by libphonenumber's AsYouType. */
  display: string
  /** ISO country code currently selected. */
  country: CountryCode
  /** Canonical E.164 (`+XXXXXXXXX…`) if the current value parses as a valid number, else null. */
  e164: string | null
}

export function PhoneInput({
  value,
  onChange,
  invalid,
}: {
  value: PhoneInputValue
  onChange: (next: PhoneInputValue) => void
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const wrapRef = useRef<HTMLDivElement>(null)

  const country = BY_CODE.get(value.country) ?? COUNTRIES[0]!

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COUNTRIES
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q),
    )
  }, [query])

  const placeholder = useMemo(() => {
    try {
      const ex = getExampleNumber(country.code, examples)
      return ex?.formatNational() ?? ""
    } catch {
      return ""
    }
  }, [country.code])

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [open])

  function format(raw: string, code: CountryCode): PhoneInputValue {
    const formatter = new AsYouType(code)
    const display = formatter.input(raw)
    const parsed = parsePhoneNumberFromString(raw, code)
    const e164 = parsed && parsed.isValid() ? parsed.number : null
    return { display, country: code, e164 }
  }

  function onInput(raw: string) {
    // As-you-type formatting traps the caret on delete: backspacing the
    // trailing ")" off "(333)" leaves "(333", which AsYouType reformats
    // straight back to "(333)" — re-adding the bracket and bouncing the
    // caret to the end, so deletion never progresses. Detect a delete that
    // only removed a formatting char (digit count unchanged) and drop the
    // last digit instead, so Backspace always makes progress.
    const prevDigits = (value.display.match(/\d/g) ?? []).length
    let digits = raw.replace(/\D/g, "")
    const deleted = raw.length < value.display.length
    if (deleted && digits.length === prevDigits && digits.length > 0) {
      digits = digits.slice(0, -1)
    }
    onChange(format(digits, value.country))
  }

  function pickCountry(c: Country) {
    setOpen(false)
    setQuery("")
    // Reformat whatever digits are present under the new country's rules.
    onChange(format(value.display, c.code))
  }

  return (
    <div className="su-phone-wrap" ref={wrapRef}>
      <div className={cn("su-phone", invalid && "bad")}>
        <button
          type="button"
          className="su-phone-cc"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="flag" aria-hidden>
            {country.flag}
          </span>
          <span>{country.dial}</span>
          <ChevronDown className="su-phone-chev" aria-hidden />
        </button>
        <input
          className="su-phone-in"
          type="tel"
          inputMode="numeric"
          placeholder={placeholder}
          value={value.display}
          onChange={(e) => onInput(e.target.value)}
          autoComplete="tel-national"
        />
      </div>

      {open && (
        <div className="su-phone-pop" role="listbox">
          <div className="su-phone-search">
            <Search className="su-phone-search-ic" aria-hidden />
            <input
              type="text"
              placeholder="Search country or code"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="su-phone-list">
            {filtered.length === 0 ? (
              <div className="su-phone-empty">No matches</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className={cn(
                    "su-phone-opt",
                    c.code === country.code && "selected",
                  )}
                  onClick={() => pickCountry(c)}
                  role="option"
                  aria-selected={c.code === country.code}
                >
                  <span className="flag" aria-hidden>
                    {c.flag}
                  </span>
                  <span className="name">{c.name}</span>
                  <span className="dial">{c.dial}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Build an initial empty value defaulting to the US. */
/** Default to Bahrain — the bank's home market. Users in other regions
 *  can switch via the country picker chip. */
export function emptyPhone(): PhoneInputValue {
  return { display: "", country: "BH", e164: null }
}
