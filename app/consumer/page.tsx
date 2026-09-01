"use client"

import { useEffect, useRef } from "react"
import { CONSUMER_HTML } from "./consumer-markup"
import "../sb-home.css"
import "./consumer.css"

/**
 * Consumer Information page — State Bank.
 *
 * Ported from the Claude Design handoff (consumer.html). Shares the
 * homepage chrome + sb-home.css; page-specific sections live in
 * consumer.css. The markup is injected verbatim and the design's vanilla
 * interactions are re-implemented here against the injected DOM:
 *   - sticky-nav shadow + back-to-top + --nav-bottom sync (null-safe)
 *   - mobile slide-in menu with body-fixed scroll-lock
 *   - complaint-video play (injects an autoplaying YouTube iframe)
 *   - "Financial Statements" accordion toggle
 */
export default function ConsumerPage() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const nav = root.querySelector<HTMLElement>("#nav")
    const toTop = root.querySelector<HTMLElement>("#toTop")
    const burger = root.querySelector<HTMLButtonElement>("#burger")
    const navLinks = root.querySelector<HTMLElement>("#navLinks")

    // ── Sticky nav shadow + back-to-top + --nav-bottom (null-safe) ──────
    function onScroll() {
      if (navLinks?.classList.contains("open")) return
      const y = window.scrollY || window.pageYOffset
      nav?.classList.toggle("scrolled", y > 30)
      toTop?.classList.toggle("show", y > 640)
      if (nav) {
        document.documentElement.style.setProperty(
          "--nav-bottom",
          Math.floor(nav.getBoundingClientRect().bottom) + "px",
        )
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()

    // ── Mobile menu (body-fixed scroll-lock, matches the homepage) ──────
    let savedScrollY = 0
    function lockScroll() {
      savedScrollY = window.scrollY || window.pageYOffset
      document.body.style.position = "fixed"
      document.body.style.top = `-${savedScrollY}px`
      document.body.style.left = "0"
      document.body.style.right = "0"
      document.body.style.width = "100%"
    }
    function unlockScroll() {
      document.body.style.position = ""
      document.body.style.top = ""
      document.body.style.left = ""
      document.body.style.right = ""
      document.body.style.width = ""
      window.scrollTo({ top: savedScrollY, left: 0, behavior: "instant" })
    }
    function onBurger() {
      if (!navLinks || !burger) return
      const open = navLinks.classList.toggle("open")
      if (open && nav) {
        document.documentElement.style.setProperty(
          "--nav-bottom",
          Math.floor(nav.getBoundingClientRect().bottom) + "px",
        )
      }
      burger.classList.toggle("active", open)
      burger.setAttribute("aria-expanded", open ? "true" : "false")
      if (open) lockScroll()
      else unlockScroll()
    }
    function onNavClick(e: Event) {
      const target = e.target as HTMLElement
      const link = target.closest<HTMLElement>(".nav-link")
      const item = link?.closest<HTMLElement>(".nav-item") ?? null
      // Mobile accordion for dropdown sections (matches homepage ≤920px).
      if (
        link &&
        item &&
        item.querySelector(".dropdown") &&
        window.matchMedia("(max-width: 920px)").matches
      ) {
        e.preventDefault()
        const wasOpen = item.classList.contains("open")
        navLinks
          ?.querySelectorAll<HTMLElement>(".nav-item.open")
          .forEach((n) => {
            if (n !== item) n.classList.remove("open")
          })
        item.classList.toggle("open", !wasOpen)
        return
      }
      // Any other link closes the menu (these navigate away to / or #).
      if (target.closest("a") && navLinks?.classList.contains("open")) {
        navLinks.classList.remove("open")
        burger?.classList.remove("active")
        burger?.setAttribute("aria-expanded", "false")
        unlockScroll()
      }
    }
    burger?.addEventListener("click", onBurger)
    navLinks?.addEventListener("click", onNavClick)

    // ── Complaint video — swap the poster for an autoplaying iframe ─────
    const videoCard = root.querySelector<HTMLElement>(".cs-video")
    const playBtn = root.querySelector<HTMLButtonElement>(".csv-play")

    // The poster ships as hqdefault.jpg (always exists → never blank). Try
    // to UPGRADE to the HD maxresdefault, but only swap it in once we've
    // confirmed it actually loaded — many videos lack the HD thumb and
    // YouTube returns a 404 / tiny gray stub, which is what was leaving the
    // frame blank. Preloading off-DOM sidesteps the inject-then-listen race.
    const poster = root.querySelector<HTMLImageElement>(".csv-poster")
    const ytId = videoCard?.getAttribute("data-yt") ?? ""
    const hd = new Image()
    hd.onload = () => {
      if (poster && hd.naturalWidth > 320) poster.src = hd.src
    }
    if (ytId) hd.src = `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg`
    function onPlay() {
      if (!videoCard || videoCard.classList.contains("playing")) return
      const id = videoCard.getAttribute("data-yt") || ""
      videoCard.classList.add("playing")
      const iframe = document.createElement("iframe")
      iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`
      iframe.title = "State Bank Customer Complaints Procedure"
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      iframe.referrerPolicy = "strict-origin-when-cross-origin"
      iframe.allowFullscreen = true
      videoCard.appendChild(iframe)
    }
    playBtn?.addEventListener("click", onPlay)

    // ── Financial-statements accordion ──────────────────────────────────
    const fsToggle = root.querySelector<HTMLButtonElement>("#fsToggle")
    const fsBody = root.querySelector<HTMLElement>("#fsBody")
    const fsGlyph = fsToggle?.querySelector<HTMLElement>(".cs-acc-glyph")
    function onFsToggle() {
      if (!fsBody || !fsToggle) return
      // Source of truth = aria-expanded (starts "true"). Drive the collapse
      // with an INLINE display value so no stylesheet (Tailwind base layer,
      // [hidden] attr, etc.) can override it.
      const willCollapse = fsToggle.getAttribute("aria-expanded") !== "false"
      fsBody.style.display = willCollapse ? "none" : "grid"
      fsToggle.setAttribute("aria-expanded", willCollapse ? "false" : "true")
      if (fsGlyph) fsGlyph.textContent = willCollapse ? "+" : "–"
    }
    fsToggle?.addEventListener("click", onFsToggle)

    return () => {
      window.removeEventListener("scroll", onScroll)
      burger?.removeEventListener("click", onBurger)
      navLinks?.removeEventListener("click", onNavClick)
      hd.onload = null
      playBtn?.removeEventListener("click", onPlay)
      fsToggle?.removeEventListener("click", onFsToggle)
      if (navLinks?.classList.contains("open")) unlockScroll()
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className="cbb"
      dangerouslySetInnerHTML={{ __html: CONSUMER_HTML }}
    />
  )
}
