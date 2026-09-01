"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Landmark, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { INSTITUTIONS, logoUrl, type Institution } from "@/lib/move/api/institutions"
import "./BankSelect.css"

/**
 * Searchable bank picker — replaces a free-text "Bank name" input. The
 * trigger looks like a regular form field (uses `.docs-input` on the
 * customer side, slate `inputCls` style on admin). A bottom-sheet
 * picker drops in with all 150 institutions, each row showing the
 * Clearbit logo (or a monogram fallback) + the canonical name + the
 * 2-letter country code.
 *
 * Value contract is just the bank's canonical NAME (string) so it
 * stays drop-in compatible with the existing `bankName: string` state
 * and the backend's free-text wireDetails.bankName field. Look the
 * full Institution object back up via `findInstitutionByName(value)`
 * if you need the logo + domain elsewhere.
 */
export function BankSelect({
  value,
  onChange,
  triggerClassName,
  placeholder = "Choose a bank…",
  variant = "customer",
  country,
}: {
  value: string
  onChange: (name: string) => void
  /** Override the trigger button's classes — defaults match each variant. */
  triggerClassName?: string
  placeholder?: string
  /** customer = uses .docs-input look. admin = uses the slate input look. */
  variant?: "customer" | "admin"
  /** Restrict the picker to a single ISO country code (e.g. "BH" for
   *  domestic Bahrain transfers). Omit to show every institution. */
  country?: string
}) {
  const [open, setOpen] = useState(false)

  const selected = useMemo(() => findInstitutionByName(value), [value])

  const triggerCls =
    triggerClassName ??
    (variant === "admin"
      ? "flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
      : "bank-select-trigger")

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerCls}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar institution={selected} size={variant === "admin" ? 22 : 24} />
          <span
            className={cn(
              "truncate",
              value ? "" : variant === "admin" ? "text-slate-400" : "text-ink-mute",
            )}
          >
            {value || placeholder}
          </span>
        </span>
        <ChevronDown
          className="h-4 w-4 flex-shrink-0"
          style={{ color: variant === "admin" ? "#94a3b8" : "var(--ink-mute)" }}
          aria-hidden
        />
      </button>
      {open && (
        <BankPicker
          selectedName={value}
          country={country}
          onClose={() => setOpen(false)}
          onPick={(inst) => {
            onChange(inst.name)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

/** Render the bank's Clearbit logo, falling back to a monogram disc.
 *  Resets `logoOk` whenever the institution changes — without this the
 *  shared Avatar in the BankSelect trigger would stay stuck on the
 *  monogram fallback after the FIRST 404, even when the next bank's
 *  logo loads fine. */
function Avatar({ institution, size = 24 }: { institution: Institution | null; size?: number }) {
  const [logoOk, setLogoOk] = useState(!!institution)
  useEffect(() => {
    setLogoOk(!!institution)
  }, [institution?.id])
  if (!institution) {
    return (
      <span
        aria-hidden
        style={{
          width: size, height: size,
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "50%",
          background: "var(--paper)", border: "1px solid var(--line)",
          color: "var(--ink-mute)",
          flexShrink: 0,
        }}
      >
        <Landmark style={{ width: size * 0.55, height: size * 0.55 }} aria-hidden />
      </span>
    )
  }
  if (!logoOk) {
    return (
      <span
        aria-hidden
        className={institution.color}
        style={{
          width: size, height: size,
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "50%",
          color: "#fff",
          fontSize: size * 0.42, fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {monogram(institution.name)}
      </span>
    )
  }
  return (
    <span
      style={{
        width: size, height: size,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: "50%",
        background: "#fff",
        border: "1px solid var(--line)",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl(institution.domain)}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setLogoOk(false)}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </span>
  )
}

function BankPicker({
  selectedName,
  country,
  onClose,
  onPick,
}: {
  selectedName: string
  country?: string
  onClose: () => void
  onPick: (inst: Institution) => void
}) {
  const [query, setQuery] = useState("")
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Portal into a dedicated, app-owned container appended to <body> rather
  // than <body> itself. This isolates React's reconciliation from the other
  // body children — browser extensions that inject/move/remove DOM nodes can
  // otherwise trigger "removeChild: not a child of this node" crashes. The
  // unmount is defensive in case something detached the container first.
  useEffect(() => {
    const el = document.createElement("div")
    el.setAttribute("data-portal", "bank-picker")
    document.body.appendChild(el)
    setContainer(el)
    return () => {
      if (el.parentNode) el.parentNode.removeChild(el)
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  // Lock scroll while the sheet is open. IMPORTANT: do NOT use the
  // position:fixed body trick here — on iOS it shifts position:fixed
  // children (this modal) and desyncs touch hit-testing, so taps on the
  // rows / close button miss. Plain overflow:hidden is fixed-safe; the
  // list's overscroll-behavior:contain keeps the scroll inside the modal.
  useEffect(() => {
    if (typeof document === "undefined") return
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [])

  // Lift the bottom of the scrim above the on-screen keyboard. Without
  // this, on mobile (iOS/Android) the modal — which is anchored to the
  // bottom of the viewport via `.modal-scrim { align-items: flex-end }`
  // — sits behind the soft keyboard, hiding the search bar. We track
  // the visualViewport (the part of the page NOT covered by the
  // keyboard) and push the scrim's bottom padding up by the keyboard
  // height so the modal stays fully visible above it.
  const [kbInset, setKbInset] = useState(0)
  // Fixed mobile sheet height. Driven off the visualViewport so the card
  // always fills the area *above* the keyboard — it never grows/shrinks with
  // the number of search results, and the search bar never hides behind the
  // keyboard. Falls back to a CSS dvh height when visualViewport is absent.
  const [sheetH, setSheetH] = useState<number | null>(null)
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return
    const vv = window.visualViewport
    const update = () => {
      const overlap = window.innerHeight - vv.height - vv.offsetTop
      setKbInset(overlap > 0 ? overlap : 0)
      // Cap at 90% of the full screen (so a sliver of backdrop shows when the
      // keyboard is closed) and at the visible viewport minus a small gap (so
      // it fits above the keyboard when open). The result only changes when
      // the keyboard toggles — not as the user types.
      const fit = Math.min(window.innerHeight * 0.9, vv.height - 12)
      setSheetH(Math.round(fit))
    }
    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [])

  // When a country is given (e.g. "BH" for a domestic Bahrain wire) the
  // picker only ever lists that country's banks — both the search base
  // and the placeholder count narrow to it.
  const base = useMemo(
    () =>
      country
        ? INSTITUTIONS.filter((i) => i.country === country)
        : INSTITUTIONS,
    [country],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return base
    return base.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.country.toLowerCase().includes(q),
    )
  }, [query, base])

  const selectedId = useMemo(
    () => findInstitutionByName(selectedName)?.id,
    [selectedName],
  )

  if (!container) return null

  // Portal so the modal escapes the page's stacking/scroll context
  // entirely. On newer iOS (e.g. iPhone 17 / Safari 26) a position:fixed
  // modal nested in the app shell can mis-position and eat taps; a
  // body-level portal fixes that.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="bp-scrim"
      onClick={(e) => {
        // Close only when the backdrop itself is tapped (not the card).
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        // Push the modal bottom above the soft keyboard so the search
        // bar / first rows aren't covered while typing.
        paddingBottom: kbInset || undefined,
        transition: "padding-bottom .15s ease",
      }}
    >
      <div
        className="bp-card"
        style={{
          display: "flex",
          flexDirection: "column",
          // The list is the only scroller — let the card clip, not scroll.
          overflow: "hidden",
          minHeight: 0,
          // Consumed by the mobile media query in BankSelect.css to pin the
          // sheet to a fixed height (ignored on desktop). undefined → CSS dvh
          // fallback when visualViewport isn't available.
          ...(sheetH
            ? { ["--bp-sheet-h" as string]: `${sheetH}px` }
            : {}),
        } as React.CSSProperties}
      >
        <div className="bp-grip" />
        <div className="bp-head">
          <div className="bp-title">Choose a bank</div>
          <button type="button" aria-label="Close" onClick={onClose} className="bp-x">
            <X aria-hidden />
          </button>
        </div>

        <div
          style={{
            margin: "12px 0 10px",
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 14px",
            borderRadius: 999,
            background: "#fff",
            border: "1px solid #D9C9A0",
          }}
        >
          <Search style={{ width: 16, height: 16, color: "var(--ink-mute)" }} aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${base.length} bank${base.length === 1 ? "" : "s"}…`}
            style={{
              flex: 1, minWidth: 0,
              background: "transparent", border: 0, outline: "none",
              fontSize: 14, color: "var(--text-strong)",
            }}
          />
        </div>

        <ul
          role="listbox"
          aria-label="Banks"
          style={{
            // Flex to fill the card's bounded height and be the single
            // scroller. overscroll-behavior:contain stops iOS from chaining
            // the scroll to the body at the list's top/bottom edge.
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            padding: "0 2px 0 0",
            margin: 0,
            listStyle: "none",
            display: "flex", flexDirection: "column", gap: 6,
          }}
        >
          {filtered.map((inst) => {
            const selected = inst.id === selectedId
            return (
              <li key={inst.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => onPick(inst)}
                  className="bp-row"
                >
                  <Avatar institution={inst} size={42} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 15.5, fontWeight: 700,
                        letterSpacing: "-.01em", lineHeight: 1.2,
                        color: "#211E1A",
                      }}
                    >
                      {inst.name}
                    </span>
                    <span
                      style={{
                        display: "block", fontSize: 11, marginTop: 1,
                        color: "#8C8578",
                        letterSpacing: ".08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {inst.country}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
          {filtered.length === 0 && (
            <li
              style={{
                padding: "20px 12px", textAlign: "center",
                color: "var(--ink-mute)", fontSize: 13,
              }}
            >
              No banks match &ldquo;{query}&rdquo;.
            </li>
          )}
        </ul>
      </div>
    </div>,
    container,
  )
}

/** Case-insensitive name lookup so wires that already stored a slightly
 *  different casing (e.g. "chase bank" vs "Chase Bank") still resolve.
 *  Exported for callers that need the logo/domain (e.g. admin lists). */
export function findInstitutionByName(name: string): Institution | null {
  if (!name) return null
  const target = name.trim().toLowerCase()
  if (!target) return null
  return (
    INSTITUTIONS.find((i) => i.name.toLowerCase() === target) ??
    INSTITUTIONS.find((i) => i.name.toLowerCase().includes(target)) ??
    null
  )
}

function monogram(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return (words[0]![0]! + words[1]![0]!).toUpperCase()
}
