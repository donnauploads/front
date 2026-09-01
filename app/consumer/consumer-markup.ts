// Consumer Information page — ported from the Claude Design handoff
// (consumer.html). Shares the homepage chrome (topbar + nav + footer) with
// the Consumer Protection links pointing here and `.tb-consumer` marked
// active. Injected verbatim via dangerouslySetInnerHTML in
// app/consumer/page.tsx; page-specific styles live in consumer.css and the
// shared chrome styles come from sb-home.css.
//
// Path rewrites vs the static handoff:
//   index.html        -> /            (homepage)
//   index.html#anchor -> /#anchor     (homepage sections)
//   assets/<file>     -> /brand/<file>  (Next public/brand/)
//
// NOTE: the complaint video uses a placeholder YouTube id (data-yt) —
// replace "PLACEHOLDER" with the real State Bank video id.

export const CONSUMER_HTML = String.raw`

<!-- ================= UTILITY BAR ================= -->
<div class="topbar">
  <nav class="tb-tabs" aria-label="Quick links">
    <a class="tb-tab" href="/">Home</a>
    <a class="tb-tab" href="/#">Currency Museum</a>
    <a class="tb-tab" href="/#rulebook">Rulebook</a>
    <a class="tb-tab" href="/#">Contact Us</a>
  </nav>
  <div class="tb-util">
    <a class="tb-lang" href="#" lang="ar" aria-label="Switch to Arabic">العربية</a>
    <a class="tb-consumer active" href="/consumer">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-4Z"/></svg>
      <span>Consumer Protection</span>
      <span class="tb-consumer-tel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>17547789</span>
    </a>
    <form class="tb-search" role="search" onsubmit="return false;">
      <input type="search" placeholder="Search…" aria-label="Search" />
      <button type="submit" aria-label="Search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></button>
    </form>
  </div>
</div>

<!-- ================= MAIN NAV ================= -->
<header class="nav" id="nav">
  <div class="wrap">
    <a class="brand" href="/" aria-label="State Bank home">
      <img class="brand-logo" src="/lapi.png" alt="State Bank" />
    </a>

    <a class="nav-consumer-m" href="/consumer" aria-label="Consumer Protection 17547789">
      <span class="ncm-label">Consumer Protection</span>
      <span class="ncm-tel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>17547789</span>
    </a>

    <nav class="nav-links" id="navLinks" aria-label="Primary">
      <div class="nav-menu-top">
        <form class="nm-search" role="search" onsubmit="return false;">
          <input type="search" placeholder="Search…" aria-label="Search" />
          <button type="submit" aria-label="Search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></button>
        </form>
        <div class="nm-row">
          <a class="nm-consumer" href="/consumer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-4Z"/></svg> Consumer Protection</a>
          <a class="nm-lang" href="#" lang="ar">العربية</a>
        </div>
        <a class="nm-tab" href="/">Home</a>
      </div>
      <div class="nav-item">
        <a class="nav-link" href="/#products">Personal <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></a>
        <div class="dropdown">
          <a href="/#products">Current Accounts</a>
          <a href="/#products">Savings &amp; Deposits</a>
          <a href="/#products">Credit &amp; Debit Cards</a>
          <a href="/#products">Personal Loans</a>
          <a href="/#products">Home Loans</a>
        </div>
      </div>
      <div class="nav-item">
        <a class="nav-link" href="/#products">Business <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></a>
        <div class="dropdown">
          <a href="/#products">Business Accounts</a>
          <a href="/#products">Merchant Services</a>
          <a href="/#products">Trade Finance</a>
          <a href="/#products">Business Loans</a>
          <a href="/#products">Corporate Banking</a>
        </div>
      </div>
      <div class="nav-item">
        <a class="nav-link" href="/#market">Cards &amp; Payments <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></a>
        <div class="dropdown">
          <a href="/#products">Debit &amp; Credit Cards</a>
          <a href="/#market">Send Money Abroad</a>
          <a href="/#market">Foreign Exchange</a>
          <a href="/#products">Travel &amp; Multi‑Currency</a>
          <a href="/#products">Apple Pay &amp; Google Pay</a>
        </div>
      </div>
      <div class="nav-item">
        <a class="nav-link" href="/#products">Wealth <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></a>
        <div class="dropdown">
          <a href="/#products">Savings &amp; Fixed Deposits</a>
          <a href="/#products">Investments</a>
          <a href="/#products">Premier Banking</a>
          <a href="/#products">Insurance</a>
        </div>
      </div>
      <div class="nav-item"><a class="nav-link" href="/#consultations">Help</a></div>
      <div class="nav-item"><a class="nav-link" href="/#news">About Us</a></div>
      <a class="btn btn-navy nav-cta" href="/login"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5M15 12H3"/></svg> Log in</a>
    </nav>

    <button class="nav-burger" id="burger" aria-label="Toggle menu" aria-expanded="false"><span></span><span></span><span></span></button>
  </div>
</header>

<main id="top">

  <!-- a) Hero banner -->
  <section class="cinfo-hero">
    <img src="/brand/consumer-hero.jpg" alt="State Bank headquarters" />
  </section>

  <!-- b) Breadcrumb + page title -->
  <section class="cinfo-head">
    <div class="wrap">
      <nav class="crumb" aria-label="Breadcrumb"><a href="/">State Bank</a> <span aria-hidden="true">›</span> Consumer Information</nav>
      <h1>Consumer Information</h1>
    </div>
  </section>

  <!-- c) Making a Complaint + video -->
  <section class="complaint-sec">
    <div class="wrap">
      <h2 class="cs-h2">Making a Complaint</h2>

      <div class="cs-video" data-yt="KYgwooYe-Rg">
        <img class="csv-poster" src="https://i.ytimg.com/vi/KYgwooYe-Rg/hqdefault.jpg" alt="State Bank Customer Complaints Procedure" />
        <button class="csv-play" type="button" aria-label="Play State Bank Customer Complaints Procedure video">
          <span class="csv-play-ic"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>
        </button>
      </div>

      <div class="cs-copy">
        <p>The State Bank reviews complaints received against licensees to ensure they are handled fairly, promptly and in line with the regulatory requirements set out in the State Bank Rulebook.</p>
        <p>As a consumer, you should first raise your complaint directly with the bank, financing company or insurer concerned and allow them the opportunity to respond. If you are not satisfied with their final response, or do not receive one within the stipulated period, you may escalate the matter to the State Bank. You can also reach the Consumer Protection team on <strong>+973 17547789</strong>.</p>
        <p>For complaints relating to Capital Markets, listed companies, brokers or investment products, please use the dedicated Capital Markets complaint form.</p>
      </div>

      <a class="cs-cta-primary" href="#">Online Complaint Form</a>
      <div class="cs-cta-row">
        <a class="cs-cta-sec" href="#">Complaints Procedure for Banks / Financial Institutions / Capital Markets</a>
        <a class="cs-cta-sec" href="#">Complaints Procedure for Insurance Companies</a>
      </div>
    </div>
  </section>

  <!-- e) Overview -->
  <section class="cs-overview">
    <div class="wrap">
      <h2 class="cs-h2">Overview</h2>
      <p>Under Article 3 of the State Bank and Financial Institutions Law (2006), the State Bank is responsible for protecting the interests of depositors and the customers of licensees, and for maintaining confidence in the financial system of the Kingdom.</p>
      <p>Article 4 empowers the State Bank to issue the regulations, directives and guidelines necessary to give effect to these objectives, including the conduct-of-business and consumer-protection rules that licensees must follow when dealing with their customers.</p>
      <ul class="cs-list">
        <li><strong>Consumer alerts</strong>warnings about unlicensed entities and fraudulent schemes operating in or targeting Bahrain.</li>
        <li><strong>Consumer guides</strong>plain-language explanations of banking, lending and insurance products and your rights.</li>
        <li><strong>Monitoring complaints</strong>oversight of how licensees receive, investigate and resolve customer complaints.</li>
        <li><strong>Deposit protection scheme</strong>protection of eligible deposits should a member institution fail.</li>
      </ul>
    </div>
  </section>

  <!-- f) Deposit protection scheme + accordion -->
  <section class="cs-overview">
    <div class="wrap">
      <h2 class="cs-h2">Deposits &amp; Unrestricted Investment Accounts Protection Scheme</h2>
      <p>The Scheme was established under Resolution No. (34) of 2010 to protect eligible depositors and holders of unrestricted investment accounts at member institutions licensed by the State Bank.</p>
      <p>It is a prefunded scheme: member institutions contribute to dedicated funds in advance, so that compensation can be paid quickly if a member is unable to repay its depositors.</p>
      <p>Coverage is provided up to a maximum of <strong>BD 20,000</strong> per depositor, per member institution, in line with the rules of the Scheme.</p>
      <p>Full details of eligibility, calculation and the payout process are set out in the relevant Module of the State Bank Rulebook.</p>

      <div class="cs-accordion">
        <button class="cs-acc-head" id="fsToggle" type="button" aria-expanded="true" aria-controls="fsBody">
          <span>Financial Statements</span>
          <span class="cs-acc-glyph" aria-hidden="true">–</span>
        </button>
        <div class="cs-acc-body" id="fsBody">
          <div class="cs-fund">
            <h4>Conventional Fund</h4>
            <div class="cs-table">
              <div class="cs-row"><span class="cs-year">2015</span><a class="cs-dl" href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg> Download</a></div>
              <div class="cs-row"><span class="cs-year">2014</span><a class="cs-dl" href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg> Download</a></div>
            </div>
          </div>
          <div class="cs-fund">
            <h4>Islamic Fund</h4>
            <div class="cs-table">
              <div class="cs-row"><span class="cs-year">2015</span><a class="cs-dl" href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg> Download</a></div>
              <div class="cs-row"><span class="cs-year">2014</span><a class="cs-dl" href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg> Download</a></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

</main>

<!-- ================= FOOTER ================= -->
<footer class="footer">
  <div class="wrap footer-top">
    <div class="footer-grid">
      <div class="footer-col">
        <h4><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> State Bank</h4>
        <address>
          Building 96, Road 1702<br />
          Block 317, Diplomatic Area<br />
          Manama<br />
          Kingdom of Bahrain
        </address>
      </div>
      <div class="footer-col">
        <h4><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg> Quick Links</h4>
        <div class="footer-links">
          <a href="/#">Contact Us</a>
          <a href="/#">General Enquiry</a>
          <a href="/consumer">Complaints</a>
          <a href="/#">Careers</a>
          <a href="/#">BIBF</a>
          <a href="/#">Conditions of Use</a>
          <a href="/#">Copyright</a>
          <a href="/#">Disclaimer</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/#">Accessibility Statement</a>
          <a href="/#">Sitemap</a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Follow Us</h4>
        <div class="footer-social">
          <a href="#" aria-label="X"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.6 8.7L23 22h-6.6l-5.2-6.8L5.3 22H2.1l8.2-9.3L1.5 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.7L7.1 3.8H5.3L17.7 20Z"/></svg></a>
          <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>
          <a href="#" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm6 0h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.3 0-2.95-1.8-2.95s-2.07 1.4-2.07 2.85V21H9V9Z"/></svg></a>
          <a href="#" aria-label="YouTube"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.7-1.8C19.2 5 12 5 12 5s-7.2 0-8.9.5A2.5 2.5 0 0 0 1.4 7.3 26 26 0 0 0 1 12c0 1.6 0 3.2.4 4.7a2.5 2.5 0 0 0 1.7 1.8c1.7.5 8.9.5 8.9.5s7.2 0 8.9-.5a2.5 2.5 0 0 0 1.7-1.8c.4-1.5.4-4.7.4-4.7Zm-13 3V9l5.2 3-5.2 3Z"/></svg></a>
          <a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z"/></svg></a>
        </div>
      </div>
    </div>

    <div class="footer-partners">
      <img src="/brand/p-team.png" alt="#TeamBahrain" />
      <img src="/brand/p-bahrain.png" alt="bahrain.bh" />
      <img src="/brand/p-2030.png" alt="Bahrain 2030" />
      <img src="/brand/p-tawasul.png" alt="Tawasul App" />
      <img src="/brand/p-excellence.png" alt="Government Excellence Award 2019" />
    </div>
  </div>

  <div class="footer-bottom">
    <div class="wrap"><span class="copy">State Bank © 2026, Page last updated: 25 May 2026</span></div>
  </div>
</footer>

<a class="totop" id="toTop" href="#top" aria-label="Back to top"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></a>

`
