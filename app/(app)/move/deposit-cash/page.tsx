"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Banknote,
  Building2,
  Loader2,
  Locate,
  Navigation,
  Search,
  ShoppingBag,
} from "lucide-react"
import { motion } from "framer-motion"
import { ApiError } from "@/lib/api/errors"
import {
  geocodePlace,
  nearbyAtms,
  type NearbyAtm,
} from "@/lib/atms/api/atms.real"

type Coords = { lat: number; lon: number }
type LocState =
  | { kind: "idle" }
  | { kind: "asking" }
  | { kind: "denied"; msg: string }
  | { kind: "have"; coords: Coords; label: string }

export default function DepositCashPage() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [loc, setLoc] = useState<LocState>({ kind: "idle" })
  const [results, setResults] = useState<NearbyAtm[] | null>(null)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLoc({
        kind: "denied",
        msg: "This browser doesn't support location.",
      })
      return
    }
    setLoc({ kind: "asking" })
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLoc({
          kind: "have",
          coords: { lat: pos.coords.latitude, lon: pos.coords.longitude },
          label: "Your current location",
        }),
      (err) =>
        setLoc({
          kind: "denied",
          msg: err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Search a place instead."
            : "Couldn't get your location. Search a place instead.",
        }),
      { timeout: 10_000, enableHighAccuracy: false, maximumAge: 60_000 },
    )
  }, [])

  const loadFor = useCallback(async (coords: Coords) => {
    setFetching(true)
    setError(null)
    try {
      const rows = await nearbyAtms(coords.lat, coords.lon, 10)
      setResults(rows)
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.status === 429
            ? "Map service is busy right now. Try again in a moment."
            : e.message
          : "Couldn't load nearby locations. Check your connection and try again."
      setError(msg)
      setResults([])
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (loc.kind === "have") void loadFor(loc.coords)
  }, [loc, loadFor])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !results) return results ?? []
    return results.filter((r) =>
      `${r.name} ${r.address}`.toLowerCase().includes(q),
    )
  }, [results, query])

  async function geocodeAndSearch() {
    const q = query.trim()
    if (!q) return
    setFetching(true)
    setError(null)
    try {
      const hits = await geocodePlace(q, 5)
      const hit = hits[0]
      if (!hit) {
        setError("Couldn't find that place. Try a more specific name or ZIP.")
        setFetching(false)
        return
      }
      const coords = { lat: hit.lat, lon: hit.lon }
      setLoc({ kind: "have", coords, label: shortPlaceName(hit.displayName) })
      await loadFor(coords)
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message || "Couldn't reach the geocoder."
          : "Couldn't reach the geocoder."
      setError(msg)
      setFetching(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => router.back()}
        className="view-back"
        aria-label="Back"
      >
        <ArrowLeft aria-hidden /> Back
      </button>

      <div className="page-head">
        <h2>Deposit cash</h2>
        <p className="ph-sub">
          Hand cash to a cashier at a nearby partner retailer. Funds land in
          minutes.
        </p>
      </div>

      <div className="txn-filters" style={{ marginTop: 18 }}>
        <div className="txn-search">
          <Search aria-hidden />
          <input
            type="text"
            placeholder="Search a city, ZIP, or address…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void geocodeAndSearch()
            }}
            aria-label="Search a place"
          />
          {fetching && (
            <Loader2 className="animate-spin" width={14} height={14} aria-hidden />
          )}
        </div>
      </div>

      {/* Location chip */}
      {loc.kind === "have" && (
        <motion.div
          className="chip loc-chip"
          style={{
            marginTop: 12,
            display: "flex",
            width: "100%",
            alignItems: "center",
            gap: 6,
            background: "var(--gold-soft)",
            color: "var(--ink-soft)",
            border: "1px solid rgba(201,162,74,.25)",
          }}
          animate={{
            boxShadow: [
              "0 0 0px rgba(201,162,74,0.0)",
              "0 0 14px rgba(201,162,74,0.45)",
              "0 0 0px rgba(201,162,74,0.0)",
            ],
            opacity: [0.85, 1, 0.85],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.span
            animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ display: "inline-flex", color: "var(--gold-deep)" }}
            aria-hidden
          >
            <Locate width={14} height={14} />
          </motion.span>
          <span>Showing locations near</span>
          <strong
            style={{
              color: "var(--text-strong)",
              marginLeft: "auto",
              textAlign: "right",
            }}
          >
            {loc.label}
          </strong>
        </motion.div>
      )}
      {loc.kind === "denied" && (
        <div className="card-error" style={{ marginTop: 12 }}>
          {loc.msg}
        </div>
      )}
      {loc.kind === "asking" && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "var(--ink-mute)",
          }}
        >
          <Loader2 className="animate-spin" width={14} height={14} aria-hidden />
          Asking your browser for your location…
        </div>
      )}

      {error && (
        <div className="card-error" role="alert" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <div className="panel" style={{ marginTop: 12 }}>
        <div className="panel-body">
          {fetching && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: 40,
                fontSize: 14,
                color: "var(--ink-mute)",
              }}
            >
              <Loader2 className="animate-spin" width={16} height={16} aria-hidden />
              Finding partner retailers near you…
            </div>
          )}
          {!fetching &&
            filtered.map((s) => {
              const miles = (s.distanceMeters / 1609.34).toFixed(1)
              const KindIcon =
                s.kind === "bank"
                  ? Building2
                  : s.kind === "atm"
                    ? Banknote
                    : ShoppingBag
              return (
                <a
                  key={s.id}
                  href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="set-row"
                  style={{ textDecoration: "none" }}
                >
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "var(--gold-soft)",
                      color: "var(--gold-deep)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginRight: 10,
                    }}
                    aria-hidden
                  >
                    <KindIcon width={16} height={16} />
                  </span>
                  <div className="sr-l" style={{ minWidth: 0 }}>
                    <div
                      className="sn"
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.name}
                      </span>
                      <KindBadge kind={s.kind} />
                    </div>
                    <div
                      className="sd"
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.address}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-strong)",
                      }}
                    >
                      <Navigation width={12} height={12} aria-hidden />
                      {miles} mi
                    </div>
                    <FeeLabel cents={s.feeCentsEstimate} kind={s.kind} />
                  </div>
                </a>
              )
            })}
          {!fetching && filtered.length === 0 && results !== null && (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                fontSize: 14,
                color: "var(--ink-mute)",
              }}
            >
              No partner retailers found nearby. Try a different location.
            </div>
          )}
        </div>
      </div>

      <p
        style={{
          marginTop: 14,
          fontSize: 11,
          color: "var(--ink-mute)",
        }}
      >
        Cash limits: $1,000 per day, $10,000 per month. Fees are estimates per
        chain, the cashier will confirm the actual amount.
      </p>
    </>
  )
}

function KindBadge({ kind }: { kind: "bank" | "atm" | "retail" }) {
  const label = kind === "bank" ? "Branch" : kind === "atm" ? "ATM" : "Retail"
  return (
    <span
      style={{
        borderRadius: 999,
        background: "var(--gold-soft)",
        padding: "2px 6px",
        fontSize: 9,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: ".12em",
        color: "var(--ink-soft)",
        border: "1px solid var(--line)",
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  )
}

function FeeLabel({
  cents,
  kind,
}: {
  cents: number | null
  kind: "bank" | "atm" | "retail"
}) {
  if (cents === 0) {
    return (
      <div
        style={{ fontSize: 10, fontWeight: 700, color: "var(--gold-deep)" }}
        title="Estimate, confirmed at point of sale"
      >
        Free
      </div>
    )
  }
  if (cents != null) {
    return (
      <div
        style={{ fontSize: 10, color: "var(--ink-mute)" }}
        title="Estimate, actual fee confirmed at point of sale"
      >
        Est. fee ${(cents / 100).toFixed(2)}
      </div>
    )
  }
  return (
    <div
      style={{ fontSize: 10, color: "var(--ink-mute)" }}
      title="Fee depends on your bank's policy"
    >
      {kind === "bank" ? "Fee varies" : "Check at counter"}
    </div>
  )
}

function shortPlaceName(displayName: string): string {
  return displayName.split(",").slice(0, 2).join(", ").trim()
}
