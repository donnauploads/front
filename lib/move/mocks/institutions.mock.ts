/**
 * Institution catalog for the bank picker.
 *
 * ~150 major banks across USA, Canada, UK & Europe, Australia, Turkey,
 * the Middle East, Asia, Latin America, and Africa. Each entry carries
 * a primary `domain` used to fetch a live logo via Clearbit
 * (https://logo.clearbit.com/{domain}). When Clearbit doesn't have a
 * logo or the request 404s, the row falls back to a monogram in the
 * institution's brand color (handled by InstitutionRow).
 *
 *   GET /linked-accounts/institutions  → fetchInstitutions()
 *
 * Toggle the mock off later with NEXT_PUBLIC_USE_MOCKS=false.
 */

const USE_MOCKS =
  (process.env.NEXT_PUBLIC_USE_MOCKS ?? "true").toLowerCase() !== "false"

export type AccountType = "checking" | "savings" | "credit" | "investment"

export type Institution = {
  id: string
  name: string
  /** Tailwind bg class for the monogram fallback. */
  color: string
  /** Primary website used for live logo lookup (Clearbit). */
  domain: string
  accountTypes: AccountType[]
  /** Country code (ISO-3166-1 alpha-2) for grouping / filtering later. */
  country: string
}

/**
 * Alphabetised within each region. Country codes group banks for any
 * future region filter; the picker today renders them flat A→Z.
 */
const ALL: Institution[] = [
  // ── Bahrain (domestic) ──────────────────────────────────────────────
  { id: "nbb", name: "National Bank of Bahrain", domain: "nbbonline.com", color: "bg-blue-800", country: "BH", accountTypes: ["checking", "savings", "credit"] },
  { id: "bbk", name: "Bank of Bahrain and Kuwait", domain: "bbkonline.com", color: "bg-rose-700", country: "BH", accountTypes: ["checking", "savings", "credit"] },
  { id: "ahli-united", name: "Ahli United Bank", domain: "ahliunited.com", color: "bg-emerald-700", country: "BH", accountTypes: ["checking", "savings", "credit"] },
  { id: "al-salam", name: "Al Salam Bank", domain: "alsalambank.com", color: "bg-sky-700", country: "BH", accountTypes: ["checking", "savings"] },
  { id: "bahrain-islamic", name: "Bahrain Islamic Bank", domain: "bisb.com", color: "bg-teal-700", country: "BH", accountTypes: ["checking", "savings"] },
  { id: "khcb", name: "Khaleeji Bank", domain: "khcb.com", color: "bg-cyan-700", country: "BH", accountTypes: ["checking", "savings"] },
  { id: "ithmaar", name: "Ithmaar Bank", domain: "ithmaarbank.com", color: "bg-amber-700", country: "BH", accountTypes: ["checking", "savings"] },
  { id: "gib", name: "Gulf International Bank", domain: "gib.com", color: "bg-indigo-700", country: "BH", accountTypes: ["checking", "savings"] },
  { id: "bank-abc", name: "Bank ABC", domain: "bank-abc.com", color: "bg-red-800", country: "BH", accountTypes: ["checking", "savings"] },
  { id: "eskan", name: "Eskan Bank", domain: "eskanbank.com", color: "bg-green-700", country: "BH", accountTypes: ["savings"] },

  // ── United States ───────────────────────────────────────────────────
  { id: "ally", name: "Ally Bank", domain: "ally.com", color: "bg-violet-700", country: "US", accountTypes: ["checking", "savings"] },
  { id: "amex", name: "American Express", domain: "americanexpress.com", color: "bg-sky-800", country: "US", accountTypes: ["credit", "savings"] },
  { id: "bofa", name: "Bank of America", domain: "bankofamerica.com", color: "bg-red-700", country: "US", accountTypes: ["checking", "savings", "credit"] },
  { id: "bbt-truist", name: "Truist", domain: "truist.com", color: "bg-fuchsia-700", country: "US", accountTypes: ["checking", "savings"] },
  { id: "capone", name: "Capital One", domain: "capitalone.com", color: "bg-orange-600", country: "US", accountTypes: ["checking", "savings", "credit"] },
  { id: "charles-schwab", name: "Charles Schwab", domain: "schwab.com", color: "bg-sky-900", country: "US", accountTypes: ["checking", "investment"] },
  { id: "chase", name: "Chase", domain: "chase.com", color: "bg-sky-700", country: "US", accountTypes: ["checking", "savings", "credit", "investment"] },
  { id: "chime", name: "Chime", domain: "chime.com", color: "bg-emerald-500", country: "US", accountTypes: ["checking", "savings"] },
  { id: "citi", name: "Citibank", domain: "citi.com", color: "bg-sky-500", country: "US", accountTypes: ["checking", "savings", "credit"] },
  { id: "citizens", name: "Citizens Bank", domain: "citizensbank.com", color: "bg-emerald-700", country: "US", accountTypes: ["checking", "savings"] },
  { id: "current", name: "Current", domain: "current.com", color: "bg-lime-600", country: "US", accountTypes: ["checking", "savings"] },
  { id: "discover", name: "Discover", domain: "discover.com", color: "bg-amber-600", country: "US", accountTypes: ["checking", "savings", "credit"] },
  { id: "fidelity", name: "Fidelity", domain: "fidelity.com", color: "bg-emerald-700", country: "US", accountTypes: ["investment", "checking"] },
  { id: "fifththird", name: "Fifth Third Bank", domain: "53.com", color: "bg-indigo-700", country: "US", accountTypes: ["checking", "savings"] },
  { id: "firstrepublic", name: "First Republic", domain: "firstrepublic.com", color: "bg-stone-700", country: "US", accountTypes: ["checking", "savings"] },
  { id: "huntington", name: "Huntington Bank", domain: "huntington.com", color: "bg-green-800", country: "US", accountTypes: ["checking", "savings"] },
  { id: "keybank", name: "KeyBank", domain: "key.com", color: "bg-red-800", country: "US", accountTypes: ["checking", "savings"] },
  { id: "marcus", name: "Marcus by Goldman Sachs", domain: "marcus.com", color: "bg-yellow-600", country: "US", accountTypes: ["savings"] },
  { id: "mercury", name: "Mercury", domain: "mercury.com", color: "bg-zinc-700", country: "US", accountTypes: ["checking", "savings"] },
  { id: "navyfederal", name: "Navy Federal Credit Union", domain: "navyfederal.org", color: "bg-blue-900", country: "US", accountTypes: ["checking", "savings", "credit"] },
  { id: "pnc", name: "PNC Bank", domain: "pnc.com", color: "bg-orange-700", country: "US", accountTypes: ["checking", "savings"] },
  { id: "regions", name: "Regions Bank", domain: "regions.com", color: "bg-green-700", country: "US", accountTypes: ["checking", "savings"] },
  { id: "sofi", name: "SoFi", domain: "sofi.com", color: "bg-violet-600", country: "US", accountTypes: ["checking", "savings", "investment"] },
  { id: "synchrony", name: "Synchrony Bank", domain: "synchrony.com", color: "bg-amber-700", country: "US", accountTypes: ["savings", "credit"] },
  { id: "td", name: "TD Bank", domain: "td.com", color: "bg-emerald-600", country: "US", accountTypes: ["checking", "savings"] },
  { id: "usbank", name: "U.S. Bank", domain: "usbank.com", color: "bg-blue-800", country: "US", accountTypes: ["checking", "savings", "credit"] },
  { id: "usaa", name: "USAA", domain: "usaa.com", color: "bg-blue-700", country: "US", accountTypes: ["checking", "savings", "credit"] },
  { id: "varo", name: "Varo Bank", domain: "varomoney.com", color: "bg-orange-500", country: "US", accountTypes: ["checking", "savings"] },
  { id: "wells", name: "Wells Fargo", domain: "wellsfargo.com", color: "bg-rose-700", country: "US", accountTypes: ["checking", "savings", "credit"] },

  // ── Canada ──────────────────────────────────────────────────────────
  { id: "rbc", name: "RBC Royal Bank", domain: "rbc.com", color: "bg-blue-700", country: "CA", accountTypes: ["checking", "savings", "credit"] },
  { id: "td-canada", name: "TD Canada Trust", domain: "td.com", color: "bg-emerald-600", country: "CA", accountTypes: ["checking", "savings"] },
  { id: "bmo", name: "BMO", domain: "bmo.com", color: "bg-blue-800", country: "CA", accountTypes: ["checking", "savings", "credit"] },
  { id: "scotiabank", name: "Scotiabank", domain: "scotiabank.com", color: "bg-red-700", country: "CA", accountTypes: ["checking", "savings", "credit"] },
  { id: "cibc", name: "CIBC", domain: "cibc.com", color: "bg-red-800", country: "CA", accountTypes: ["checking", "savings"] },
  { id: "national-bank-ca", name: "National Bank of Canada", domain: "nbc.ca", color: "bg-red-700", country: "CA", accountTypes: ["checking", "savings"] },
  { id: "tangerine", name: "Tangerine", domain: "tangerine.ca", color: "bg-orange-500", country: "CA", accountTypes: ["checking", "savings"] },
  { id: "desjardins", name: "Desjardins", domain: "desjardins.com", color: "bg-emerald-700", country: "CA", accountTypes: ["checking", "savings", "credit"] },
  { id: "eq-bank", name: "EQ Bank", domain: "eqbank.ca", color: "bg-orange-600", country: "CA", accountTypes: ["checking", "savings"] },

  // ── United Kingdom ─────────────────────────────────────────────────
  { id: "barclays", name: "Barclays", domain: "barclays.co.uk", color: "bg-cyan-700", country: "GB", accountTypes: ["checking", "savings", "credit"] },
  { id: "hsbc", name: "HSBC", domain: "hsbc.com", color: "bg-rose-800", country: "GB", accountTypes: ["checking", "savings"] },
  { id: "lloyds", name: "Lloyds Bank", domain: "lloydsbank.com", color: "bg-green-700", country: "GB", accountTypes: ["checking", "savings"] },
  { id: "natwest", name: "NatWest", domain: "natwest.com", color: "bg-violet-800", country: "GB", accountTypes: ["checking", "savings"] },
  { id: "rbs", name: "Royal Bank of Scotland", domain: "rbs.co.uk", color: "bg-blue-900", country: "GB", accountTypes: ["checking", "savings"] },
  { id: "santander-uk", name: "Santander UK", domain: "santander.co.uk", color: "bg-red-600", country: "GB", accountTypes: ["checking", "savings"] },
  { id: "halifax", name: "Halifax", domain: "halifax.co.uk", color: "bg-blue-700", country: "GB", accountTypes: ["checking", "savings"] },
  { id: "monzo", name: "Monzo", domain: "monzo.com", color: "bg-rose-500", country: "GB", accountTypes: ["checking", "savings"] },
  { id: "starling", name: "Starling Bank", domain: "starlingbank.com", color: "bg-violet-600", country: "GB", accountTypes: ["checking", "savings"] },
  { id: "revolut", name: "Revolut", domain: "revolut.com", color: "bg-black", country: "GB", accountTypes: ["checking", "savings", "investment"] },
  { id: "wise", name: "Wise", domain: "wise.com", color: "bg-emerald-600", country: "GB", accountTypes: ["checking", "savings"] },
  { id: "tsb", name: "TSB Bank", domain: "tsb.co.uk", color: "bg-cyan-700", country: "GB", accountTypes: ["checking", "savings"] },
  { id: "nationwide", name: "Nationwide", domain: "nationwide.co.uk", color: "bg-blue-800", country: "GB", accountTypes: ["checking", "savings"] },

  // ── Continental Europe ─────────────────────────────────────────────
  { id: "santander", name: "Santander", domain: "santander.com", color: "bg-red-600", country: "ES", accountTypes: ["checking", "savings"] },
  { id: "bbva", name: "BBVA", domain: "bbva.com", color: "bg-blue-700", country: "ES", accountTypes: ["checking", "savings"] },
  { id: "caixabank", name: "CaixaBank", domain: "caixabank.com", color: "bg-sky-700", country: "ES", accountTypes: ["checking", "savings"] },
  { id: "deutsche-bank", name: "Deutsche Bank", domain: "db.com", color: "bg-blue-900", country: "DE", accountTypes: ["checking", "savings", "investment"] },
  { id: "commerzbank", name: "Commerzbank", domain: "commerzbank.de", color: "bg-yellow-600", country: "DE", accountTypes: ["checking", "savings"] },
  { id: "n26", name: "N26", domain: "n26.com", color: "bg-cyan-600", country: "DE", accountTypes: ["checking", "savings"] },
  { id: "sparkasse", name: "Sparkasse", domain: "sparkasse.de", color: "bg-red-600", country: "DE", accountTypes: ["checking", "savings"] },
  { id: "bnp-paribas", name: "BNP Paribas", domain: "bnpparibas.com", color: "bg-emerald-700", country: "FR", accountTypes: ["checking", "savings", "credit"] },
  { id: "societe-generale", name: "Société Générale", domain: "societegenerale.com", color: "bg-red-700", country: "FR", accountTypes: ["checking", "savings"] },
  { id: "credit-agricole", name: "Crédit Agricole", domain: "credit-agricole.com", color: "bg-green-700", country: "FR", accountTypes: ["checking", "savings"] },
  { id: "credit-mutuel", name: "Crédit Mutuel", domain: "creditmutuel.fr", color: "bg-blue-800", country: "FR", accountTypes: ["checking", "savings"] },
  { id: "lcl", name: "LCL", domain: "lcl.fr", color: "bg-yellow-600", country: "FR", accountTypes: ["checking", "savings"] },
  { id: "ing", name: "ING", domain: "ing.com", color: "bg-orange-500", country: "NL", accountTypes: ["checking", "savings"] },
  { id: "rabobank", name: "Rabobank", domain: "rabobank.com", color: "bg-orange-600", country: "NL", accountTypes: ["checking", "savings"] },
  { id: "abn-amro", name: "ABN AMRO", domain: "abnamro.com", color: "bg-emerald-700", country: "NL", accountTypes: ["checking", "savings"] },
  { id: "ubs", name: "UBS", domain: "ubs.com", color: "bg-red-700", country: "CH", accountTypes: ["checking", "savings", "investment"] },
  { id: "credit-suisse", name: "Credit Suisse", domain: "credit-suisse.com", color: "bg-blue-900", country: "CH", accountTypes: ["checking", "savings", "investment"] },
  { id: "raiffeisen", name: "Raiffeisen", domain: "raiffeisen.ch", color: "bg-yellow-600", country: "CH", accountTypes: ["checking", "savings"] },
  { id: "unicredit", name: "UniCredit", domain: "unicreditgroup.eu", color: "bg-red-700", country: "IT", accountTypes: ["checking", "savings"] },
  { id: "intesa", name: "Intesa Sanpaolo", domain: "intesasanpaolo.com", color: "bg-emerald-700", country: "IT", accountTypes: ["checking", "savings"] },
  { id: "erste", name: "Erste Bank", domain: "erstegroup.com", color: "bg-blue-700", country: "AT", accountTypes: ["checking", "savings"] },
  { id: "kbc", name: "KBC", domain: "kbc.com", color: "bg-sky-700", country: "BE", accountTypes: ["checking", "savings"] },
  { id: "nordea", name: "Nordea", domain: "nordea.com", color: "bg-blue-800", country: "SE", accountTypes: ["checking", "savings"] },
  { id: "seb", name: "SEB", domain: "seb.se", color: "bg-green-800", country: "SE", accountTypes: ["checking", "savings"] },
  { id: "swedbank", name: "Swedbank", domain: "swedbank.com", color: "bg-amber-600", country: "SE", accountTypes: ["checking", "savings"] },
  { id: "danske", name: "Danske Bank", domain: "danskebank.com", color: "bg-blue-700", country: "DK", accountTypes: ["checking", "savings"] },
  { id: "dnb", name: "DNB", domain: "dnb.no", color: "bg-emerald-700", country: "NO", accountTypes: ["checking", "savings"] },

  // ── Turkey ─────────────────────────────────────────────────────────
  { id: "garanti", name: "Garanti BBVA", domain: "garantibbva.com.tr", color: "bg-emerald-700", country: "TR", accountTypes: ["checking", "savings", "credit"] },
  { id: "isbank", name: "Türkiye İş Bankası", domain: "isbank.com.tr", color: "bg-blue-800", country: "TR", accountTypes: ["checking", "savings"] },
  { id: "akbank", name: "Akbank", domain: "akbank.com", color: "bg-red-700", country: "TR", accountTypes: ["checking", "savings", "credit"] },
  { id: "yapi-kredi", name: "Yapı Kredi", domain: "yapikredi.com.tr", color: "bg-cyan-700", country: "TR", accountTypes: ["checking", "savings", "credit"] },
  { id: "halkbank", name: "Halkbank", domain: "halkbank.com.tr", color: "bg-blue-700", country: "TR", accountTypes: ["checking", "savings"] },
  { id: "ziraat", name: "Ziraat Bankası", domain: "ziraatbank.com.tr", color: "bg-red-600", country: "TR", accountTypes: ["checking", "savings"] },
  { id: "qnb-finansbank", name: "QNB Finansbank", domain: "qnbfinansbank.com", color: "bg-fuchsia-700", country: "TR", accountTypes: ["checking", "savings"] },
  { id: "denizbank", name: "DenizBank", domain: "denizbank.com", color: "bg-cyan-700", country: "TR", accountTypes: ["checking", "savings"] },
  { id: "vakifbank", name: "VakıfBank", domain: "vakifbank.com.tr", color: "bg-yellow-600", country: "TR", accountTypes: ["checking", "savings"] },
  { id: "papara", name: "Papara", domain: "papara.com", color: "bg-violet-600", country: "TR", accountTypes: ["checking", "savings"] },

  // ── Australia & New Zealand ────────────────────────────────────────
  { id: "commbank", name: "Commonwealth Bank", domain: "commbank.com.au", color: "bg-yellow-600", country: "AU", accountTypes: ["checking", "savings", "credit"] },
  { id: "westpac", name: "Westpac", domain: "westpac.com.au", color: "bg-red-700", country: "AU", accountTypes: ["checking", "savings"] },
  { id: "nab", name: "NAB", domain: "nab.com.au", color: "bg-red-600", country: "AU", accountTypes: ["checking", "savings", "credit"] },
  { id: "anz", name: "ANZ", domain: "anz.com.au", color: "bg-sky-700", country: "AU", accountTypes: ["checking", "savings", "credit"] },
  { id: "macquarie", name: "Macquarie Bank", domain: "macquarie.com", color: "bg-stone-700", country: "AU", accountTypes: ["checking", "savings", "investment"] },
  { id: "bendigo", name: "Bendigo Bank", domain: "bendigobank.com.au", color: "bg-amber-700", country: "AU", accountTypes: ["checking", "savings"] },
  { id: "bank-of-queensland", name: "Bank of Queensland", domain: "boq.com.au", color: "bg-blue-700", country: "AU", accountTypes: ["checking", "savings"] },
  { id: "ing-au", name: "ING Australia", domain: "ing.com.au", color: "bg-orange-500", country: "AU", accountTypes: ["checking", "savings"] },
  { id: "ubank", name: "Ubank", domain: "ubank.com.au", color: "bg-violet-600", country: "AU", accountTypes: ["checking", "savings"] },
  { id: "asb", name: "ASB Bank", domain: "asb.co.nz", color: "bg-amber-600", country: "NZ", accountTypes: ["checking", "savings"] },
  { id: "anz-nz", name: "ANZ New Zealand", domain: "anz.co.nz", color: "bg-sky-700", country: "NZ", accountTypes: ["checking", "savings"] },

  // ── Asia ───────────────────────────────────────────────────────────
  { id: "icbc", name: "ICBC", domain: "icbc.com.cn", color: "bg-red-700", country: "CN", accountTypes: ["checking", "savings"] },
  { id: "ccb", name: "China Construction Bank", domain: "ccb.com", color: "bg-sky-700", country: "CN", accountTypes: ["checking", "savings"] },
  { id: "bank-of-china", name: "Bank of China", domain: "boc.cn", color: "bg-red-600", country: "CN", accountTypes: ["checking", "savings"] },
  { id: "agbank-cn", name: "Agricultural Bank of China", domain: "abchina.com", color: "bg-green-700", country: "CN", accountTypes: ["checking", "savings"] },
  { id: "mufg", name: "MUFG Bank", domain: "mufg.jp", color: "bg-red-700", country: "JP", accountTypes: ["checking", "savings"] },
  { id: "mizuho", name: "Mizuho Bank", domain: "mizuhobank.com", color: "bg-blue-800", country: "JP", accountTypes: ["checking", "savings"] },
  { id: "smbc", name: "SMBC", domain: "smbc.co.jp", color: "bg-emerald-700", country: "JP", accountTypes: ["checking", "savings"] },
  { id: "japan-post", name: "Japan Post Bank", domain: "jp-bank.japanpost.jp", color: "bg-emerald-600", country: "JP", accountTypes: ["checking", "savings"] },
  { id: "dbs", name: "DBS", domain: "dbs.com", color: "bg-red-700", country: "SG", accountTypes: ["checking", "savings", "investment"] },
  { id: "ocbc", name: "OCBC", domain: "ocbc.com", color: "bg-red-600", country: "SG", accountTypes: ["checking", "savings"] },
  { id: "uob", name: "UOB", domain: "uobgroup.com", color: "bg-blue-800", country: "SG", accountTypes: ["checking", "savings"] },
  { id: "hsbc-hk", name: "HSBC Hong Kong", domain: "hsbc.com.hk", color: "bg-rose-800", country: "HK", accountTypes: ["checking", "savings"] },
  { id: "hang-seng", name: "Hang Seng Bank", domain: "hangseng.com", color: "bg-emerald-700", country: "HK", accountTypes: ["checking", "savings"] },
  { id: "kakaobank", name: "KakaoBank", domain: "kakaobank.com", color: "bg-yellow-500", country: "KR", accountTypes: ["checking", "savings"] },
  { id: "kb-kookmin", name: "KB Kookmin Bank", domain: "kbstar.com", color: "bg-yellow-600", country: "KR", accountTypes: ["checking", "savings"] },
  { id: "shinhan", name: "Shinhan Bank", domain: "shinhan.com", color: "bg-sky-700", country: "KR", accountTypes: ["checking", "savings"] },
  { id: "hdfc", name: "HDFC Bank", domain: "hdfcbank.com", color: "bg-blue-700", country: "IN", accountTypes: ["checking", "savings", "credit"] },
  { id: "icici", name: "ICICI Bank", domain: "icicibank.com", color: "bg-orange-600", country: "IN", accountTypes: ["checking", "savings", "credit"] },
  { id: "sbi", name: "State Bank of India", domain: "sbi.co.in", color: "bg-blue-800", country: "IN", accountTypes: ["checking", "savings"] },
  { id: "axis", name: "Axis Bank", domain: "axisbank.com", color: "bg-fuchsia-700", country: "IN", accountTypes: ["checking", "savings", "credit"] },
  { id: "kotak", name: "Kotak Mahindra Bank", domain: "kotak.com", color: "bg-red-700", country: "IN", accountTypes: ["checking", "savings"] },
  { id: "maybank", name: "Maybank", domain: "maybank.com", color: "bg-yellow-600", country: "MY", accountTypes: ["checking", "savings"] },
  { id: "cimb", name: "CIMB Bank", domain: "cimb.com", color: "bg-red-700", country: "MY", accountTypes: ["checking", "savings"] },

  // ── Middle East ────────────────────────────────────────────────────
  { id: "emirates-nbd", name: "Emirates NBD", domain: "emiratesnbd.com", color: "bg-blue-800", country: "AE", accountTypes: ["checking", "savings"] },
  { id: "adcb", name: "ADCB", domain: "adcb.com", color: "bg-red-700", country: "AE", accountTypes: ["checking", "savings"] },
  { id: "mashreq", name: "Mashreq", domain: "mashreqbank.com", color: "bg-orange-600", country: "AE", accountTypes: ["checking", "savings"] },
  { id: "fab", name: "First Abu Dhabi Bank", domain: "bankfab.com", color: "bg-sky-800", country: "AE", accountTypes: ["checking", "savings"] },
  { id: "qnb", name: "Qatar National Bank", domain: "qnb.com", color: "bg-fuchsia-800", country: "QA", accountTypes: ["checking", "savings"] },
  { id: "alrajhi", name: "Al Rajhi Bank", domain: "alrajhibank.com.sa", color: "bg-blue-900", country: "SA", accountTypes: ["checking", "savings"] },
  { id: "snb", name: "Saudi National Bank", domain: "alahli.com", color: "bg-emerald-700", country: "SA", accountTypes: ["checking", "savings"] },
  { id: "leumi", name: "Bank Leumi", domain: "leumi.co.il", color: "bg-blue-800", country: "IL", accountTypes: ["checking", "savings"] },
  { id: "hapoalim", name: "Bank Hapoalim", domain: "bankhapoalim.com", color: "bg-red-700", country: "IL", accountTypes: ["checking", "savings"] },

  // ── Latin America ──────────────────────────────────────────────────
  { id: "itau", name: "Itaú Unibanco", domain: "itau.com.br", color: "bg-orange-600", country: "BR", accountTypes: ["checking", "savings", "credit"] },
  { id: "bradesco", name: "Bradesco", domain: "bradesco.com.br", color: "bg-red-700", country: "BR", accountTypes: ["checking", "savings"] },
  { id: "banco-do-brasil", name: "Banco do Brasil", domain: "bb.com.br", color: "bg-yellow-500", country: "BR", accountTypes: ["checking", "savings"] },
  { id: "nubank", name: "Nubank", domain: "nubank.com.br", color: "bg-violet-700", country: "BR", accountTypes: ["checking", "savings", "credit"] },
  { id: "santander-br", name: "Santander Brasil", domain: "santander.com.br", color: "bg-red-600", country: "BR", accountTypes: ["checking", "savings"] },
  { id: "bancolombia", name: "Bancolombia", domain: "grupobancolombia.com", color: "bg-yellow-600", country: "CO", accountTypes: ["checking", "savings"] },
  { id: "bbva-mexico", name: "BBVA México", domain: "bbva.mx", color: "bg-blue-700", country: "MX", accountTypes: ["checking", "savings"] },
  { id: "banorte", name: "Banorte", domain: "banorte.com", color: "bg-red-700", country: "MX", accountTypes: ["checking", "savings"] },
  { id: "santander-mx", name: "Santander México", domain: "santander.com.mx", color: "bg-red-600", country: "MX", accountTypes: ["checking", "savings"] },
  { id: "banco-de-chile", name: "Banco de Chile", domain: "bancochile.cl", color: "bg-blue-800", country: "CL", accountTypes: ["checking", "savings"] },

  // ── Africa ─────────────────────────────────────────────────────────
  { id: "standard-bank-za", name: "Standard Bank", domain: "standardbank.co.za", color: "bg-blue-700", country: "ZA", accountTypes: ["checking", "savings"] },
  { id: "fnb", name: "FNB", domain: "fnb.co.za", color: "bg-cyan-600", country: "ZA", accountTypes: ["checking", "savings"] },
  { id: "absa", name: "Absa", domain: "absa.co.za", color: "bg-red-700", country: "ZA", accountTypes: ["checking", "savings"] },
  { id: "nedbank", name: "Nedbank", domain: "nedbank.co.za", color: "bg-green-700", country: "ZA", accountTypes: ["checking", "savings"] },
  { id: "capitec", name: "Capitec Bank", domain: "capitecbank.co.za", color: "bg-sky-700", country: "ZA", accountTypes: ["checking", "savings"] },
  { id: "stanbic", name: "Stanbic Bank", domain: "stanbicbank.com", color: "bg-blue-700", country: "KE", accountTypes: ["checking", "savings"] },
  { id: "kcb", name: "KCB Bank", domain: "kcbgroup.com", color: "bg-emerald-700", country: "KE", accountTypes: ["checking", "savings"] },
  { id: "equity", name: "Equity Bank", domain: "equitybankgroup.com", color: "bg-red-700", country: "KE", accountTypes: ["checking", "savings"] },
]

/** Sorted A→Z by name for default render order. */
export const INSTITUTIONS: readonly Institution[] = ALL.slice().sort((a, b) =>
  a.name.localeCompare(b.name),
)

/** Friendly subtext for an institution row. */
export function describeAccountTypes(types: AccountType[]): string {
  const label: Record<AccountType, string> = {
    checking: "Checking",
    savings: "Savings",
    credit: "Credit",
    investment: "Investment",
  }
  return types.slice(0, 3).map((t) => label[t]).join(" · ")
}

/**
 * Live logo URL. We use Google's S2 favicon service because it covers
 * essentially every public domain and never requires auth — Clearbit's
 * Logo API was deprecated by HubSpot in late 2024 and stopped serving.
 * InstitutionRow falls back to a brand-color monogram on image error.
 */
export function logoUrl(domain: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`
}

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

/** Stand-in for the future `GET /linked-accounts/institutions` call. */
export async function fetchInstitutions(): Promise<readonly Institution[]> {
  if (!USE_MOCKS) {
    throw new Error("fetchInstitutions: real backend not implemented yet.")
  }
  await wait(150)
  return INSTITUTIONS
}
