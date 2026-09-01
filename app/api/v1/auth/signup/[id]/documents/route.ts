import { NextRequest } from "next/server"

/**
 * Streaming proxy for the signup document upload.
 *
 * Why this exists:
 *   • Next.js dev's generic rewrites buffer the request body and trip a
 *     413 on multipart payloads > ~1 MB — the dev server is the bottleneck,
 *     not the backend (multer caps at 25 MB).
 *   • POSTing directly to `http://localhost:3001` from `localhost:3000` is
 *     cross-origin → CORS preflight → DevTools "Provisional headers are
 *     shown" warning and the occasional flaky failure on slow networks.
 *
 * A Route Handler reads `request.body` as a Web ReadableStream and pipes
 * it straight to the backend with `duplex: "half"`. Same origin to the
 * browser; no buffering on our side.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// Streamed bodies — never buffer the whole thing into memory.
export const fetchCache = "force-no-store"
// Default 30s App Router timeout is fine for ID uploads (small images).
export const maxDuration = 60

const BACKEND_ORIGIN =
  process.env.BACKEND_ORIGIN || "http://localhost:3001"

// Headers that node-fetch / undici manages itself when given a stream
// body — passing them through would either double-set or break framing.
const STRIP_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "accept-encoding",
])

// Likewise for the response — let the runtime negotiate these afresh.
const STRIP_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "transfer-encoding",
  "connection",
])

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } },
) {
  const upstreamUrl = `${BACKEND_ORIGIN}/api/v1/auth/signup/${encodeURIComponent(
    ctx.params.id,
  )}/documents`

  const forwardHeaders = new Headers()
  req.headers.forEach((value, key) => {
    if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) {
      forwardHeaders.set(key, value)
    }
  })

  const upstream = await fetch(upstreamUrl, {
    method: "POST",
    headers: forwardHeaders,
    body: req.body,
    // `duplex: "half"` is required by the WHATWG fetch spec when sending
    // a streaming body. TS types lag behind, so we cast.
    duplex: "half",
    // The backend cookie is httpOnly + Lax — preserved automatically
    // because this fetch is server-to-server (same machine, no SameSite
    // boundary). `credentials` is meaningless server-side.
  } as RequestInit & { duplex: "half" })

  const responseHeaders = new Headers()
  upstream.headers.forEach((value, key) => {
    if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value)
    }
  })

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}
