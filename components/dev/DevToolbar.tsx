"use client"

import { useEffect, useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  Network,
  PlugZap,
  RefreshCw,
  Unplug,
} from "lucide-react"
import { useStore } from "@/lib/store"
import {
  readUseMocksLive,
  readUseMocksOverrideRaw,
  setUseMocksOverride,
} from "@/lib/dev/use-mocks-flag"
import {
  clearAccessToken,
  getAccessToken,
} from "@/lib/api/token-store"
import { disconnectSocket, getSocket, peekSocket } from "@/lib/realtime/socket"
import { cn } from "@/lib/utils"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? ""
const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE ?? ""

/**
 * Floating dev affordance — never renders in production. Surfaces the
 * mocks/real switch, session status, and a few WS/API levers that are
 * tedious to reach otherwise. State changes that need a fresh module
 * graph (toggling mocks) reload the page.
 */
export function DevToolbar() {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [useMocksLive, setUseMocksLive] = useState(true)
  const [override, setOverride] = useState<"true" | "false" | null>(null)
  const [socketState, setSocketState] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected")

  const sessionStatus = useStore((s) => s.session.status)
  const user = useStore((s) => s.session.user)

  useEffect(() => {
    setMounted(true)
    setUseMocksLive(readUseMocksLive())
    setOverride(readUseMocksOverrideRaw())
  }, [])

  // Best-effort socket-state probe. We don't subscribe — just sample on
  // open and on every tick while open.
  useEffect(() => {
    if (!mounted || !open) return
    const tick = () => {
      const s = peekSocket()
      if (!s) {
        setSocketState("disconnected")
        return
      }
      if (s.connected) setSocketState("connected")
      else if (s.active) setSocketState("connecting")
      else setSocketState("disconnected")
    }
    tick()
    const i = setInterval(tick, 1500)
    return () => clearInterval(i)
  }, [mounted, open])

  if (!mounted) return null
  if (process.env.NODE_ENV === "production") return null

  function toggleMocks() {
    const next = !useMocksLive
    setUseMocksOverride(next)
    window.location.reload()
  }

  function resetOverride() {
    setUseMocksOverride(null)
    window.location.reload()
  }

  async function forceRefresh() {
    try {
      const r = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      })
      if (!r.ok) {
        // eslint-disable-next-line no-console
        console.warn("[dev] refresh returned", r.status)
        return
      }
      const data = (await r.json()) as {
        accessToken: string
      }
      // eslint-disable-next-line no-console
      console.info("[dev] refreshed access token")
      // Use the runtime setter from token-store without importing it
      // (avoid circular UI ↔ flow):
      const { setAccessToken } = await import("@/lib/api/token-store")
      setAccessToken(data.accessToken, 15 * 60)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[dev] refresh failed", e)
    }
  }

  function disconnectWs() {
    disconnectSocket()
    setSocketState("disconnected")
  }

  function reconnectWs() {
    const sock = getSocket()
    if (!sock.connected) sock.connect()
    setSocketState("connecting")
  }

  function dropAccessToken() {
    clearAccessToken()
    // eslint-disable-next-line no-console
    console.info("[dev] in-memory access token cleared")
  }

  const tokenPresent = getAccessToken() !== null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2 font-mono text-[11px]">
      {open && (
        <div className="pointer-events-auto w-[300px] rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-white shadow-2xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-slate-400">
              Dev toolbar
            </span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                process.env.NODE_ENV === "development"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-slate-700 text-slate-300",
              )}
            >
              {process.env.NODE_ENV}
            </span>
          </div>

          <Row
            label="Mocks"
            value={
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                    useMocksLive
                      ? "bg-amber-500/30 text-amber-200"
                      : "bg-emerald-500/30 text-emerald-200",
                  )}
                >
                  {useMocksLive ? "ON" : "OFF"}
                </span>
                {override !== null && (
                  <span className="text-[9px] text-slate-400">override</span>
                )}
              </span>
            }
          />
          <div className="mb-2 mt-1 flex gap-1.5">
            <DevBtn onClick={toggleMocks}>
              Toggle ({useMocksLive ? "→ real" : "→ mocks"})
            </DevBtn>
            {override !== null && (
              <DevBtn onClick={resetOverride}>Use env</DevBtn>
            )}
          </div>

          <div className="my-2 h-px bg-slate-700" />

          <Row label="Session" value={sessionStatus} />
          {user && (
            <>
              <Row label="User" value={user.email} />
              <Row
                label="Role"
                value={
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                      user.role === "superadmin"
                        ? "bg-violet-500/30 text-violet-200"
                        : user.role === "admin"
                          ? "bg-slate-500/30 text-slate-200"
                          : "bg-emerald-500/30 text-emerald-200",
                    )}
                  >
                    {user.role}
                  </span>
                }
              />
            </>
          )}
          <Row
            label="Access token"
            value={tokenPresent ? "present" : ""}
          />

          <div className="my-2 h-px bg-slate-700" />

          <Row label="API" value={API_BASE || "(unset)"} />
          <Row label="WS" value={WS_BASE || "(unset)"} />
          <Row label="Socket" value={socketState} />

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <DevBtn onClick={forceRefresh}>
              <RefreshCw className="h-3 w-3" /> Refresh token
            </DevBtn>
            <DevBtn onClick={dropAccessToken}>
              <Cpu className="h-3 w-3" /> Drop token
            </DevBtn>
            <DevBtn onClick={reconnectWs}>
              <PlugZap className="h-3 w-3" /> WS connect
            </DevBtn>
            <DevBtn onClick={disconnectWs}>
              <Unplug className="h-3 w-3" /> WS disconnect
            </DevBtn>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto flex h-9 items-center gap-2 rounded-full bg-slate-900/95 px-3 text-white shadow-lg ring-1 ring-slate-700 hover:bg-slate-800"
        aria-label="Toggle dev toolbar"
      >
        <Network className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wider">
          {useMocksLive ? "mocks" : "real"}
        </span>
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronUp className="h-3 w-3" />
        )}
      </button>
    </div>
  )
}

function Row({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-slate-400">{label}</span>
      <span className="truncate text-slate-100">{value}</span>
    </div>
  )
}

function DevBtn({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1 rounded-md bg-slate-700/60 px-2 py-1 text-[10px] font-semibold text-slate-100 hover:bg-slate-700"
    >
      {children}
    </button>
  )
}
