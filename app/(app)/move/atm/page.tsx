"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, MapPin, Navigation, Clock } from "lucide-react"
import { demoAtms, type AtmPin } from "@/lib/fixtures/move"

export default function FindAtmPage() {
  const router = useRouter()
  const [picked, setPicked] = useState<AtmPin>(demoAtms[0])

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
        <h2>Find an ATM</h2>
        <p className="ph-sub">
          60,000+ fee-free Allpoint and MoneyPass ATMs.
        </p>
      </div>

      {/* Map canvas */}
      <div
        style={{
          position: "relative",
          marginTop: 18,
          height: 288,
          overflow: "hidden",
          borderRadius: 16,
          background: "var(--navy)",
          border: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.25,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            height: 3,
            width: "100%",
            transform: "translateY(-50%)",
            background: "rgba(255,255,255,.15)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "33.33%",
            top: 0,
            height: "100%",
            width: 3,
            background: "rgba(255,255,255,.15)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "66.66%",
            top: 0,
            height: "100%",
            width: 2,
            background: "rgba(255,255,255,.10)",
          }}
        />
        {/* you-are-here marker */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%,-50%)",
          }}
        >
          <div style={{ position: "relative", width: 14, height: 14 }}>
            <span
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "var(--gold-deep)",
              }}
            />
            <span
              className="animate-ping"
              style={{
                position: "absolute",
                inset: -8,
                borderRadius: "50%",
                background: "rgba(201,162,74,.4)",
              }}
            />
          </div>
        </div>
        {/* pins */}
        {demoAtms.map((p) => {
          const active = p.id === picked.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPicked(p)}
              aria-label={p.name}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: `translate(-50%,-100%) scale(${active ? 1.1 : 1})`,
                transition: "transform .2s ease",
                background: "transparent",
                border: 0,
                padding: 0,
                cursor: "pointer",
              }}
            >
              <MapPin
                width={28}
                height={28}
                fill="currentColor"
                strokeWidth={1.5}
                aria-hidden
                style={{
                  color: active ? "var(--gold-deep)" : "#fff",
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                }}
              />
            </button>
          )
        })}
      </div>

      {/* Selected pin */}
      <div className="panel" style={{ marginTop: 12 }}>
        <div className="panel-body">
          <div className="set-row" style={{ alignItems: "flex-start" }}>
            <div className="sr-l">
              <div className="sn">{picked.name}</div>
              <div className="sd">{picked.address}</div>
              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 11,
                  color: "var(--ink-mute)",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Navigation width={12} height={12} aria-hidden />
                  {picked.distanceMi} mi
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Clock width={12} height={12} aria-hidden />
                  {picked.open24 ? "Open 24 hours" : "Hours vary"}
                </span>
              </div>
            </div>
            <button type="button" className="li-act gold">
              Directions
            </button>
          </div>
        </div>
      </div>

      <div className="pf-group">Nearby</div>
      <div className="panel">
        <div className="panel-body">
          {demoAtms.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPicked(p)}
              className="set-row"
              style={{
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: 0,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
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
                <MapPin width={16} height={16} />
              </span>
              <div className="sr-l">
                <div className="sn">{p.name}</div>
                <div className="sd">{p.address}</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>
                {p.distanceMi} mi
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
