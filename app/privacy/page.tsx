"use client"

import { useEffect, useRef } from "react"
import { BRAND_NAME } from "@/lib/brand"
import "../sb-home.css"
import "./privacy-sb.css"

/**
 * State Bank — U.S. Privacy Notice.
 *
 * Restyled onto the new State Bank design system (warm charcoal + mustard gold,
 * Playfair Display + Inter). Chrome (top utility bar, sticky nav, footer,
 * back-to-top) is shared with the marketing homepage via `sb-home.css`;
 * the long-form legal body is styled by the scoped `privacy-sb.css`.
 */
export default function PrivacyPage() {
  const rootRef = useRef<HTMLDivElement>(null)

  // Minimal homepage chrome behaviour: sticky-nav shadow, back-to-top
  // visibility, and the mobile burger toggle.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const nav = root.querySelector<HTMLElement>("#nav")
    const toTop = root.querySelector<HTMLElement>("#toTop")
    const burger = root.querySelector<HTMLButtonElement>("#burger")
    const navLinks = root.querySelector<HTMLElement>("#navLinks")

    function onScroll() {
      const y = window.scrollY || window.pageYOffset
      nav?.classList.toggle("scrolled", y > 30)
      toTop?.classList.toggle("show", y > 640)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()

    function onBurger() {
      if (!navLinks || !burger) return
      const open = navLinks.classList.toggle("open")
      burger.classList.toggle("active", open)
      burger.setAttribute("aria-expanded", open ? "true" : "false")
    }
    burger?.addEventListener("click", onBurger)

    return () => {
      window.removeEventListener("scroll", onScroll)
      burger?.removeEventListener("click", onBurger)
    }
  }, [])

  return (
    <div ref={rootRef} className="cbb privacy-sb">
      {/* ================= UTILITY BAR ================= */}
      <div className="topbar">
        <nav className="tb-tabs" aria-label="Quick links">
          <a className="tb-tab" href="/">
            Home
          </a>
          <a className="tb-tab" href="#">
            Currency Museum
          </a>
          <a className="tb-tab" href="#">
            Rulebook
          </a>
          <a className="tb-tab" href="#contact">
            Contact Us
          </a>
        </nav>
        <div className="tb-util">
          <a className="tb-lang" href="#" lang="ar" aria-label="Switch to Arabic">
            العربية
          </a>
          <a className="tb-consumer" href="/consumer">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-4Z" />
            </svg>
            <span>Consumer Protection</span>
            <span className="tb-consumer-tel">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
              </svg>
              17547789
            </span>
          </a>
          <form className="tb-search" role="search" onSubmit={(e) => e.preventDefault()}>
            <input type="search" placeholder="Search…" aria-label="Search" />
            <button type="submit" aria-label="Search">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* ================= MAIN NAV ================= */}
      <header className="nav" id="nav">
        <div className="wrap">
          <a className="brand" href="/" aria-label={`${BRAND_NAME} home`}>
            <img className="brand-logo" src="/lapi.png" alt={BRAND_NAME} />
          </a>
          <nav className="nav-links" id="navLinks" aria-label="Primary">
            <a className="btn btn-navy nav-cta" href="/login">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <path d="M10 17l5-5-5-5M15 12H3" />
              </svg>{" "}
              Log in
            </a>
          </nav>
          <button
            className="nav-burger"
            id="burger"
            aria-label="Toggle menu"
            aria-expanded="false"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {/* ================= BANNER ================= */}
      <section className="pp-banner">
        <div className="wrap">
          <span className="pp-eyebrow">Privacy</span>
          <h1>{BRAND_NAME} U.S. Privacy Notice</h1>
          <p className="pp-updated">
            Updated: February 11, 2026 · Effective: February 28, 2026
          </p>
        </div>
      </section>

      {/* ================= DOCUMENT ================= */}
      <main className="pp-doc">
        <p className="pp-lead">
          California consumers can find specific disclosures, including "Notice
          at Collection" details, by clicking{" "}
          <a href="#california-consumers">here.</a> If you're a California
          resident and apply for a job with us, please see our{" "}
          <a href="#">{BRAND_NAME} Applicant Privacy Notice.</a>
        </p>

        <p className="pp-lead">
          {BRAND_NAME} understands you may have questions about
          privacy. This Privacy Notice ("Notice") describes the types of
          personal information we collect, how we use the information, with whom
          we may share it, and the choices available to you. We also describe
          measures we take to protect the security of the information and how
          you can contact us about our privacy practices.
        </p>

        <p className="pp-lead">
          This Privacy Notice applies to {BRAND_NAME} and its
          affiliates and subsidiaries (collectively, "{BRAND_NAME}," "we" or "us"). To
          the extent that you obtain products from {BRAND_NAME} Capital, LLC, {BRAND_NAME}
          Payments, Inc., and {BRAND_NAME} Insurance Services, LLC, they are considered
          affiliates and/or subsidiaries of {BRAND_NAME}. This
          Privacy Notice applies to all the products and services offered by {BRAND_NAME}
          (including on our website ("Site") and mobile application ("App"))
          (collectively, the "Services")) to U.S. consumers, except where a
          product or service has a separate privacy notice that does not
          incorporate this Privacy Notice. Certain individuals also may be
          provided with additional privacy notices, as described below:
        </p>

        <ul>
          <li>
            <strong>{BRAND_NAME} Members:</strong> When you sign up for an account with
            {BRAND_NAME}, {BRAND_NAME} may collect and use your personal information on behalf of
            {BRAND_NAME} Partner Bank, N.A. or Stride Bank, N.A. (collectively, {BRAND_NAME}'s
            "Bank Partners") to facilitate the provision of banking services
            pursuant to{" "}
            <a href="#">The {BRAND_NAME} Partner Bank, N.A. Consumer Privacy Notice</a>{" "}
            and the <a href="#">Stride Bank, N.A. Consumer Privacy Notice</a> as
            applicable. The personal information processed in such cases is
            subject to our Bank Partners' privacy notices and laws such as
            Gramm-Leach-Bliley Act and may be excluded from some comprehensive
            state privacy laws. Federal law requires our Bank Partners to
            provide notice to certain consumers to explain what personal
            information they collect, how they share it, and how consumers may
            limit our Bank Partners' sharing of the information. The privacy
            practices of our Bank Partners are subject to their own privacy
            notices.
          </li>
        </ul>

        {/* Table of Contents */}
        <nav className="pp-toc" aria-label="Table of contents">
          <h2>Table of Contents</h2>
          <ol>
            <li>
              <a href="#info-obtain">Information We Obtain</a>
            </li>
            <li>
              <a href="#how-use">How We Use the Information We Obtain</a>
              <ol>
                <li>
                  <a href="#use-purposes">Use Purposes</a>
                </li>
                <li>
                  <a href="#analytics">Analytics Services</a>
                </li>
                <li>
                  <a href="#interest-ads">Interest-Based Advertising</a>
                </li>
              </ol>
            </li>
            <li>
              <a href="#how-share">How We Share the Information We Obtain</a>
            </li>
            <li>
              <a href="#your-choices">Your Choices</a>
            </li>
            <li>
              <a href="#how-protect">How We Protect Personal Information</a>
            </li>
            <li>
              <a href="#childrens-privacy">Children's Privacy</a>
            </li>
            <li>
              <a href="#third-party-links">
                Links to Third-Party Services and Features
              </a>
            </li>
            <li>
              <a href="#state-disclosures">State Specific Disclosures</a>
              <ol>
                <li>
                  <a href="#california-consumers">California Consumers</a>
                </li>
                <li>
                  <a href="#colorado-consumers">Colorado Consumers</a>
                </li>
                <li>
                  <a href="#connecticut-consumers">Connecticut Consumers</a>
                </li>
                <li>
                  <a href="#montana-consumers">Montana Consumers</a>
                </li>
                <li>
                  <a href="#oregon-consumers">Oregon Consumers</a>
                </li>
                <li>
                  <a href="#north-dakota-consumers">North Dakota Consumers</a>
                </li>
                <li>
                  <a href="#texas-consumers">Texas Consumers</a>
                </li>
                <li>
                  <a href="#utah-consumers">Utah Consumers</a>
                </li>
                <li>
                  <a href="#vermont-consumers">Vermont Consumers</a>
                </li>
                <li>
                  <a href="#virginia-consumers">Virginia Consumers</a>
                </li>
              </ol>
            </li>
            <li>
              <a href="#updates">Updates to Our Privacy Notice</a>
            </li>
            <li>
              <a href="#contact">How to Contact Us</a>
            </li>
          </ol>
        </nav>

        {/* Section I */}
        <Section id="info-obtain" number="I." title="Information We Obtain">
          <P>
            The personal information we collect and obtain depends on how you
            interact with us, the Services you use, and the choices you make. We
            collect information about you from different sources and in various
            ways when you use our Services, including information you provide
            directly, information collected automatically, information from
            third-party data sources, and data we infer or generate from other
            data. The types of personal information we may collect about you
            includes:
          </P>
          <UL>
            <li>
              Identifiers such as name, Social Security number, date of birth,
              postal and email address, and phone number;
            </li>
            <li>
              Government-issued photo ID, such as a driver's license or
              passport, photograph, proof of address documentation (such as a
              utility bill) and proof of identity documentation (such as a
              marriage document);
            </li>
            <li>Login credentials for your {BRAND_NAME} account;</li>
            <li>
              Financial information, including your account number from our Bank
              Partners, {BRAND_NAME} account transaction history, information about your
              linked non-{BRAND_NAME} accounts (such as transaction information and
              balances, payroll account information, etc.), and payment card
              information;
            </li>
            <li>
              Direct deposit status (whether you electronically deposit a
              portion of your regular paycheck or benefit payment above a
              minimum threshold);
            </li>
            <li>Information included on a tax return you provide;</li>
            <li>
              Credit score and other credit history data from a credit reporting
              agency, if you enroll in certain features of the Services;
            </li>
            <li>
              Employment information, including occupation, information about
              your employer, employee email address, and income details (such as
              source of income, approximate or expected income and how
              frequently you are paid);
            </li>
            <li>
              Physical characteristics, demographic information and similar
              details (such as sex, gender, race, color, marital or family
              status, citizenship status, military or veteran status, signature,
              language preference and national origin) present in documents
              (e.g., IDs, tax returns) you provide;
            </li>
            <li>
              Commercial information, including interest in a product or service,
              purchasing or consuming tendencies, and receipts or records of
              purchase or enrollment in products or Services;
            </li>
            <li>Voice recordings (such as when you call {BRAND_NAME}'s member services);</li>
            <li>Social media handles;</li>
            <li>
              Lease or rent information you provide us, such as lease details and
              documents, rent amount, landlord/property manager name and contact
              details;
            </li>
            <li>
              Information you provide through member services interactions and
              that you provide about your experience with {BRAND_NAME}, including via
              questionnaires, surveys, participation in user research or other
              feedback;
            </li>
            <li>
              Information provided by identity verification and fraud prevention
              platforms;
            </li>
            <li>
              Information provided by marketers and other websites on which {BRAND_NAME}
              advertises;
            </li>
            <li>
              Information you provide through contacts integration, including a
              list of contacts from your phone's operating system;
            </li>
            <li>
              Profile photos and other information you choose to provide for your
              {BRAND_NAME} profile;
            </li>
            <li>
              Other information you choose to provide, such as through our
              "Contact Us" feature, emails or other communications (such as with
              member services), referrals, chatbots, surveys, research
              participation, on social media pages, or in registrations and
              sign-up forms;
            </li>
            <li>
              Inferences, including new information from other data we collect,
              including using automated means to generate information about your
              likely preferences or other characteristics
              ("<strong>inferences</strong>"). For example, we may infer your
              general geographic location (such as city, state, and country)
              based on your IP address;
            </li>
          </UL>
          <P>
            The types of personal information we may collect about you also
            include types that may be classified as sensitive personal
            information, including:
          </P>
          <UL>
            <li>
              Biometric Data: We or our identity verification partners may
              collect documents that contain your photograph or require you to
              provide a photo of yourself. This information and data derived from
              these images may be considered biometric data and may be used to
              verify your identity or meet regulatory obligations. We will retain
              biometric data for as long as necessary to satisfy the purpose of
              collection or no more than 3 years after your account is closed,
              unless otherwise required by law;
            </li>
            <li>
              Precise geolocation data derived from a device and that is used or
              intended to be used to locate you within a geographic area that is
              equal to or less than the area of a circle with a radius of 1,750
              feet; and
            </li>
            <li>
              Demographic data such as racial or ethnic origin, or religious or
              philosophical beliefs.
            </li>
          </UL>
          <P>
            <span className="u">Information Collected by Automated Means:</span>{" "}
            We may use automated technologies on our Services to collect
            information about your equipment, browsing actions and usage
            patterns. These technologies help us (1) remember your information so
            you do not have to re-enter it; (2) track and understand how you use
            and interact with our Services, including our online forms, tools or
            content; (3) tailor the Services around your preferences; (4) measure
            the usability of our Services and the effectiveness of our
            communications; and (5) otherwise manage and enhance our products and
            Services, and help ensure they are working properly. Information
            collected by automated means may include:
          </P>
          <UL>
            <li>
              <span className="u">Site Visitor information:</span> When you visit
              our Site, we may obtain certain information by automated means, such
              as cookies, web beacons, web server logs and other technologies. A
              "cookie" is a text file that websites send to a visitor's computer
              or other internet-connected device to uniquely identify the
              visitor's browser or to store information or settings in the
              browser. A "web beacon," also known as an internet tag, pixel tag or
              clear GIF, links web pages to web servers and cookies and may be
              used to transmit information collected through cookies back to a web
              server. The information we collect in this manner may include your
              device IP address, unique device identifier, web browser
              characteristics, device characteristics, operating system, language
              preferences, referring URLs, clickstream data, and dates and times
              of website visits. Your browser may tell you how to be notified
              about certain types of automated collection technologies and how to
              restrict or disable them. Please note, however, that without these
              technologies, you may not be able to use all the features of our
              Services.
            </li>
            <li>
              <span className="u">App User Information:</span> When you use our
              App, we also may collect certain information by automated means,
              such as through device logs, server logs and other technologies. The
              information we collect in this manner may include the device type
              used, the mobile operating system, device identifiers and similar
              unique identifiers, device settings and configurations, IP
              addresses, battery and signal strength, usage statistics, referring
              emails and web addresses, dates and times of usage, actions taken on
              the App, and other information regarding use of the App. In
              addition, we may collect your device's geolocation information. Your
              device's operating platform may provide you with a notification when
              the App attempts to collect your precise geolocation. Please note
              that if you decline to allow the App to collect your precise
              geolocation, you may not be able to use all the App's features. Your
              device may tell you how to be notified about certain types of
              automated collection technologies and how to restrict or disable
              them. Please note, however, that without these technologies, you may
              not be able to use all the features of our Services. You can manage
              how your device and browser share certain device data by adjusting
              the privacy and security settings on your mobile device.
            </li>
          </UL>
        </Section>

        {/* Section II */}
        <Section id="how-use" number="II." title="How We Use the Information We Obtain">
          <SubSection id="use-purposes" letter="A." title="Use Purposes">
            <P>
              We use the personal information we collect for purposes described
              in this privacy notice or as otherwise disclosed to you. For
              example, we use personal information for the following purposes:
            </P>
            <UL>
              <li>Provide the Services;</li>
              <li>Process and fulfill transactions;</li>
              <li>Establish and manage {BRAND_NAME} accounts;</li>
              <li>Personalize your experience on our Services;</li>
              <li>
                Remember you and the information you share with the Services
                including on forms and applications;
              </li>
              <li>
                Facilitate payroll or other direct deposits (including tax
                refunds) to your {BRAND_NAME} account;
              </li>
              <li>
                Facilitate transfers or API connections between external bank
                accounts and {BRAND_NAME} accounts;
              </li>
              <li>
                Verify your identity, including to facilitate a name change
                request;
              </li>
              <li>
                Respond to inquiries, provide member support and resolve
                disputes;
              </li>
              <li>
                Send you communications, including emails, text messages, and App
                push notifications, that you request or that we are permitted to
                send;
              </li>
              <li>
                Determine your eligibility for, and administer your participation
                in, certain features of the Services, including, but not limited
                to, surveys, contests, sweepstakes, promotions and rewards;
              </li>
              <li>
                Facilitate and manage referrals from business partners and
                third-parties;
              </li>
              <li>Identify recipients and facilitate transfers for PayAnyone;</li>
              <li>
                Advertise and market our products and Services, and to send you
                information about third-party products and Services;
              </li>
              <li>
                Provide you targeted offers and notify you of third-party
                locations where you may use our products and Services;
              </li>
              <li>
                Provide member support and quality assurance, and conduct customer
                service training;
              </li>
              <li>
                Collect fees and other amounts owed in connection with your {BRAND_NAME}
                account;
              </li>
              <li>
                Operate, evaluate and improve our business (including researching
                and developing new products and Services; enhancing, improving,
                debugging and analyzing our products and Services; managing our
                communications; establishing and managing our business
                relationships; and performing accounting, auditing and other
                internal functions);
              </li>
              <li>
                Maintain and enhance the safety and security of our products and
                services and prevent misuse;
              </li>
              <li>
                Protect against, identify and prevent fraud and other criminal
                activity, claims and other liabilities;
              </li>
              <li>
                Exercise our rights and remedies and defend against legal claims;
                and
              </li>
              <li>
                Comply with and enforce applicable legal requirements, relevant
                industry standards and {BRAND_NAME} policies;
              </li>
              <li>
                Develop, maintain, and improve our services by using machine
                learning, AI, and risk modeling;
              </li>
              <li>
                To provide our services using privacy preserving de-identified
                data. {BRAND_NAME} will not attempt to re-identify de-identified data
                provided to us if that was not the intended purpose for the data
                or without providing proper notice to you.
              </li>
            </UL>
          </SubSection>

          <SubSection id="analytics" letter="B." title="Analytics Services">
            <P>
              We may use analytics on our Services. For example, we use Google
              Analytics to better understand how you interact with our Site. We
              also use Google Maps to better understand how our Services are used
              and to provide you with a map of nearby ATMs. The information we
              obtain through our Services may be disclosed to or collected directly
              by these third parties. To learn more about Google Analytics and
              Google Maps, please visit{" "}
              <a href="#">https://www.google.com/policies/privacy/partners/</a>.
            </P>
          </SubSection>

          <SubSection id="interest-ads" letter="C." title="Interest-Based Advertising">
            <P>
              On our Services, we may obtain information about your online
              activities to provide you with advertising about products and
              Services that may be tailored to your interests.
            </P>
            <P>
              You may see our ads on other websites because we use third-party ad
              services. Through these ad services, we can target our messaging to
              users considering demographic data, users' inferred interests and
              browsing context. These services track your online activities over
              time and across multiple websites and apps by collecting
              information through automated means, including through the use of
              cookies, web server logs, web beacons and other similar
              technologies. The ad services use this information to show you ads
              that may be tailored to your individual interests. The information
              ad services may collect includes data about your visits to websites
              that serve {BRAND_NAME} advertisements, such as the pages or ads you view and
              the actions you take on the websites or apps. This data collection
              takes place both on our Services and on third-party websites and
              apps that participate in these ad services. This process also helps
              us track the effectiveness of our marketing efforts.
            </P>
            <P>
              To learn how to opt out of interest-based advertising, see our{" "}
              <a href="#your-choices">"Your Choices"</a> section in this Notice.
            </P>
          </SubSection>
        </Section>

        {/* Section III */}
        <Section id="how-share" number="III." title="How We Share the Information We Obtain">
          <P>
            We may share the personal information we obtain about you with our
            affiliates and subsidiaries; our Bank Partners; other companies in
            connection with co-branded products, services or programs; joint
            marketing partners; research study partners; and consumer reporting
            agencies.
          </P>
          <P>
            We also may share the information we obtain about you with vendors and
            other entities we engage to perform services on our behalf, such as
            payment and check deposit processors, fraud and risk detection and
            mitigation tools, and modeling and analytics tools. See{" "}
            <a href="#analytics">Analytics</a> and{" "}
            <a href="#interest-ads">Interest Based Advertising</a> above for more
            information about how we use and share for these purposes.
          </P>
          <P>
            We may share personal information you provide with other {BRAND_NAME} members
            (including whether you are a {BRAND_NAME} member, whether you accept payments
            or direct deposits via {BRAND_NAME}, your profile picture, name, or other
            information you provide as part of our public {BRAND_NAME} Profile (such as in
            connection with a member referral, use of the PayAnyone service, use
            of SpotMe Boost service, or other social profile you may create).
          </P>
          <P>
            We also may disclose personal information and sensitive personal
            information (1) if we are required to do so by law or legal process
            (such as a court order or subpoena); (2) in response to requests by
            government agencies, such as law enforcement authorities; (3) to
            establish, exercise or defend our legal rights; (4) when we believe
            disclosure is necessary or appropriate to prevent physical or other
            harm or financial loss; (5) in connection with an investigation of
            suspected or actual illegal activity; (6) to defend our decisions
            related to a member dispute, which includes sharing limited dispute
            and decision related information, as permitted by law, with the press
            if the member has shared related details of the dispute with the press
            already; (7) in connection with the sale, transfer, merger,
            acquisition, joint venture, reorganization, divestiture, dissolution,
            or liquidation of our business or asset (disclosure associated with
            these events includes full transfer of your personal information to
            the resulting entities); or (8) otherwise with your consent.
          </P>
        </Section>

        {/* Section IV */}
        <Section id="your-choices" number="IV." title="Your Choices">
          <P>
            We offer you certain choices in connection with the personal
            information we collect from you.
          </P>
          <P>
            <span className="u">Communications preferences</span>. You can choose
            to not receive certain promotional communications from us by following
            the "unsubscribe" hyperlink at the bottom of promotional emails or by
            replying "STOP" to promotional texts. These choices do not apply to
            certain informational communications, including certain surveys and
            mandatory service communications. If you decide you do not want to
            receive push notifications from {BRAND_NAME}, you can use the settings on your
            mobile device to turn them off. We also offer push notifications on
            certain web browsers, which can also be turned off on your browser's
            settings.
          </P>
          <P>
            <span className="u">Submitting an opt-out or privacy request</span>.
            Different states offer different opt-out rights and {BRAND_NAME} makes it easy
            for you to submit an opt-out or privacy request through the{" "}
            <a href="#">{BRAND_NAME} Privacy Hub</a>. There, you can submit a variety of
            opt-outs as required in your state of residence. Simply enter your
            information so we know who you are and the privacy rights applicable to
            your state will be populated. You can also email us at{" "}
            <a href="mailto:privacy@cbb.gov.bh">privacy@cbb.gov.bh</a>. If you
            designate an authorized agent to make an access or deletion request on
            your behalf, we may require you to provide proof that you've authorized
            the agent to do so and to verify your own identity directly with us.
          </P>
          <P>
            <span className="u">
              Submitting a Sale, Share, or Targeted Advertising Opt-Out Request
            </span>
            . If you live in a state that offers sale, share, or targeted
            advertising opt-out rights, you can make a request to opt out by
            toggling off the "Do not sell or share my personal information" toggle
            in your {BRAND_NAME} App settings or by submitting a request through the{" "}
            <a href="#">{BRAND_NAME} Privacy Hub</a>. In addition, if you visit our
            website, you should also click on our "Do Not Sell or Share" link at
            the bottom of our homepage or use the Global Privacy Control (GPC)
            signal, but these options will only apply to the browser on which
            you've made your request until you clear your cookies. It will not
            change App-related practices or your account settings when you are not
            signed in to your {BRAND_NAME} account. When we detect a GPC signal, we will
            make reasonable efforts to respect your choices indicated by the GPC
            setting or similar control that is recognized by regulation or
            otherwise widely acknowledged as a valid opt-out preference signal.
          </P>
          <P>
            <span className="u">
              Additional settings for Cookies and similar technologies.
            </span>
          </P>
          <UL>
            <li>
              <strong>Cookie controls.</strong> Most web browsers are set to
              accept cookies by default. If you prefer, you can go to your browser
              settings to learn how to delete or reject cookies. If you choose to
              delete or reject cookies, this could affect certain features or
              services of our website. If you choose to delete cookies, settings
              and preferences controlled by those cookies, including advertising
              preferences, may be deleted and may need to be recreated. Some
              cookies can be turned off for residents of certain states by
              following the "Do not sell or share my personal information" link at
              the bottom of our webpage.
            </li>
            <li>
              <strong>Mobile advertising ID controls.</strong> iOS and Android
              operating systems provide options to limit tracking and/or reset the
              advertising IDs. You can change your preferences on your device.
            </li>
            <li>
              <strong>Email web beacons.</strong> Most email clients have settings
              that allow you to prevent the automatic downloading of images,
              including web beacons, which prevents the automatic connection to the
              web servers that host those images.
            </li>
            <li>
              <strong>Advertising controls.</strong> You can also visit DAA (
              <a href="#">aboutads.info/choices</a>), NAI (
              <a href="#">http://www.networkadvertising.org/choices/</a>) and
              TrustArc (<a href="#">http://preferences-mgr.truste.com/</a>) to
              learn more about opt-out controls in the U.S.
            </li>
            <li>
              <strong>Do Not Track.</strong> Some browsers have incorporated "Do
              Not Track" (DNT) features that can send a signal to the websites you
              visit indicating you do not wish to be tracked. Because there is not
              a common understanding of how to interpret the DNT signal, our
              websites do not currently respond to browser DNT signals.
            </li>
          </UL>
        </Section>

        {/* Section V */}
        <Section id="how-protect" number="V." title="How We Protect Personal Information">
          <P>
            We maintain administrative, technical and physical safeguards designed
            to protect the personal information you provide against accidental,
            unlawful or unauthorized access, destruction, loss, alteration,
            disclosure or use. To help us protect personal information, use a
            strong password and never share your password with anyone or use the
            same password with other sites or accounts.
          </P>
        </Section>

        {/* Section VI */}
        <Section id="childrens-privacy" number="VI." title="Children's Privacy">
          <P>
            Our Services are not directed to children and you must be 18 or older
            to open an account with us. In connection with the Services, we do not
            knowingly solicit or collect personal information from children under
            the age of 13 without parental consent. If you believe that a child
            under age 13 may have provided us with personal information without
            parental consent, please contact us as specified in the{" "}
            <a href="#contact">How To Contact Us</a> section of this Privacy
            Notice.
          </P>
        </Section>

        {/* Section VII */}
        <Section
          id="third-party-links"
          number="VII."
          title="Links to Third-Party Services and Features"
        >
          <P>
            Our Services may provide links to other online services, and may
            include third-party features such as apps, tools, widgets and
            plug-ins. These online services and third-party features may operate
            independently from us. The privacy practices of the relevant third
            parties, including details on the information they may collect about
            you, are subject to the privacy disclosures of these parties, which we
            strongly suggest you review. To the extent any linked online services
            or third-party features are not owned or controlled by {BRAND_NAME}, we are not
            responsible for these third parties' information practices.
          </P>
          <P>
            <span className="u">Plaid Technologies</span>. If you elect to interact
            with or use the Plaid Technologies, Inc. ("Plaid") feature in the
            Services, we may share certain personal information about you with
            Plaid, and Plaid may collect your information from financial
            institutions. By using the Plaid service, you acknowledge and agree
            that Plaid will collect and use your personal information in accordance
            with Plaid's privacy policy, which is available at{" "}
            <a href="#">https://plaid.com/legal</a>. Additionally, by using the
            Plaid Services, you acknowledge and agree that {BRAND_NAME} may use your
            personal information obtained from Plaid in accordance with any legally
            permissible purpose described under this Notice.
          </P>
        </Section>

        {/* Section VIII */}
        <Section id="state-disclosures" number="VIII." title="State Specific Disclosures">
          <P>
            The state specific disclosure sections below apply solely to consumers
            who reside in the states listed. If you are a resident of one of these
            states, and the processing of personal information about you is subject
            to the applicable state privacy laws, you have certain rights with
            respect to that information.
          </P>

          <SubSection id="california-consumers" letter="A." title="California Consumers">
            <P>
              If you are a California resident and apply for a job with us, please
              see our <a href="#">{BRAND_NAME} Applicant Privacy Notice</a>.
            </P>
            <h4 className="pp-h4">1. Notice of Collection</h4>
            <P>
              We may collect (and may have collected during the 12-month period
              prior to the effective date of this Notice) the following categories
              of personal information about you:
            </P>
            <UL>
              <li>
                <strong>Identifiers</strong> such as a real name, postal address,
                unique personal identifiers (such as a device identifier; cookies,
                beacons, pixel tags, mobile ad identifiers and similar technology;
                customer number, unique pseudonym, or user alias; telephone number
                and other forms of persistent or probabilistic identifiers),
                online identifier, internet protocol address, email address,
                account name, Social Security number, driver's license number,
                passport number, and other similar identifiers;
              </li>
              <li>
                <strong>Additional Data Subject to Cal. Civ. Code § 1798.80.</strong>{" "}
                Signature, physical characteristics or description, state
                identification card number, education, bank account number, credit
                card number, debit card number, and other financial information;
              </li>
              <li>
                <strong>Protected Classifications.</strong> Characteristics of
                protected classifications under California or federal law, such as
                race, color, national origin, age, sex, gender, marital status,
                citizenship status, and military and veteran status;
              </li>
              <li>
                <strong>Commercial Information.</strong> Commercial information,
                including records of personal property, products or services
                purchased, obtained, or considered, and other purchasing or
                consumer histories or tendencies;
              </li>
              <li>
                <strong>Online Activity.</strong> Internet and other electronic
                network activity information, including, but not limited to,
                browsing history, search history, and information regarding your
                interaction with websites, applications or advertisements;
              </li>
              <li>
                <strong>Geolocation Data.</strong> We use your IP address to
                determine your general location (such as city, state, or zip code);
              </li>
              <li>
                <strong>Sensory Information.</strong> Audio, electronic, visual,
                and similar information;
              </li>
              <li>
                <strong>Employment Information.</strong> Professional or
                employment-related information;
              </li>
              <li>
                Inferences drawn from any of the information identified above to
                create a profile about you reflecting your preferences,
                characteristics, psychological trends, predispositions, behavior,
                attitudes, intelligence, abilities, and aptitudes;
              </li>
              <li>
                <strong>Sensitive Personal Information</strong>
                <ul>
                  <li>
                    <strong>Government ID.</strong> Government identification such
                    as social security numbers, driver's license, state
                    identification card, or passport number;
                  </li>
                  <li>
                    <strong>Account access information.</strong> Information such as
                    account log-in, financial account, debit card, or credit card
                    number in combination with any required security or access
                    code, password, or credentials allowing access to an account;
                  </li>
                  <li>
                    <strong>Precise geolocation data.</strong> Data derived from a
                    device and that is used or intended to be used to locate you
                    within a geographic area that is equal to or less than the area
                    of a circle with a radius of 1,850 feet;
                  </li>
                  <li>
                    <strong>Sensitive demographic data.</strong> Racial or ethnic
                    origin, religious or philosophical beliefs, or union
                    membership;
                  </li>
                  <li>
                    <strong>Biometric information.</strong> For the purpose of
                    uniquely identifying an individual.
                  </li>
                </ul>
              </li>
            </UL>

            <h4 className="pp-h4">2. Notice of Use of Personal Information</h4>
            <P>
              We may use (and may have used during the 12-month period prior to the
              effective date of this Notice) your personal information for the{" "}
              <a href="#use-purposes">purposes</a> described in our {BRAND_NAME} Privacy
              Notice and for the following business purposes specified in the CCPA:
            </P>
            <UL>
              <li>
                Performing Services, including maintaining or servicing accounts,
                providing customer service, processing or fulfilling orders and
                transactions, verifying customer information, processing payments,
                providing advertising or marketing services, providing analytics
                services, or providing similar services;
              </li>
              <li>
                Auditing related to a current interaction with you and concurrent
                transactions, including, but not limited to, counting ad
                impressions to unique visitors, verifying positioning and quality
                of ad impressions, and auditing compliance;
              </li>
              <li>
                Short-term, transient use, including, but not limited to, the
                contextual customization of ads shown as part of the same
                interaction;
              </li>
              <li>
                Detecting security incidents, protecting against malicious,
                deceptive, fraudulent, or illegal activity, and prosecuting those
                responsible for that activity;
              </li>
              <li>
                Debugging to identify and repair errors that impair existing
                intended functionality;
              </li>
              <li>
                Undertaking internal research for technological development and
                demonstration;
              </li>
              <li>
                Undertaking activities to verify or maintain the quality or safety
                of a service or device that is owned, manufactured, manufactured
                for, or controlled by us, and to improve, upgrade, or enhance the
                service or device that is owned, manufactured, manufactured for, or
                controlled by us.
              </li>
            </UL>

            <h4 className="pp-h4">3. Sources of Personal Information</h4>
            <P>
              During the 12-month period prior to the effective date of this
              Notice, we may have obtained personal information about you from the
              following categories of sources:
            </P>
            <UL>
              <li>
                Directly from you, such as when you sign up for an account or
                contact member services, or participate in sweepstakes, promotions,
                or research or survey activities;
              </li>
              <li>Our Bank Partners;</li>
              <li>Your devices, when you use our Site or App;</li>
              <li>
                Your family or friends, such as when they provide us with your
                contact information by choosing to share their phone contacts with
                {BRAND_NAME};
              </li>
              <li>Payment processors;</li>
              <li>
                External banks (i.e., banks other than our Bank Partners) if you
                link a non-{BRAND_NAME} bank account;
              </li>
              <li>Credit reporting agencies;</li>
              <li>Our affiliates and subsidiaries;</li>
              <li>Vendors who provide services on our behalf;</li>
              <li>Our joint marketing partners;</li>
              <li>Our business partners (such as referring websites);</li>
              <li>Online advertising services and advertising networks;</li>
              <li>Data analytics providers;</li>
              <li>Government entities;</li>
              <li>Operating systems and platforms;</li>
              <li>Social networks;</li>
              <li>Data brokers;</li>
              <li>Data aggregators, such as Plaid.</li>
            </UL>

            <h4 className="pp-h4">
              4. Categories of third parties with whom personal information was
              shared
            </h4>
            <P>
              During the 12-month period prior to the effective date of this
              Notice, we may have shared your personal information with certain
              categories of third parties, as described below. When we share
              personal information with our Bank Partners, we do so as their
              service provider. The privacy practices of our Bank Partners are
              subject to their privacy notices (see{" "}
              <a href="#">The {BRAND_NAME} Partner Bank, N.A. Consumer Privacy Notice</a>{" "}
              and the <a href="#">Stride Consumer Privacy Notice</a>), which we
              strongly suggest you review. {BRAND_NAME} is not responsible for our Bank
              Partners' information practices or privacy notices. We may have
              disclosed the following categories of personal information about you
              for a business purpose to the following categories of third parties:
            </P>

            <div className="pp-table-wrap">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th>Category of Personal Information</th>
                    <th>Category of Third Party</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      [
                        "Identifiers",
                        `Our Bank Partners, other ${BRAND_NAME} users, our marketing partners, and your employer`,
                      ],
                      [
                        "Additional Data Subject to Cal. Civ. Code § 1798.80 Law",
                        "Our Bank Partners, our marketing partners",
                      ],
                      ["Protected Classifications", "Our Bank Partners"],
                      [
                        "Commercial Information",
                        "Our Bank Partners and our marketing partners",
                      ],
                      [
                        "Biometric Information",
                        "Our Bank Partners and identity verification partners",
                      ],
                      [
                        "Online Activity",
                        "Our Bank Partners and our marketing partners",
                      ],
                      ["Geolocation data", "Our Bank Partners"],
                      ["Sensory Information", "Our Bank Partners"],
                      [
                        "Employment Information",
                        "Our Bank Partners, our marketing partners",
                      ],
                    ] as const
                  ).map(([cat, party]) => (
                    <tr key={cat}>
                      <td>{cat}</td>
                      <td>{party}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <P>
              In addition to the categories of third parties identified above,
              during the 12-month period prior to the effective date of this
              Notice, we may have shared personal information about you with the
              following additional categories of third parties: government
              entities; other persons to whom we have a legal obligation to
              disclose personal information (including, for example, in response to
              a duly issued subpoena or search warrant); and other persons to whom
              you authorize {BRAND_NAME} to disclose your personal information.
            </P>

            <h4 className="pp-h4">5. California Privacy Rights</h4>
            <P>
              If you are a California resident, you have rights regarding your
              personal information. Those rights and other state-specific
              information is described below:
            </P>
            <UL>
              <li>
                <span className="u">Access</span>. You have a right to request that
                we disclose to you, twice in a 12-month period, the personal
                information we have collected about you. You also have a right to
                request additional information about our collection, use,
                disclosure, or sale of such personal information, which is also
                provided in this Notice.
              </li>
              <li>
                <span className="u">Correction</span>. You have the right to request
                that we correct inaccurate personal information under certain
                circumstances, subject to a number of exceptions.
              </li>
              <li>
                <span className="u">Deletion</span>. You have the right to request
                that we delete your personal information under certain
                circumstances, subject to a number of exceptions.
              </li>
              <li>
                <span className="u">
                  Opt-Out of the Selling or Sharing of your Personal Information.
                </span>{" "}
                You have the right to opt out of the selling or sharing of your
                data. The CCPA requires us to describe the categories of personal
                information we sell or share to third parties and how to opt-out of
                future sales.
              </li>
              <li>
                <span className="u">
                  Obtaining a portable copy of your personal information
                </span>
                . You have the right to obtain a portable copy of your personal
                information.
              </li>
              <li>
                <span className="u">Shine the Light Request</span>. You have the
                right to request that we provide you with (a) a list of certain
                categories of personal information we have disclosed to third
                parties for their direct marketing purposes during the immediately
                preceding calendar year and (b) the identity of those third
                parties.
              </li>
              <li>
                <span className="u">
                  Joint Marketing with other Financial Institutions
                </span>
                . You have the right to opt-out of joint marketing with other
                financial institutions.
              </li>
              <li>
                <span className="u">Appeal</span>. You have the right to appeal our
                decision to refuse to act on a CCPA data privacy request within a
                reasonable period after you receive our decision.
              </li>
              <li>
                <span className="u">Non-Discrimination.</span> You have the right to
                not be discriminated against for exercising any of your privacy
                rights.
              </li>
              <li>
                <span className="u">Authentication/Verification</span>. To help
                protect your privacy and maintain security, we will take steps to
                verify your identity before granting you access to your personal
                information or complying with your request (except for a request to
                opt-out of sales or sharing).
              </li>
              <li>
                <span className="u">Retention</span>. We retain personal information
                for as long as necessary to provide the Services and fulfill the
                transactions you have requested, comply with our legal obligations,
                resolve disputes, enforce our agreements, and other legitimate and
                lawful business purposes.
              </li>
              <li>
                <span className="u">Notice of Financial Incentives</span>. {BRAND_NAME} may
                offer rewards or prizes for participation in certain activities
                that may be considered a "financial incentive" under California law.
              </li>
              <li>
                <span className="u">Declining Requests</span>. Except for the
                automated controls described in this Notice, if you send us a
                request to exercise your rights or the choices in this section, to
                the extent permitted by applicable law, we may charge a fee or
                decline requests in certain cases.
              </li>
            </UL>
          </SubSection>

          <StateBlock id="colorado-consumers" letter="B." state="Colorado" stateAlt="Colorado" />
          <StateBlock id="connecticut-consumers" letter="C." state="Connecticut" stateAlt="Connecticut" />
          <StateBlock id="montana-consumers" letter="D." state="Montana" stateAlt="Montana" />
          <StateBlock id="oregon-consumers" letter="E." state="Oregon" stateAlt="Oregon" />

          <SubSection id="north-dakota-consumers" letter="F." title="North Dakota Consumers">
            <P>
              If you are a North Dakota resident, you have rights regarding your
              personal information. Those rights and other state-specific
              information is described below:
            </P>
            <UL>
              <li>
                <span className="u">
                  Joint Marketing with other Financial Institutions
                </span>
                . You have the right to opt-out of joint marketing with other
                financial institutions. If you would like to opt out of joint
                marketing with other financial institutions by submitting a request
                through the <a href="#">{BRAND_NAME} Privacy Hub.</a>
              </li>
            </UL>
          </SubSection>

          <StateBlock id="texas-consumers" letter="G." state="Texas" stateAlt="Texas" />

          <SubSection id="utah-consumers" letter="H." title="Utah Consumers">
            <P>
              If you are a Utah resident, you have rights regarding your personal
              information. Those rights and other state-specific information is
              described below:
            </P>
            <UL>
              <li>
                <span className="u">Access</span>. You have a right to request that
                we disclose to you, once in a 12-month period, the personal
                information we have collected about you.
              </li>
              <li>
                <span className="u">
                  Obtaining a portable copy of your personal information
                </span>
                . To obtain a copy of your personal information that you previously
                provided to us in a portable format, please submit an "Access"
                request as described above.
              </li>
              <li>
                <span className="u">Deletion</span>. You have a right to request
                that we delete your personal information under certain
                circumstances, subject to a number of exceptions.
              </li>
              <li>
                <span className="u">Opt-Out of Targeted Advertising</span>. You have
                a right to opt-out of targeted advertising and the sale of personal
                information. We do not "sell" data as it is defined under Utah law.
              </li>
              <li>
                <span className="u">Non-Discrimination</span>. You have the right to
                not be discriminated against for exercising any of your privacy
                rights.
              </li>
              <li>
                <span className="u">Authentication/Verification</span>. To help
                protect your privacy and maintain security, we will take steps to
                authenticate your identity before granting you access to your
                personal information.
              </li>
              <li>
                <span className="u">Declining Requests</span>. Except for the
                automated controls described in this Notice, if you send us a
                request to exercise your rights or the choices in this section, to
                the extent permitted by applicable law, we may charge a fee or
                decline requests in certain cases.
              </li>
              <li>
                <span className="u">Third Party Sharing</span>. To access the
                categories of third parties with whom personal information was
                shared, please consult the table under "California Consumers" as our
                data sharing is the same regardless of the state of our members.
              </li>
            </UL>
          </SubSection>

          <SubSection id="vermont-consumers" letter="I." title="Vermont Consumers">
            <P>
              If you are a Vermont resident, you have rights regarding your personal
              information. Those rights and other state-specific information is
              described below:
            </P>
            <UL>
              <li>
                <span className="u">
                  Joint Marketing with other Financial Institutions
                </span>
                : You have the right to opt-out of joint marketing with other
                financial institutions. If you would like to opt out of joint
                marketing with other financial institutions by submitting a request
                through the <a href="#">{BRAND_NAME} Privacy Hub.</a>
              </li>
            </UL>
          </SubSection>

          <StateBlock id="virginia-consumers" letter="J." state="Virginia" stateAlt="Virginia" />
        </Section>

        {/* Section IX */}
        <Section id="updates" number="IX." title="Updates to Our Privacy Notice">
          <P>
            We may update this Privacy Notice from time to time and without prior
            notice to you to reflect changes in our personal information practices
            or applicable law. We will indicate at the top of the Notice when it
            was most recently updated.
          </P>
        </Section>

        {/* Section X */}
        <Section id="contact" number="X." title="How to Contact Us">
          <P>
            You can update your privacy preferences directly by using the{" "}
            <a href="#">{BRAND_NAME} Privacy Hub</a> or as otherwise stated under "Your
            Choices" in this Notice. You can also submit a request or ask us
            questions about this Privacy Notice by writing to us at{" "}
            <a href="mailto:privacy@cbb.gov.bh">privacy@cbb.gov.bh</a>.
          </P>
        </Section>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="footer">
        <div className="wrap footer-top">
          <div className="footer-grid">
            <div className="footer-col">
              <h4>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>{" "}
                {BRAND_NAME}
              </h4>
              <address>
                Building 96, Road 1702
                <br />
                Block 317, Diplomatic Area
                <br />
                Manama
                <br />
                Kingdom of Bahrain
              </address>
            </div>

            <div className="footer-col">
              <h4>Follow Us</h4>
              <div className="footer-social">
                <a href="#" aria-label="X">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.9 2H22l-7.6 8.7L23 22h-6.6l-5.2-6.8L5.3 22H2.1l8.2-9.3L1.5 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.7L7.1 3.8H5.3L17.7 20Z" />
                  </svg>
                </a>
                <a href="#" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </a>
                <a href="#" aria-label="LinkedIn">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm6 0h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.3 0-2.95-1.8-2.95s-2.07 1.4-2.07 2.85V21H9V9Z" />
                  </svg>
                </a>
                <a href="#" aria-label="YouTube">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.7-1.8C19.2 5 12 5 12 5s-7.2 0-8.9.5A2.5 2.5 0 0 0 1.4 7.3 26 26 0 0 0 1 12c0 1.6 0 3.2.4 4.7a2.5 2.5 0 0 0 1.7 1.8c1.7.5 8.9.5 8.9.5s7.2 0 8.9-.5a2.5 2.5 0 0 0 1.7-1.8c.4-1.5.4-4.7.4-4.7Zm-13 3V9l5.2 3-5.2 3Z" />
                  </svg>
                </a>
                <a href="#" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="footer-partners">
            <img src="/brand/p-team.png" alt="#TeamBahrain" />
            <img src="/brand/p-bahrain.png" alt="bahrain.bh" />
            <img src="/brand/p-2030.png" alt="Bahrain 2030" />
            <img src="/brand/p-tawasul.png" alt="Tawasul App" />
            <img src="/brand/p-excellence.png" alt="Government Excellence Award 2019" />
          </div>
        </div>

        <div className="footer-bottom">
          <div className="wrap">
            <span className="copy">
              {BRAND_NAME} © 2026 · All rights reserved
            </span>
          </div>
        </div>
      </footer>

      <a className="totop" id="toTop" href="#top" aria-label="Back to top">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </a>
    </div>
  )
}

/* ---------- Helper components ---------- */

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string
  number: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="pp-section">
      <h2>
        <span className="pp-num">{number}</span>
        {title}
      </h2>
      <div className="pp-block">{children}</div>
    </section>
  )
}

function SubSection({
  id,
  letter,
  title,
  children,
}: {
  id: string
  letter: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="pp-sub">
      <h3>
        <span className="pp-num">{letter}</span>
        {title}
      </h3>
      <div className="pp-block">{children}</div>
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul>{children}</ul>
}

/**
 * Reusable state block, generates the standard rights list for non-CA states
 * that all use the same set of rights with the state name swapped in.
 */
function StateBlock({
  id,
  letter,
  state,
  stateAlt,
}: {
  id: string
  letter: string
  state: string
  stateAlt: string
}) {
  return (
    <SubSection id={id} letter={letter} title={`${state} Consumers`}>
      <P>
        If you are a {state} resident, you have rights regarding your personal
        information. Those rights and other state-specific information is
        described below:
      </P>
      <UL>
        <li>
          <span className="u">Access</span>. You have a right to request that we
          disclose to you, once in a 12-month period, the personal information we
          have collected about you. You also have a right to request additional
          information about our collection, use, disclosure, or sale of such
          personal information.
        </li>
        <li>
          <span className="u">Correction</span>. You have the right to request
          that we correct inaccurate personal information under certain
          circumstances, subject to a number of exceptions.
        </li>
        <li>
          <span className="u">Deletion</span>. You have the right to request that
          we delete your personal information under certain circumstances, subject
          to a number of exceptions.
        </li>
        <li>
          <span className="u">Opt-Out of Selling and Targeted Advertising</span>.
          You have the right to opt out of targeted advertising and the sale of
          your personal information. {stateAlt} law requires us to describe the
          categories of personal information we sell or share to third parties and
          how to opt-out of future sales.
        </li>
        <li>
          <span className="u">
            Obtaining a portable copy of your personal information
          </span>
          . You have the right to obtain a portable copy of your personal
          information.
        </li>
        <li>
          <span className="u">Appeal</span>. You have the right to appeal our
          decision to refuse to act on data privacy request within a reasonable
          period after you receive our decision.
        </li>
        <li>
          <span className="u">Non-Discrimination</span>. You have the right to not
          be discriminated against for exercising any of your privacy rights.
        </li>
        <li>
          <span className="u">Authentication/Verification</span>. To help protect
          your privacy and maintain security, we will take steps to authenticate
          your identity before granting you access to your personal information.
        </li>
        <li>
          <span className="u">Declining Requests</span>. Except for the automated
          controls described in this Notice, if you send us a request to exercise
          your rights or the choices in this section, to the extent permitted by
          applicable law, we may charge a fee or decline requests in certain
          cases.
        </li>
      </UL>
    </SubSection>
  )
}
