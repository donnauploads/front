import { io, type Socket } from "socket.io-client"
import { getAccessToken } from "@/lib/api/token-store"

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE ?? ""

let socket: Socket | null = null

/**
 * Lazily build a singleton socket. The backend gateway authenticates from
 * the handshake (auth.token / Bearer header / access_token cookie) and
 * joins the connection to `user:{userId}` + `session:{sessionId}` rooms.
 *
 * Socket.io re-invokes the `auth` callback on every reconnect attempt —
 * that's how we pick up a fresh access token after the silent refresh
 * loop rotates it.
 */
/**
 * Anonymous GUEST support socket. Logged-out visitors have no access token,
 * so they connect with a signed guest-support token instead — the gateway
 * verifies it and joins them to ONLY their own thread room. This is a
 * SEPARATE connection from the authed singleton (`forceNew`), owned by the
 * guest chat modal which connects on open and disconnects on close.
 */
export function connectGuestSocket(guestToken: string): Socket {
  if (!WS_BASE) {
    throw new Error(
      "NEXT_PUBLIC_WS_BASE is not set. Add it to frontend/.env.local.",
    )
  }
  return io(WS_BASE, {
    auth: { guestToken },
    withCredentials: true,
    forceNew: true,
    transports: ["polling", "websocket"],
    extraHeaders: { "ngrok-skip-browser-warning": "true" },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  })
}

export function getSocket(): Socket {
  if (socket) return socket
  if (!WS_BASE) {
    throw new Error(
      "NEXT_PUBLIC_WS_BASE is not set. Add it to frontend/.env.local.",
    )
  }
  socket = io(WS_BASE, {
    auth: (cb: (data: { token: string | null }) => void) =>
      cb({ token: getAccessToken() }),
    withCredentials: true,
    // Start with polling so Vercel/Cloudflare/some corp proxies don't kill
    // the handshake by stripping the raw WS upgrade header. Socket.io will
    // upgrade to ws as soon as it confirms the path is clean.
    transports: ["polling", "websocket"],
    // Bypass ngrok free's interstitial on the initial polling/upgrade
    // probe. Ignored by every other host.
    extraHeaders: { "ngrok-skip-browser-warning": "true" },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  })
  return socket
}

/**
 * Ensure the singleton socket is connected with the CURRENT access token.
 * Call this the moment the session becomes authenticated.
 *
 * Why it's needed: the socket is a lazy singleton whose `auth` callback
 * reads `getAccessToken()` at handshake time. If a component created the
 * socket BEFORE login set the token (or before the silent refresh), it
 * handshook with `token: null` — the gateway accepts the connection but
 * never joins it to the `user:{id}` room, and because the socket stays
 * "connected" it never reconnects. Result: realtime / token-gated
 * features don't light up until some later navigation happens to force a
 * reconnect. Forcing a re-handshake here re-runs `auth` with the fresh
 * token so those features activate immediately on login.
 */
export function ensureSocketConnected(): Socket {
  const s = getSocket()
  if (s.connected) {
    // Already connected (possibly with a stale/null token) — re-handshake
    // so the auth callback re-reads the current access token.
    s.disconnect().connect()
  } else {
    // Freshly created or mid-connect: just make sure it's dialing. The
    // pending handshake already uses the current token, so no churn.
    s.connect()
  }
  return s
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}

/** Read the current socket without forcing creation. For dev tooling. */
export function peekSocket(): Socket | null {
  return socket
}
