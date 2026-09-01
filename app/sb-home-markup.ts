// AUTO-PORTED from Claude Design handoff (new State Bank homepage redesign).
// Source: /tmp/design-bundle/app/project/index.html, rendered via
// dangerouslySetInnerHTML in app/page.tsx with scoped styles in
// app/sb-home.css. Re-port from the design bundle if the markup
// changes; interactions live in app/page.tsx.
//
// Path rewrites applied during port:
//   assets/<file>  -> /brand/<file>   (Next.js public/brand/)
//   login.html     -> /login
//   signup.html    -> /get-started
//   dashboard.html -> /home

export const SB_HOME_HTML = String.raw`

<!-- ================= UTILITY BAR ================= -->
<div class="topbar">
  <nav class="tb-tabs" aria-label="Quick links">
    <a class="tb-tab active" href="#top">Home</a>
    <a class="tb-tab" href="#">Currency Museum</a>
    <a class="tb-tab" href="#rulebook">Rulebook</a>
    <a class="tb-tab" href="#">Contact Us</a>
  </nav>
  <div class="tb-util">
    <a class="tb-lang" href="#" lang="ar" aria-label="Switch to Arabic">العربية</a>
    <a class="tb-consumer" href="/consumer">
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
    <a class="brand" href="#top" aria-label="State Bank home">
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
        <a class="nm-tab active" href="#top">Home</a>
      </div>
      <!-- Nav menu items temporarily hidden (Personal → About Us). Commented out, not deleted.
      <div class="nav-item">
        <a class="nav-link" href="#products">Personal <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></a>
        <div class="dropdown">
          <a href="#products">Current Accounts</a>
          <a href="#products">Savings &amp; Deposits</a>
          <a href="#products">Credit &amp; Debit Cards</a>
          <a href="#products">Personal Loans</a>
          <a href="#products">Home Loans</a>
        </div>
      </div>
      <div class="nav-item">
        <a class="nav-link" href="#products">Business <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></a>
        <div class="dropdown">
          <a href="#products">Business Accounts</a>
          <a href="#products">Merchant Services</a>
          <a href="#products">Trade Finance</a>
          <a href="#products">Business Loans</a>
          <a href="#products">Corporate Banking</a>
        </div>
      </div>
      <div class="nav-item">
        <a class="nav-link" href="#market">Cards &amp; Payments <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></a>
        <div class="dropdown">
          <a href="#products">Debit &amp; Credit Cards</a>
          <a href="#market">Send Money Abroad</a>
          <a href="#market">Foreign Exchange</a>
          <a href="#products">Travel &amp; Multi‑Currency</a>
          <a href="#products">Apple Pay &amp; Google Pay</a>
        </div>
      </div>
      <div class="nav-item">
        <a class="nav-link" href="#products">Wealth <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></a>
        <div class="dropdown">
          <a href="#products">Savings &amp; Fixed Deposits</a>
          <a href="#products">Investments</a>
          <a href="#products">Premier Banking</a>
          <a href="#products">Insurance</a>
        </div>
      </div>
      <div class="nav-item"><a class="nav-link" href="#consultations">Help</a></div>
      <div class="nav-item"><a class="nav-link" href="#news">About Us</a></div>
      -->
      <a class="btn btn-navy nav-cta" href="/login"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5M15 12H3"/></svg> Log in</a>
    </nav>

    <button class="nav-burger" id="burger" aria-label="Toggle menu" aria-expanded="false"><span></span><span></span><span></span></button>
  </div>
</header>

<main id="top">

<!-- ================= HERO ================= -->
<section class="hero">
  <div class="hero-bg" aria-hidden="true">
    <div class="hero-sky"></div>
    <div class="hero-columns"></div>
    <div class="hero-pediment"></div>
    <svg class="hero-watermark" viewBox="0 0 100 112" fill="none">
      <path d="M50 4 6 22v40c0 27 19 41 44 46 25-5 44-19 44-46V22L50 4Z" stroke="currentColor" stroke-width="1.5"/>
      <path d="M37 54h26M40 54v30M48 54v30M56 54v30M60 54v30M44 54v30M52 54v30M35 86h30" stroke="currentColor" stroke-width="2"/>
      <circle cx="50" cy="33" r="7" stroke="currentColor" stroke-width="2"/>
    </svg>
    <div class="hero-grain"></div>
  </div>
  <div class="wrap hero-inner">
    <h1 class="reveal in hero-welcome" data-d="1">Welcome<br />to the Central Bank of<br />Bahrain</h1>
    <p class="hero-sub reveal in" data-d="2">The State Bank ('State Bank') is a public corporate entity established by the State Bank and Financial Institutions Law 2006. It was created on 6th September 2006.</p>
    <p class="hero-sub reveal in" data-d="3">The State Bank is responsible for maintaining monetary and financial stability in the Kingdom of Bahrain. It is also the single integrated regulator of Bahrain's financial industry.</p>
  </div>
</section>

<!-- ================= ACCESS CARD + STATS ================= -->
<section class="access">
  <div class="wrap">
    <div class="access-card reveal">
      <div class="access-grid">
        <a class="atile" href="#rulebook"><span class="atile-ic"><img src="/brand/rulebook-gold.svg" alt="" /></span><h3>Rulebook</h3><p>Regulatory Requirements, Financial Laws, Licensing Rules</p></a>
        <a class="atile" href="#"><span class="atile-ic"><img src="/brand/fintech.png" alt="" /></span><h3>Fintech</h3><p>About Fintech, Regulatory Sandbox Framework, Sandbox Register</p></a>
        <a class="atile" href="#market"><span class="atile-ic"><img src="/brand/monetarypolicy.svg" alt="" /></span><h3>Monetary Policy</h3><p>Monetary Policy Framework, Exchange Rate Policy, Standing Facilities, Reserve Requirements</p></a>
        <a class="atile" href="#"><span class="atile-ic"><img src="/brand/alert.png" alt="" /></span><h3>Alerts</h3><p>Official Alerts &amp; Warnings issued by the State Bank</p></a>
        <a class="atile" href="#"><span class="atile-ic"><img src="/brand/directory.png" alt="" /></span><h3>Licensing Directory</h3><p>State Bank Register, Permitted Activities, Licensee Approved Persons &amp; Controllers</p></a>
        <a class="atile" href="#consultations"><span class="atile-ic"><img src="/brand/publications.png" alt="" /></span><h3>Publications</h3><p>Annual Reports, Statistical Bulletin, Consumer Reports</p></a>
        <a class="atile" href="#"><span class="atile-ic"><img src="/brand/currency.svg" alt="" /></span><h3>Currency Issue</h3><p>Current Banknotes, Previous Banknotes, Commemorative Medals and Coins</p></a>
        <a class="atile" href="#"><span class="atile-ic"><img src="/brand/openbanking.png" alt="" /></span><h3>Open Banking</h3><p>More information about Open Banking</p></a>
      </div>
      <div class="access-stats">
        <div class="astat reveal"><div class="astat-num"><span class="count" data-to="374">0</span></div><div class="astat-rule"></div><div class="astat-label">Number of Banks and Financial Institutions</div><div class="astat-date">January 2026</div></div>
        <div class="astat reveal" data-d="1"><div class="astat-num"><span class="count" data-to="14971" data-sep="1">0</span></div><div class="astat-rule"></div><div class="astat-label">Workforce in the Financial Sector</div><div class="astat-date">2025</div></div>
        <div class="astat reveal" data-d="2"><div class="astat-num"><span class="unit">$</span><span class="count" data-to="254.5" data-dec="1">0</span><span class="unit">bn</span></div><div class="astat-rule"></div><div class="astat-label">Total Balance Sheet of the Banking System</div><div class="astat-date">December 2025</div></div>
        <div class="astat reveal" data-d="3"><div class="astat-num"><span class="count" data-to="17.2" data-dec="1">0</span><span class="unit">%</span></div><div class="astat-rule"></div><div class="astat-label">Contribution of financial corporations to GDP in constant prices</div><div class="astat-date">2024</div></div>
      </div>
    </div>
  </div>
</section>

<!-- ================= EXCHANGE RATES ================= -->
<section class="exrates" id="market">
  <div class="wrap">
    <div class="exr-card reveal">
      <h2 class="exr-title">Exchange Rate &amp; Daily Rates</h2>
      <div class="exr-body">
        <div class="exr-media">
          <img src="/brand/exchange-rate.jpg" alt="Bahraini dinar banknotes" />
          <div class="exr-date"><span class="d">02</span><span class="m">June</span></div>
        </div>
        <div class="exr-tables">
          <div class="exr-daily">
            <div class="exr-th dark">Daily Rates</div>
            <div class="exr-row"><span>O/N Deposit Rate</span><b>4.250</b></div>
            <div class="exr-row"><span>One Week Deposit Rate</span><b>4.500</b></div>
            <div class="exr-row"><span>One Month Deposit Rate</span><b>5.000</b></div>
            <div class="exr-row"><span>O/N Repo Rate</span><b>5.250</b></div>
            <div class="exr-row"><span>O/N BD Secured Rate</span><b>5.250</b></div>
          </div>
          <div class="exr-ccy">
            <div class="exr-th gold"><span>Currency</span><b>BHD</b></div>
            <div class="exr-row"><span>USD</span><b>0.376081</b></div>
            <div class="exr-row"><span>AUD</span><b>0.269406</b></div>
            <div class="exr-row"><span>EUR</span><b>0.437589</b></div>
            <div class="exr-row"><span>GBP</span><b>0.506187</b></div>
            <a class="exr-more" href="#">View More</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ================= EVENTS ================= -->
<section class="events">
  <div class="wrap">
    <div class="events-card reveal">
      <h2 class="events-title">Events</h2>
      <div class="events-foot">
        <span class="events-note">For more events and information about upcoming events.</span>
        <a class="events-btn" href="#">Events Calendar <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></a>
      </div>
    </div>
  </div>
</section>

<!-- ================= CONSULTATIONS / PUBLICATIONS / NEWS ================= -->
<section class="cpn" id="consultations">
  <div class="wrap">
    <div class="cpn-grid">
      <div class="cpn-left">
        <div class="cpn-card reveal">
          <h2 class="cpn-title">Consultations</h2>
        <a class="cons-row alt" href="#"><span class="cons-ic"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="13" width="32" height="22" rx="2"/><path d="m9 15 15 11 15-11"/></svg></span><div class="cons-b"><div class="cons-date">1 June 2026</div><div class="cons-t">State Bank Draft Resolutions Pursuant to Law No. (23) of 2025 Amending certain Provisions of the Law of Commerce</div><span class="cons-badge">Closed</span></div><svg class="row-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></a>
        <a class="cons-row" href="#"><span class="cons-ic"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="13" width="32" height="22" rx="2"/><path d="m9 15 15 11 15-11"/></svg></span><div class="cons-b"><div class="cons-date">10 March 2026</div><div class="cons-t">Consultation – Proposed Revision to Initial Capital Requirements</div><span class="cons-badge">Closed</span></div><svg class="row-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></a>
        <a class="cons-row alt" href="#"><span class="cons-ic"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="13" width="32" height="22" rx="2"/><path d="m9 15 15 11 15-11"/></svg></span><div class="cons-b"><div class="cons-date">5 March 2026</div><div class="cons-t">Proposed Payment Service Requirements Module</div><span class="cons-badge">Closed</span></div><svg class="row-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></a>
          <a class="cpn-more teal" href="#">View More</a>
        </div>
        <div class="cpn-card reveal" data-d="1" id="news">
          <h2 class="cpn-title">Publications</h2>
        <a class="pub-row alt" href="#"><span class="pub-date"><span class="pd">15</span><span class="pm">May</span></span><span class="pub-ic"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 6 11 5-11 5L5 11l11-5Z"/><path d="m5 16 11 5 11-5M5 21l11 5 11-5"/></svg></span><div class="pub-b"><div class="pub-t">Central Bank Survey</div><div class="pub-s">April 2026</div></div></a>
        <a class="pub-row" href="#"><span class="pub-date"><span class="pd">10</span><span class="pm">May</span></span><span class="pub-ic"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 6 11 5-11 5L5 11l11-5Z"/><path d="m5 16 11 5 11-5M5 21l11 5 11-5"/></svg></span><div class="pub-b"><div class="pub-t">FMIs and Payment Oversight Highlights</div><div class="pub-s">April 2026</div></div></a>
        <a class="pub-row alt" href="#"><span class="pub-date"><span class="pd">10</span><span class="pm">May</span></span><span class="pub-ic"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 6 11 5-11 5L5 11l11-5Z"/><path d="m5 16 11 5 11-5M5 21l11 5 11-5"/></svg></span><div class="pub-b"><div class="pub-t">FMIs and Payment Oversight Highlights</div><div class="pub-s">March 2026</div></div></a>
          <a class="cpn-more teal" href="#">View More</a>
        </div>
      </div>
      <div class="cpn-right reveal" data-d="1">
        <div class="cpn-card na-card">
          <h2 class="cpn-title">News &amp; Announcements</h2>
          <div class="na-media"><img src="/brand/news-banner.jpg" alt="State Bank headquarters" /></div>
        <article class="na-item"><div class="na-bar">State Bank Treasury Bills Oversubscribed</div><div class="na-body"><div class="na-pub">Published on <b>1 June 2026</b></div><p>Manama, Bahrain – 1st June 2026 – This week’s BD 70 million issue of Government Treasury Bills has been oversubscribed by 173%. The bills, carrying […]</p></div><svg class="row-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></article>
        <article class="na-item"><div class="na-bar">State Bank Treasury Bills Oversubscribed</div><div class="na-body"><div class="na-pub">Published on <b>25 May 2026</b></div><p>Manama, Bahrain – 25th May 2026 – This week’s BD 70 million issue of Government Treasury Bills has been oversubscribed by 101%. The bills, carrying […]</p></div><svg class="row-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></article>
        <article class="na-item"><div class="na-bar">State Bank Ijara Murabaha Sukuk Oversubscribed</div><div class="na-body"><div class="na-pub">Published on <b>21 May 2026</b></div><p>Manama, Bahrain – 21st May 2026 – The State Bank (State Bank) announces that the monthly issue of the short-term Islamic Ijara Murabaha Sukuk, […]</p></div><svg class="row-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></article>
          <a class="cpn-more bronze" href="#">View More</a>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ================= HERITAGE / MUSEUM ================= -->
<section class="heritage">
  <div class="wrap">
    <div class="cmuseum reveal">
      <div class="cmuseum-media"><img src="/brand/museum-banner.jpg" alt="Currency Museum gallery" /></div>
      <div class="cmuseum-body">
        <span class="cmuseum-icon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 5 6 14h36L24 5Z"/><path d="M11 14v22M19 14v22M29 14v22M37 14v22"/><path d="M7 36h34M5 41h38"/></svg></span>
        <div class="cmuseum-text">
          <h2>State Bank's Currency Museum<br /><span class="cm-hours">Sun‑Thu from 9:00 to 14:00</span></h2>
          <p>The State Bank's museum opened in 16 February 1999 and showcases some of the rarest coins in the region. Admission is free.</p>
          <div class="cmuseum-actions">
            <a class="cm-btn" href="#">General Information</a>
            <a class="cm-btn" href="#">Medals &amp; Coins</a>
            <a class="cm-btn" href="#">Request for a Visit</a>
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
      <!-- Address + social -->
      <div class="footer-col">
        <h4><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> State Bank</h4>
        <address>
          Building 96, Road 1702<br />
          Block 317, Diplomatic Area<br />
          Manama<br />
          Kingdom of Bahrain
        </address>
      </div>

      <!-- Quick links -->
      <!-- Quick Links footer column removed (commented out, not deleted).
      <div class="footer-col">
        <h4><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg> Quick Links</h4>
        <div class="footer-links">
          <a href="#">Contact Us</a>
          <a href="#">General Enquiry</a>
          <a href="#">Complaints</a>
          <a href="#">Careers</a>
          <a href="#">BIBF</a>
          <a href="#">Conditions of Use</a>
          <a href="#">Copyright</a>
          <a href="#">Disclaimer</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Accessibility Statement</a>
          <a href="#">Sitemap</a>
        </div>
      </div>
      -->

      <!-- Follow us -->
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

    <!-- Partner logos -->
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
