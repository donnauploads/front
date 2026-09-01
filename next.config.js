/** @type {import('next').NextConfig} */
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "http://localhost:3001"

const nextConfig = {
  reactStrictMode: true,
  // Allow the dev server to be reached via tunneled / proxied origins (e.g.
  // Cloudflare quick tunnels you spin up while sharing the demo on a phone).
  // No effect in production. Add specific hosts to lock this down if you
  // ever expose the dev server beyond a trusted machine.
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.ngrok.io",
    "*.ngrok-free.app",
    "*.loca.lt",
  ],
  // Reverse-proxy the backend through the Next.js dev server so the browser
  // only ever talks to one origin. This sidesteps:
  //   • mixed-content (HTTPS tunnel → HTTP localhost backend)
  //   • CORS (single-origin = no preflight)
  //   • SameSite cookie loss (refresh cookie stays first-party)
  // Note: WebSocket upgrades are NOT proxied here — the realtime gateway
  // can't reach the browser through the tunnel. Use a second tunnel for
  // ws://localhost:3001 if you need force-logout / live transactions.
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_ORIGIN}/api/v1/:path*`,
      },
      // Health endpoints sit outside the /api/v1 prefix in NestJS.
      {
        source: "/health/:path*",
        destination: `${BACKEND_ORIGIN}/health/:path*`,
      },
      // User-uploaded assets (avatars, KYC docs). Backend serves them
      // via NestExpressApplication.useStaticAssets at /storage/*.
      // Rewriting here keeps them same-origin to the browser so
      // <img src="/storage/...">  works through cloudflare tunnels too.
      {
        source: "/storage/:path*",
        destination: `${BACKEND_ORIGIN}/storage/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
